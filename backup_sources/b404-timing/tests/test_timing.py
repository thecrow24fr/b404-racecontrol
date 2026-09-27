"""Tests automatisés Phase P2 — B404-Timing (GO David 14/08/2026).

Couvre : UPSERT min(), conservation du meilleur temps, doublons SteamID,
clé serveur/session/circuit, filtres IA, persistance SQLite, lecture,
capture (via _maybe_upsert/_poll_server mockés — AUCUN contact réseau),
format des réponses API (serveur HTTP éphémère sur port aléatoire — PAS :3003,
PAS le service B404-Timing, PAS de thread de capture).

Exécution : python tests/test_timing.py  (depuis D:\\B404\\Apps\\B404-Timing)
"""
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import TimingStorage          # noqa: E402
from main import TimingService, TimingHandler, _normalize_instance  # noqa: E402


def entry(steam="76561198032376013", num=8, sess="PRACTICE", track="Paul Ricard  HTTT",
          ms=136873, s1=52400, s2=44800, ai=0, name="David Depoorter",
          veh="Aston Martin Vantage GT3 #37"):
    return {
        "steam_id": steam, "driver_name": name, "vehicle_name": veh,
        "server_number": num, "session_type": sess, "track": track,
        "best_lap_ms": ms, "sector1_ms": s1, "sector2_ms": s2, "is_ai": ai,
    }


class TempDBMixin:
    def setUp(self):
        self._tmp = tempfile.mkdtemp(prefix="b404-timing-test-")
        self.db_path = os.path.join(self._tmp, "timing.db")

    def tearDown(self):
        shutil.rmtree(self._tmp, ignore_errors=True)


class TestStorage(TempDBMixin, unittest.TestCase):
    """storage.py — UPSERT min(), doublons, clés, filtres, persistance."""

    def setUp(self):
        super().setUp()
        self.storage = TimingStorage(self.db_path)

    # 1. Premier import → insert
    def test_first_insert(self):
        r = self.storage.upsert_best_lap(entry())
        self.assertEqual(r["action"], "insert")
        self.assertEqual(r["best_lap_ms"], 136873)
        self.assertEqual(self.storage.count_best_laps(), 1)

    # 2. Temps plus lent → ignored (jamais de régression)
    def test_slower_ignored(self):
        self.storage.upsert_best_lap(entry(ms=136873))
        r = self.storage.upsert_best_lap(entry(ms=140000, s1=53000, s2=45000))
        self.assertEqual(r["action"], "ignored")
        laps = self.storage.get_best_laps()
        self.assertEqual(laps[0]["best_lap_ms"], 136873)
        self.assertEqual(laps[0]["sector1_ms"], 52400)   # secteurs inchangés
        self.assertEqual(laps[0]["sector2_ms"], 44800)

    # 3. Temps plus rapide → update + secteurs du NOUVEAU meilleur tour
    def test_faster_updates(self):
        self.storage.upsert_best_lap(entry(ms=136873, s1=52400, s2=44800))
        r = self.storage.upsert_best_lap(entry(ms=135000, s1=51500, s2=44500))
        self.assertEqual(r["action"], "update")
        laps = self.storage.get_best_laps()
        self.assertEqual(laps[0]["best_lap_ms"], 135000)
        self.assertEqual(laps[0]["sector1_ms"], 51500)
        self.assertEqual(laps[0]["sector2_ms"], 44500)

    # 4. Doublons SteamID → toujours 1 seule ligne
    def test_no_duplicate(self):
        self.storage.upsert_best_lap(entry(ms=136873))
        self.storage.upsert_best_lap(entry(ms=136873))
        self.storage.upsert_best_lap(entry(ms=136873))
        self.assertEqual(self.storage.count_best_laps(), 1)

    # 5. Clé composée — serveur différent → ligne indépendante
    def test_key_server(self):
        self.storage.upsert_best_lap(entry(num=8))
        self.storage.upsert_best_lap(entry(num=3))
        self.assertEqual(self.storage.count_best_laps(), 2)
        self.assertEqual(len(self.storage.get_best_laps(server_number=8)), 1)
        self.assertEqual(len(self.storage.get_best_laps(server_number=3)), 1)

    # 6. Clé composée — session différente
    def test_key_session(self):
        self.storage.upsert_best_lap(entry(sess="PRACTICE"))
        self.storage.upsert_best_lap(entry(sess="QUALIFY", ms=132000))
        self.assertEqual(self.storage.count_best_laps(), 2)

    # 7. Clé composée — circuit différent
    def test_key_track(self):
        self.storage.upsert_best_lap(entry(track="Paul Ricard  HTTT"))
        self.storage.upsert_best_lap(entry(track="Spa", ms=125000))
        self.assertEqual(self.storage.count_best_laps(), 2)

    # 8. Filtres IA + tri ASC
    def test_ai_filter_and_sort(self):
        self.storage.upsert_best_lap(entry(steam="90071996842377216", ai=1, ms=128681))
        self.storage.upsert_best_lap(entry(steam="90071996842377220", ai=1, ms=129000))
        self.storage.upsert_best_lap(entry(steam="76561198032376013", ai=0, ms=136873))
        self.assertEqual(self.storage.count_best_laps(), 3)
        humains = self.storage.get_best_laps(ai=0)
        ia = self.storage.get_best_laps(ai=1)
        self.assertEqual(len(humains), 1)
        self.assertEqual(len(ia), 2)
        self.assertEqual(ia[0]["best_lap_ms"], 128681)   # tri ASC

    # 9. Persistance : nouvelle connexion → données toujours là
    def test_persistence_across_connections(self):
        self.storage.upsert_best_lap(entry(ms=136873))
        db = self.storage._db_path
        s2 = TimingStorage(db)
        self.assertEqual(s2.count_best_laps(), 1)
        self.assertEqual(s2.get_best_laps()[0]["best_lap_ms"], 136873)

    # 10. Lecture : filtres session/track + tri
    def test_filters_and_sort(self):
        self.storage.upsert_best_lap(entry(steam="76561198032376013", ms=136873))
        self.storage.upsert_best_lap(entry(steam="76561199539785974", ms=132500,
                                           name="Christophe Deruwez"))
        laps = self.storage.get_best_laps(session_type="PRACTICE",
                                          track="Paul Ricard  HTTT")
        self.assertEqual(len(laps), 2)
        self.assertEqual(laps[0]["best_lap_ms"], 132500)  # ASC
        self.assertEqual(self.storage.get_best_laps(session_type="QUALIFY"), [])

    # 11. Colonnes du record (contrat API best-laps)
    def test_record_columns(self):
        self.storage.upsert_best_lap(entry())
        rec = self.storage.get_best_laps()[0]
        for col in ["steam_id", "driver_name", "vehicle_name", "server_number",
                    "session_type", "track", "best_lap_ms", "sector1_ms",
                    "sector2_ms", "is_ai", "first_seen_at", "updated_at"]:
            self.assertIn(col, rec, f"colonne manquante: {col}")
        self.assertEqual(rec["steam_id"], "76561198032376013")
        self.assertEqual(rec["best_lap_ms"], 136873)


class TestServiceCapture(TempDBMixin, unittest.TestCase):
    """main.py — capture via _maybe_upsert/_poll_server mockés (0 réseau)."""

    def setUp(self):
        super().setUp()
        self.storage = TimingStorage(self.db_path)
        self.service = TimingService(self.storage, interval=999)  # thread JAMAIS démarré

    # 12. bestLapTime <= 0 → non capturé
    def test_bestlap_zero_ignored(self):
        self.service._maybe_upsert(8, "PRACTICE", "Paul Ricard  HTTT",
                                   {"steamID": "76561198032376013",
                                    "driverName": "David", "bestLapTime": -1.0})
        self.assertEqual(self.storage.count_best_laps(), 0)

    # 13. steamID vide → non capturé
    def test_no_steamid_ignored(self):
        self.service._maybe_upsert(8, "PRACTICE", "T",
                                   {"driverName": "X", "bestLapTime": 120.0})
        self.assertEqual(self.storage.count_best_laps(), 0)

    # 14. Capture OK : ms + secteurs + humain
    def test_capture_ok(self):
        self.service._maybe_upsert(
            8, "PRACTICE", "Paul Ricard  HTTT",
            {"steamID": "76561198032376013", "driverName": "David",
             "vehicleName": "Aston Martin Vantage GT3 #37",
             "bestLapTime": 136.873, "bestSectorTime1": 52.4, "bestSectorTime2": 44.8})
        laps = self.storage.get_best_laps()
        self.assertEqual(len(laps), 1)
        self.assertEqual(laps[0]["best_lap_ms"], 136873)
        self.assertEqual(laps[0]["sector1_ms"], 52400)
        self.assertEqual(laps[0]["sector2_ms"], 44800)
        self.assertEqual(laps[0]["is_ai"], 0)

    # 15. IA détectée par le seuil
    def test_ai_flag_set(self):
        self.service._maybe_upsert(8, "PRACTICE", "T",
                                   {"steamID": "90071996842377216",
                                    "driverName": "IA", "bestLapTime": 128.6})
        laps = self.storage.get_best_laps()
        self.assertEqual(laps[0]["is_ai"], 1)

    # 16. _poll_server complet (mock _get_json — AUCUN contact réseau)
    def test_poll_server_snapshot(self):
        self.service._get_json = lambda port, path: (
            {"trackName": "Paul Ricard  HTTT", "session": "PRACTICE",
             "numVehicles": 6} if "sessionInfo" in path
            else [{"slotID": 5, "driverName": "David Depoorter",
                   "steamID": "76561198032376013", "bestLapTime": 136.873}])
        self.service._poll_server(8, 5397)
        snap = self.service.get_snapshot("serveur-8")
        self.assertTrue(snap["online"])
        self.assertEqual(snap["session"]["sessionType"], "PRACTICE")
        self.assertEqual(snap["standings"][0]["is_ai"], 0)
        self.assertEqual(self.storage.count_best_laps(), 1)

    # 17. _poll_server hors ligne → snapshot online=False
    def test_poll_server_offline(self):
        self.service._get_json = lambda port, path: None
        self.service._poll_server(8, 5397)
        snap = self.service.get_snapshot("serveur-8")
        self.assertFalse(snap["online"])

    # 18. Normalisation instance
    def test_normalize_instance(self):
        self.assertEqual(_normalize_instance("8"), "serveur-8")
        self.assertEqual(_normalize_instance("serveur-8"), "serveur-8")
        self.assertEqual(_normalize_instance("serveur-3"), "serveur-3")


class TestApiHttp(TempDBMixin, unittest.TestCase):
    """Format des réponses API — serveur HTTP éphémère (port aléatoire, PAS :3003),
    thread de capture JAMAIS démarré, données factices."""

    def setUp(self):
        super().setUp()
        self.storage = TimingStorage(self.db_path)
        self.service = TimingService(self.storage, interval=999)
        with self.service._lock:
            self.service._snapshots["serveur-8"] = {
                "instance_id": "serveur-8", "online": True,
                "captured_at": time.time(),
                "session": {"trackName": "Paul Ricard  HTTT", "sessionType": "PRACTICE",
                            "numVehicles": 6},
                "standings": [{"slotID": 5, "driverName": "David Depoorter",
                               "steamID": "76561198032376013",
                               "vehicleName": "Aston Martin Vantage GT3 #37",
                               "position": 6, "bestLapTime": 136.873, "is_ai": 0}],
            }
        TimingHandler.service = self.service
        TimingHandler.storage = self.storage
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), TimingHandler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        super().tearDown()

    def _get(self, path):
        return urllib.request.urlopen(
            f"http://127.0.0.1:{self.port}{path}", timeout=5)

    # 19. /api/health
    def test_health(self):
        data = json.load(self._get("/api/health"))
        self.assertEqual(data["service"], "b404-timing")
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["servers"][0]["server_number"], 8)
        self.assertEqual(data["servers"][0]["api_port"], 5397)
        self.assertEqual(data["best_laps_count"], 0)

    # 20. /api/live (instance complète)
    def test_live(self):
        data = json.load(self._get("/api/live?instance=serveur-8"))
        self.assertTrue(data["success"])
        self.assertEqual(data["instance_id"], "serveur-8")
        self.assertEqual(data["session"]["sessionType"], "PRACTICE")
        self.assertEqual(data["standings"][0]["steamID"], "76561198032376013")
        self.assertEqual(data["standings"][0]["bestLapTime"], 136.873)

    # 21. /api/live (instance courte "8" normalisée)
    def test_live_short_id(self):
        data = json.load(self._get("/api/live?instance=8"))
        self.assertEqual(data["instance_id"], "serveur-8")

    # 22. /api/live sans instance → 400
    def test_live_missing_instance(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._get("/api/live")
        self.assertEqual(ctx.exception.code, 400)

    # 23. /api/best-laps serveur non suivi → 404
    def test_best_laps_unknown_server(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._get("/api/best-laps?instance=serveur-3")
        self.assertEqual(ctx.exception.code, 404)

    # 24. /api/best-laps sans instance → 400
    def test_best_laps_missing_instance(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._get("/api/best-laps")
        self.assertEqual(ctx.exception.code, 400)

    # 25. /api/best-laps vide puis alimenté
    def test_best_laps_flow(self):
        data = json.load(self._get("/api/best-laps?instance=serveur-8"))
        self.assertTrue(data["success"])
        self.assertEqual(data["best_laps"], [])
        self.storage.upsert_best_lap(entry())
        data = json.load(self._get("/api/best-laps?instance=serveur-8"))
        self.assertEqual(len(data["best_laps"]), 1)
        rec = data["best_laps"][0]
        self.assertEqual(rec["steam_id"], "76561198032376013")
        self.assertEqual(rec["best_lap_ms"], 136873)
        self.assertEqual(rec["session_type"], "PRACTICE")
        self.assertEqual(rec["server_number"], 8)

    # 26. 404 inconnu
    def test_not_found(self):
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._get("/api/inconnu")
        self.assertEqual(ctx.exception.code, 404)


if __name__ == "__main__":
    unittest.main(verbosity=2)
