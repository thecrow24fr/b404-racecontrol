"""B404-Timing — Service Timing indépendant (API Live + Best Laps persistés).

Architecture validée David 14/08/2026 :
  - Source : API native rF2 (REST Amdatu), lecture seule, S8 uniquement.
  - Thread daemon « timing-poll » : poll ~5 s → snapshot LIVE en mémoire
    + UPSERT Best Laps dans data/timing.db (persistance).
  - API HTTP (127.0.0.1:3003) :
      GET /api/health        → état du service
      GET /api/live          → données temps réel (?instance=serveur-8)
      GET /api/best-laps     → records persistés (?instance=&session=&track=&ai=)

PHASE P1 — structure du service (création des fichiers, aucun démarrage).
Aucune modification de l'existant (Manager, MergeEngine, r2la, configs rF2).
"""
import json
import logging
import threading
import time
import urllib.error
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from logging.handlers import RotatingFileHandler
from urllib.parse import urlparse, parse_qs

import config
from storage import TimingStorage

# ─── Logger ─────────────────────────────────────────────────
config.LOG_DIR.mkdir(parents=True, exist_ok=True)
logger = logging.getLogger("b404-timing")
logger.setLevel(logging.INFO)
_fh = RotatingFileHandler(config.LOG_DIR / "b404-timing.log",
                          maxBytes=5 * 1024 * 1024, backupCount=3)
_fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
logger.addHandler(_fh)
_ch = logging.StreamHandler()
_ch.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
logger.addHandler(_ch)


# ─── Service Timing (thread de capture) ─────────────────────

class TimingService:
    """Poll l'API native rF2 des serveurs suivis et alimente le snapshot + la base."""

    def __init__(self, storage: TimingStorage, interval: float = config.POLL_INTERVAL_S):
        self._storage = storage
        self._interval = interval
        self._stop = threading.Event()
        self._thread = None
        self._lock = threading.Lock()
        self._snapshots = {}   # instance_id -> dict (live)

    # ── Cycle de vie ──
    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, name="timing-poll", daemon=True)
        self._thread.start()
        logger.info("B404-Timing démarré (intervalle=%ss, serveurs=%s)",
                    self._interval, list(config.SERVERS))

    def stop(self):
        self._stop.set()

    def _run(self):
        while not self._stop.is_set():
            try:
                self._tick()
            except Exception as e:
                logger.warning("Erreur inattendue dans la boucle: %s", e)
            self._stop.wait(self._interval)

    def _tick(self):
        for num, port in config.SERVERS.items():
            try:
                self._poll_server(num, port)
            except Exception as e:
                logger.warning("[S%d] Erreur de poll: %s", num, e)

    # ── Poll d'un serveur ──
    def _poll_server(self, server_number: int, api_port: int):
        session = self._get_json(api_port, "/rest/watch/sessionInfo")
        standings = self._get_json(api_port, "/rest/watch/standings")
        instance_id = f"serveur-{server_number}"
        captured_at = time.time()

        if session is None or standings is None:
            # API muette / erreur transitoire -> snapshot hors ligne
            with self._lock:
                self._snapshots[instance_id] = {
                    "instance_id": instance_id,
                    "online": False,
                    "captured_at": captured_at,
                    "session": None,
                    "standings": [],
                }
            return

        session_type = str(session.get("session") or "PRACTICE")
        track = str(session.get("trackName") or "")

        # Session normalisée (contrat API /api/live — validé 14/08 : sessionType)
        norm_session = {
            "trackName": track,
            "sessionType": session_type,
            "currentEventTime": session.get("currentEventTime"),
            "endEventTime": session.get("endEventTime"),
            "numVehicles": session.get("numVehicles") or len(standings),
            "ambientTemp": session.get("ambientTemp"),
            "trackTemp": session.get("trackTemp"),
            "raining": session.get("raining"),
            "darkCloud": session.get("darkCloud"),
            "windSpeed": session.get("windSpeed"),
            "yellowFlag": session.get("yellowFlag"),
        }

        # Enrichir chaque entrée avec is_ai, puis persister les meilleurs temps
        entries = []
        for e in standings:
            if not isinstance(e, dict):
                continue
            sid = str(e.get("steamID") or "")
            is_ai = 0
            if sid.isdigit() and int(sid) >= config.AI_STEAMID_THRESHOLD:
                is_ai = 1
            e["is_ai"] = is_ai
            entries.append(e)
            self._maybe_upsert(server_number, session_type, track, e)

        with self._lock:
            self._snapshots[instance_id] = {
                "instance_id": instance_id,
                "online": True,
                "captured_at": captured_at,
                "session": norm_session,
                "standings": entries,
            }

    def _maybe_upsert(self, server_number: int, session_type: str,
                      track: str, entry: dict):
        steam_id = str(entry.get("steamID") or "")
        best = float(entry.get("bestLapTime") or -1)
        if not steam_id or best <= 0:
            return  # pas de tour bouclé / pas d'identité
        s1 = float(entry.get("bestSectorTime1") or -1)
        s2 = float(entry.get("bestSectorTime2") or -1)
        # is_ai auto-suffisant (source unique = seuil config) — robustesse :
        # ne dépend pas de l'enrichissement fait dans _poll_server.
        is_ai = 1 if steam_id.isdigit() and int(steam_id) >= config.AI_STEAMID_THRESHOLD else 0
        try:
            result = self._storage.upsert_best_lap({
                "steam_id": steam_id,
                "driver_name": str(entry.get("driverName") or ""),
                "vehicle_name": str(entry.get("vehicleName") or ""),
                "server_number": server_number,
                "session_type": session_type,
                "track": track,
                "best_lap_ms": round(best * 1000),
                "sector1_ms": round(s1 * 1000) if s1 > 0 else None,
                "sector2_ms": round(s2 * 1000) if s2 > 0 else None,
                "is_ai": is_ai,
            })
            if result["action"] != "ignored":
                logger.info("[S%d] %s %s -> %d ms (%s)",
                            server_number, entry.get("driverName"),
                            result["action"], result["best_lap_ms"],
                            session_type)
        except Exception as e:
            logger.warning("[S%d] Upsert échoué (%s): %s", server_number,
                           steam_id, e)

    def _get_json(self, api_port: int, path: str):
        url = f"http://127.0.0.1:{api_port}{path}"
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=config.HTTP_TIMEOUT_S) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, OSError,
                json.JSONDecodeError):
            return None  # API muette / erreur transitoire -> skip

    # ── Accès pour l'API HTTP ──
    def get_snapshot(self, instance_id: str):
        with self._lock:
            return self._snapshots.get(instance_id)


# ─── Serveur HTTP ───────────────────────────────────────────

def _normalize_instance(instance_id: str) -> str:
    """Accepte 'serveur-8' ou '8' → 'serveur-8' (format RaceControl)."""
    i = instance_id.strip()
    if i.isdigit():
        return f"serveur-{i}"
    return i


class TimingHandler(BaseHTTPRequestHandler):
    service: TimingService = None
    storage: TimingStorage = None

    def _json(self, data, status=200):
        body = json.dumps(data, default=str, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json({"ok": True})

    def do_GET(self):
        parsed = urlparse(f"http://localhost{self.path}")
        path = parsed.path.rstrip("/")
        params = parse_qs(parsed.query)
        try:
            if path == "/api/health":
                online = []
                for num, port in config.SERVERS.items():
                    snap = self.service.get_snapshot(f"serveur-{num}")
                    online.append({
                        "server_number": num,
                        "api_port": port,
                        "online": bool(snap and snap.get("online")),
                        "last_poll_at": snap.get("captured_at") if snap else None,
                    })
                self._json({
                    "service": "b404-timing",
                    "version": config.VERSION,
                    "status": "ok",
                    "servers": online,
                    "best_laps_count": self.storage.count_best_laps(),
                })

            elif path == "/api/live":
                instance = _normalize_instance(params.get("instance", [""])[0])
                if not instance:
                    self._json({"success": False,
                                "error": "Paramètre 'instance' requis"}, 400)
                    return
                snap = self.service.get_snapshot(instance)
                if not snap or not snap.get("online"):
                    self._json({"success": False, "instance_id": instance,
                                "error": "Aucune donnée (serveur hors ligne ou pas encore interrogé)"}, 503)
                    return
                self._json({
                    "success": True,
                    "instance_id": instance,
                    "captured_at": snap["captured_at"],
                    "session": snap["session"],
                    "standings": snap["standings"],
                })

            elif path == "/api/best-laps":
                instance = _normalize_instance(params.get("instance", [""])[0])
                if not instance:
                    self._json({"success": False,
                                "error": "Paramètre 'instance' requis"}, 400)
                    return
                num = instance.replace("serveur-", "")
                if not num.isdigit() or int(num) not in config.SERVERS:
                    self._json({"success": False, "instance_id": instance,
                                "error": "Serveur non suivi par B404-Timing"}, 404)
                    return
                ai = params.get("ai", [None])[0]
                limit = int(params.get("limit", ["200"])[0])
                laps = self.storage.get_best_laps(
                    server_number=int(num),
                    session_type=params.get("session", [None])[0],
                    track=params.get("track", [None])[0],
                    ai=(ai.lower() in ("1", "true") if ai else None),
                    limit=limit,
                )
                self._json({"success": True, "instance_id": instance,
                            "best_laps": laps})

            else:
                self._json({
                    "error": "Not Found",
                    "available": ["/api/health", "/api/live?instance=serveur-8",
                                  "/api/best-laps?instance=serveur-8"],
                }, 404)
        except Exception as e:
            logger.exception("Erreur sur %s", path)
            self._json({"success": False, "error": str(e)}, 500)

    def log_message(self, fmt, *args):
        logger.info("%s - %s", self.client_address[0], fmt % args)


# ─── Point d'entrée ─────────────────────────────────────────

if __name__ == "__main__":
    storage = TimingStorage(config.DB_PATH)
    service = TimingService(storage)
    TimingHandler.service = service
    TimingHandler.storage = storage
    server = HTTPServer((config.HOST, config.PORT), TimingHandler)
    service.start()
    logger.info("=" * 60)
    logger.info("B404-Timing v%s — API sur %s:%s (serveurs suivis: %s)",
                config.VERSION, config.HOST, config.PORT, list(config.SERVERS))
    logger.info("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Arrêt de B404-Timing")
        service.stop()
        server.server_close()
