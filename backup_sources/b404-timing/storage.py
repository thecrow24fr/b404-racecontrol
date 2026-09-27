"""Accès SQLite du service B404-Timing.

Table best_laps : records persistés (1 ligne par (steam_id, server_number,
session_type, track)) avec UPSERT min() — un temps plus lent ne peut jamais
écraser un meilleur (GO David 14/08/2026).
"""
import sqlite3
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS best_laps (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id      TEXT    NOT NULL,
    driver_name   TEXT    NOT NULL DEFAULT '',
    vehicle_name  TEXT    NOT NULL DEFAULT '',
    server_number INTEGER NOT NULL,
    session_type  TEXT    NOT NULL DEFAULT 'PRACTICE',
    track         TEXT    NOT NULL DEFAULT '',
    best_lap_ms   INTEGER NOT NULL,
    sector1_ms    INTEGER,
    sector2_ms    INTEGER,
    is_ai         INTEGER NOT NULL DEFAULT 0,
    first_seen_at REAL    NOT NULL,
    updated_at    REAL    NOT NULL,
    UNIQUE (steam_id, server_number, session_type, track)
);
CREATE INDEX IF NOT EXISTS idx_best_laps_server
    ON best_laps (server_number, session_type);
CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


class TimingStorage:
    """Stockage des meilleurs temps persistés (records, pas d'historique en P1)."""

    def __init__(self, db_path):
        self._db_path = str(db_path)
        Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self):
        conn = sqlite3.connect(self._db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        with self._connect() as conn:
            conn.executescript(SCHEMA)
            conn.execute(
                "INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1')"
            )

    # ─── Écriture ──────────────────────────────────────────

    def upsert_best_lap(self, entry: dict) -> dict:
        """UPSERT min() : insère ou met à jour le meilleur temps.

        entry attendus : steam_id, driver_name, vehicle_name, server_number,
        session_type, track, best_lap_ms, sector1_ms, sector2_ms, is_ai.
        Retourne {"action": "insert"|"update"|"ignored", "best_lap_ms": ...}.
        """
        now = time.time()
        with self._connect() as conn:
            row = conn.execute(
                "SELECT best_lap_ms FROM best_laps "
                "WHERE steam_id=? AND server_number=? AND session_type=? AND track=?",
                (entry["steam_id"], entry["server_number"],
                 entry["session_type"], entry["track"]),
            ).fetchone()

            if row is not None and entry["best_lap_ms"] >= row["best_lap_ms"]:
                # Temps non meilleur -> ignorer (jamais de régression)
                return {"action": "ignored", "best_lap_ms": row["best_lap_ms"]}

            conn.execute(
                """
                INSERT INTO best_laps
                  (steam_id, driver_name, vehicle_name, server_number, session_type,
                   track, best_lap_ms, sector1_ms, sector2_ms, is_ai,
                   first_seen_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT (steam_id, server_number, session_type, track) DO UPDATE SET
                  best_lap_ms  = MIN(best_lap_ms, excluded.best_lap_ms),
                  sector1_ms   = CASE WHEN excluded.best_lap_ms < best_lap_ms
                                      THEN excluded.sector1_ms ELSE sector1_ms END,
                  sector2_ms   = CASE WHEN excluded.best_lap_ms < best_lap_ms
                                      THEN excluded.sector2_ms ELSE sector2_ms END,
                  driver_name  = excluded.driver_name,
                  vehicle_name = excluded.vehicle_name,
                  updated_at   = excluded.updated_at
                """,
                (
                    entry["steam_id"], entry["driver_name"], entry["vehicle_name"],
                    entry["server_number"], entry["session_type"], entry["track"],
                    entry["best_lap_ms"], entry["sector1_ms"], entry["sector2_ms"],
                    entry["is_ai"], now, now,
                ),
            )
            action = "insert" if row is None else "update"
            return {"action": action, "best_lap_ms": entry["best_lap_ms"]}

    # ─── Lecture ───────────────────────────────────────────

    def get_best_laps(self, server_number=None, session_type=None,
                      track=None, ai=None, limit=200):
        """Records persistés, triés du meilleur au plus lent (best_lap_ms ASC)."""
        q = "SELECT * FROM best_laps WHERE 1=1"
        args = []
        if server_number is not None:
            q += " AND server_number=?"
            args.append(server_number)
        if session_type:
            q += " AND session_type=?"
            args.append(session_type)
        if track:
            q += " AND track=?"
            args.append(track)
        if ai is not None:
            q += " AND is_ai=?"
            args.append(1 if ai else 0)
        q += " ORDER BY best_lap_ms ASC LIMIT ?"
        args.append(limit)
        with self._connect() as conn:
            rows = conn.execute(q, args).fetchall()
        return [dict(r) for r in rows]

    def count_best_laps(self) -> int:
        with self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM best_laps").fetchone()[0]
