"""Configuration du service B404-Timing.

Architecture validée par David le 14/08/2026 :
  - r2la reste le Live Timing classique (inchangé, chaîne Shared Memory).
  - B404-Timing = brique indépendante : API Live + Best Laps persistés.
  - Source de données = API native rF2 (REST Amdatu), lecture seule.
  - Serveur suivi : S8 UNIQUEMENT (127.0.0.1:5397). S1-S7 jamais configurés.

PHASE P1 — structure du service (création des fichiers, aucun démarrage).
"""
from pathlib import Path

# ─── Chemins ────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "timing.db"
LOG_DIR = Path("D:/B404/Logs/timing")

# ─── Serveur HTTP ───────────────────────────────────────────
HOST = "127.0.0.1"
PORT = 3003

# ─── Polling rF2 ────────────────────────────────────────────
POLL_INTERVAL_S = 5          # intervalle de capture (s)
HTTP_TIMEOUT_S = 5           # timeout API rF2 (s)

# ─── Serveurs suivis ────────────────────────────────────────
# numéro de serveur -> port API WebUI réel (source instances_static.json, 14/08).
# S8 = 5397 (config réelle — jamais 5318 théorique).
# ⚠️ NE PAS ajouter S1-S7 : interdits (règle absolue B404, GO David 14/08).
SERVERS = {8: 5397}

# ─── Identification ─────────────────────────────────────────
# SteamID >= seuil = IA rF2 (vérifié 14/08 : IA = 90071996842377216..220,
# humains = 76561198...). Les vrais IDs Steam commencent par 7656119.
AI_STEAMID_THRESHOLD = 90071996842377216

# ─── Divers ─────────────────────────────────────────────────
VERSION = "1.0.0"
