# API REST Native rFactor 2 — Documentation Complète

> Document de référence pour B404 RaceControl
>
> Analyse réalisée le 16 juillet 2026 — **5 instances dédiées actives**
>
> **Auteur :** B404 RaceControl — Analyse d'API

---

## Sommaire

1. [Introduction](#1-introduction)
2. [Architecture de l'API](#2-architecture-de-lapi)
3. [Instances détectées](#3-instances-détectées)
4. [Catégorie : Watch / Spectateur](#4-watch--spectateur)
5. [Catégorie : Sessions](#5-sessions)
6. [Catégorie : Race](#6-race)
7. [Catégorie : Navigation](#7-navigation)
8. [Catégorie : Multiplayer](#8-multiplayer)
9. [Catégorie : Chat](#9-chat)
10. [Catégorie : Profil](#10-profil)
11. [Catégories : Garage et Tuning](#11-garage-et-tuning)
12. [Catégorie : Options](#12-options)
13. [Autres catégories](#13-autres-catégories)
14. [Mapping des types rF2 vers LiveTimingData](#14-mapping-des-types-rf2-vers-livetimingdata)
15. [Recommandations pour RaceControl](#15-recommandations-pour-racecontrol)
16. [Glossaire](#16-glossaire)

---

## 1. Introduction

L'API REST native de rFactor 2 est fournie via le framework **Amdatu** (Java/OSGi). Elle expose l'ensemble des fonctionnalités du jeu via des endpoints HTTP, permettant de contrôler le jeu, récupérer des données de session en temps réel, et interagir avec les composants internes.

### Base URL

```
http://localhost:<port>/
```

Le **port réel** n'est PAS 5397 comme souvent documenté, mais suit le schéma :

| Type | Port |
|------|------|
| API REST (1ère instance) | `5297` (port jeu - 100) |
| API REST (2ème instance) | `5300` |
| API REST (nème instance) | `port_jeu - 100` |
| Swagger UI | `http://localhost:5297/swagger/index.html` |
| Spec Swagger | `http://localhost:5297/swagger/docs` |

### Port de jeu vs API

Le serveur dédié rFactor 2 écoute sur les ports suivants :

| Usage | Calcul | Exemple |
|-------|--------|---------|
| Port de jeu (UDP/TCP) | configuré dans le .json | 5397, 5400, 5403... |
| API REST HTTP | port_jeu - 100 | 5297, 5300, 5303... |

### Spécification Swagger

- Version : Swagger 1.2
- Framework : Amdatu REST UI
- Interface : `http://localhost:<port>/swagger/index.html`
- Resource listing : `http://localhost:<port>/swagger/docs`
- Spec catégorie : `http://localhost:<port>/swagger/docs/<categorie>`

---

## 3. Instances détectées

Au moment de l'analyse, **5 instances** de serveur dédié rFactor 2 étaient actives simultanément sur la machine, toutes en session **PRACTICE1** avec 15 véhicules IA.

| Port | Circuit | Session | Avancement | Pilotes | Météo |
|------|---------|---------|------------|---------|-------|
| **5297** | Paul Ricard HTTT | Terminée | 100% | — | — |
| **5300** | **Spa-Francorchamps** | Practice #1 | ~44% | 15 GT3 | 26°C, sec |
| **5303** | Adelaide Street Circuit | Practice #1 | ~48% | 15 GT3 | — |
| **5306** | Brands Hatch GP | Practice #1 | ~46% | 15 GT3 | — |
| **5309** | Nurburgring GP | Practice #1 | ~46% | 15 GT3 | — |

**Conclusion :** Chaque instance expose la même API REST avec des données de session différentes. Le provider RaceControl devra détecter et se connecter à l'instance qui correspond au serveur cible.

---

## 4. Watch / Spectateur

> Catégorie **la plus importante** pour le Live Timing
>
> Spec : `GET /swagger/docs/rest/watch`
> Base : `http://localhost:<port>/rest/watch/`

### 4.1 `GET /rest/watch/standings` ⭐⭐⭐

**Classement temps réel — endpoint principal du Live Timing**

Retourne un **tableau JSON** de tous les véhicules engagés, avec **58 propriétés** par véhicule.

**Paramètres :** Aucun

**Exemple de réponse (1 véhicule sur 15) :**

```json
{
  "slotID": 40,
  "driverName": "Bartholomeus Jeroen",
  "vehicleName": "McLaren 650S GT3 #58",
  "fullTeamName": "Strakka Racing",
  "carNumber": "58",
  "carClass": "GT3",
  "position": 13,
  "qualification": 1,
  "lapsCompleted": 47,
  "bestLapTime": 127.112,
  "bestSectorTime1": 51.843,
  "bestSectorTime2": 96.142,
  "bestLapSectorTime1": 51.8517,
  "bestLapSectorTime2": 96.142,
  "lastLapTime": 131.327,
  "lastSectorTime1": 52.459,
  "lastSectorTime2": 98.882,
  "currentSectorTime1": 53.652,
  "currentSectorTime2": -1.0,
  "timeIntoLap": 76.854,
  "estimatedLapTime": 127.064,
  "timeBehindLeader": 0.0,
  "lapsBehindLeader": 0,
  "timeBehindNext": 0.0,
  "lapsBehindNext": 0,
  "pitstops": 3,
  "penalties": 0,
  "sector": "SECTOR2",
  "pitting": false,
  "pitState": "NONE",
  "inGarageStall": false,
  "pitLapDistance": 5554.23,
  "pitGroup": "Group1",
  "finishStatus": "FSTAT_NONE",
  "flag": "GREEN",
  "underYellow": false,
  "gamePhase": "GREEN",
  "inControl": 1,
  "player": false,
  "hasFocus": true,
  "focus": true,
  "headlights": false,
  "drsActive": false,
  "fuelFraction": 0.0,
  "lapDistance": 3646.875,
  "pathLateral": -6.594,
  "trackEdge": -8.525,
  "lapStartET": 6900.107,
  "serverScored": true,
  "countLapFlag": "COUNT_LAP_AND_TIME",
  "upgradePack": "00000000000000000000000000000000",
  "steamID": 90071996842377246,
  "vehicleFilename": "MCL650S-GTD1B31EBB",
  "carId": "4b27c69c9bcf35ce2536c97c0d2b10d56f27f52e",
  "carPosition": { "y": 15.275, "x": 919.519, "z": 165.352, "type": -1 },
  "carVelocity": { "x": 0.189, "y": 1.184, "z": -58.556, "velocity": 58.568 },
  "carAcceleration": { "x": -1.528, "y": -1.197, "z": 15.271, "velocity": 15.394 },
  "attackMode": { "totalCount": 0, "remainingCount": 0, "timeRemaining": -1 }
}
```

**Toutes les propriétés (58) :**

| Propriété | Type | Description | Pour RaceControl |
|-----------|------|-------------|------------------|
| `slotID` | int | Identifiant unique du slot | ⭐ Référence |
| `driverName` | string | Nom du pilote | ⭐⭐ |
| `vehicleName` | string | Nom de la voiture | ⭐⭐ |
| `fullTeamName` | string | Nom complet de l'équipe | ⭐⭐ |
| `carNumber` | string | Numéro de la voiture | ⭐ |
| `carClass` | string | Classe (GT3, Hypercar...) | ⭐⭐ |
| `position` | int | Position actuelle (1-based) | ⭐⭐⭐ |
| `qualification` | int | Position de qualification | ⭐⭐ |
| `lapsCompleted` | int | Tours complétés | ⭐⭐ |
| `bestLapTime` | double | Meilleur temps au tour (s) | ⭐⭐⭐ |
| `bestSectorTime1` | double | Meilleur secteur 1 (s) | ⭐⭐⭐ |
| `bestSectorTime2` | double | Meilleur secteur 2 (s) | ⭐⭐⭐ |
| `bestLapSectorTime1` | float | Secteur 1 du meilleur tour | ⭐ |
| `bestLapSectorTime2` | float | Secteur 2 du meilleur tour | ⭐ |
| `lastLapTime` | double | Dernier temps au tour (s) | ⭐⭐ |
| `lastSectorTime1` | double | Dernier secteur 1 (s) | ⭐ |
| `lastSectorTime2` | double | Dernier secteur 2 (s) | ⭐ |
| `currentSectorTime1` | double | Secteur 1 en cours | ⭐ |
| `currentSectorTime2` | double | Secteur 2 en cours | ⭐ |
| `timeIntoLap` | double | Temps dans le tour actuel | ⭐ |
| `estimatedLapTime` | double | Temps estimé du tour actuel | ⭐ |
| `timeBehindLeader` | double | Temps derrière le leader (s) | ⭐⭐⭐ |
| `lapsBehindLeader` | int | Tours derrière le leader | ⭐⭐ |
| `timeBehindNext` | double | Temps derrière le suivant (s) | ⭐⭐ |
| `lapsBehindNext` | int | Tours derrière le suivant | ⭐ |
| `pitstops` | short | Nombre d'arrêts au stand | ⭐⭐ |
| `penalties` | short | Nombre de pénalités | ⭐ |
| `sector` | enum | Secteur actuel (SECTOR1/2/3) | ⭐ |
| `pitting` | bool | En train de rentrer aux stands ? | ⭐ |
| `pitState` | enum | État du pit (NONE/REQUEST/ENTERING/STOPPED/EXITING) | ⭐⭐ |
| `inGarageStall` | bool | Dans le garage ? | ⭐ |
| `pitLapDistance` | float | Distance de la ligne de pit | — |
| `pitGroup` | string | Groupe de pit | — |
| `finishStatus` | enum | Statut de finish (FSTAT_NONE/FINISHED/DNF/DQ) | ⭐⭐⭐ |
| `flag` | enum | Drapeau individuel (GREEN/YELLOW/RED/BLUE...) | ⭐⭐ |
| `underYellow` | bool | Sous drapeau jaune ? | ⭐ |
| `gamePhase` | enum | Phase de jeu individuelle | ⭐⭐ |
| `inControl` | byte | Contrôle (0=IA, 1=Humain) | ⭐ |
| `player` | bool | Est-ce le joueur local ? | ⭐ |
| `hasFocus` | bool | A le focus caméra ? | — |
| `focus` | bool | Doublon de hasFocus | — |
| `headlights` | bool | Phares allumés ? | — |
| `drsActive` | bool | DRS actif ? | ⭐ |
| `fuelFraction` | float | Carburant restant (0.0-1.0) | ⭐ |
| `lapDistance` | double | Distance parcourue dans le tour | — |
| `pathLateral` | double | Position latérale sur la piste | — |
| `trackEdge` | double | Bord de piste | — |
| `lapStartET` | double | Début du tour (timestamp) | ⭐ |
| `serverScored` | bool | Enregistré par le serveur ? | — |
| `countLapFlag` | enum | Comptage des tours | — |
| `upgradePack` | string | Pack d'améliorations | — |
| `steamID` | long | Identifiant Steam du pilote | ⭐ |
| `vehicleFilename` | string | Fichier .veh | — |
| `carId` | string | Identifiant unique de la voiture | ⭐ |
| `carPosition` | objet | Position 3D {x, y, z, type} | ⭐ Carte |
| `carVelocity` | objet | Vitesse 3D {x, y, z, velocity} | ⭐ |
| `carAcceleration` | objet | Accélération 3D | — |
| `attackMode` | objet | Mode attaque (Push2Pass) | ⭐ |

**Utilisation :**
- Polling toutes les 1-5 secondes pour des données temps réel
- Trier par `position` pour le classement
- Calculer S3 = bestLapTime - bestSectorTime1 - bestSectorTime2
- Le meilleur tour général est le min(bestLapTime) de tous les véhicules

### 4.2 `GET /rest/watch/sessionInfo` ⭐⭐⭐

**Informations globales de la session + météo temps réel**

**Paramètres :** Aucun

**Exemple de réponse :**

```json
{
  "trackName": "Spa-Francorchamps",
  "trackName": "Spa-Francorchamps",
  "session": "PRACTICE1",
  "currentEventTime": 3180.6,
  "endEventTime": 7230.0,
  "maximumLaps": 2147483647,
  "lapDistance": 6981.6,
  "numberOfVehicles": 15,
  "gamePhase": 5,
  "yellowFlagState": "NONE",
  "sectorFlag": ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
  "startLightFrame": 0,
  "numRedLights": 3,
  "inRealtime": false,
  "playerName": "Your Name",
  "playerFileName": "Serveur 1",
  "darkCloud": 0.0,
  "raining": 0.0,
  "ambientTemp": 26.0,
  "trackTemp": 41.87,
  "windSpeed": { "x": 0.0, "y": 0.0, "z": 0.0, "velocity": 0.0 },
  "minPathWetness": 0.0,
  "averagePathWetness": 0.0,
  "maxPathWetness": 0.0,
  "gameMode": "SERVER_AND_CLIENT",
  "passwordProtected": true,
  "serverPort": -32239,
  "maxPlayers": 31,
  "serverName": "#serveur 1",
  "startEventTime": 36000.0,
  "raceCompletion": { "timeCompletion": 0.9649 }
}
```

**Propriétés :**

| Propriété | Type | Description |
|-----------|------|-------------|
| `trackName` | string | Nom du circuit |
| `session` | enum | TESTDAY, PRACTICE1-4, QUALIFY1-4, WARMUP, RACE1-4 |
| `currentEventTime` | double | Temps écoulé depuis le début de l'event (s) |
| `endEventTime` | double | Temps de fin de l'event (s) |
| `maximumLaps` | int | Nombre max de tours (2147483647 = temps limité) |
| `lapDistance` | double | Longueur d'un tour (m) |
| `numberOfVehicles` | int | Nombre de véhicules en piste |
| `gamePhase` | byte/string | Phase (0=NONE → 7=PENDING, ou GREEN/RED...) |
| `yellowFlagState` | enum | État drapeau jaune (NONE/PENDING/PITS_CLOSED...) |
| `sectorFlag` | string[] | Drapeaux par secteur |
| `darkCloud` | double | Couverture nuageuse (0.0-1.0) |
| `raining` | double | Intensité pluie (0.0-1.0) |
| `ambientTemp` | double | Température ambiante (°C) |
| `trackTemp` | double | Température piste (°C) |
| `windSpeed` | objet | Vent {x, y, z, velocity} (m/s) |
| `minPathWetness` | double | Mouillage min de la piste (0.0-1.0) |
| `averagePathWetness` | double | Mouillage moyen de la piste |
| `maxPathWetness` | double | Mouillage max de la piste |
| `gameMode` | enum | UNKNOWN, SERVER, CLIENT, SERVER_AND_CLIENT |
| `passwordProtected` | bool | Serveur protégé par mot de passe ? |
| `serverPort` | int | Port du serveur |
| `maxPlayers` | int | Nombre max de joueurs |
| `serverName` | string | Nom du serveur |
| `startEventTime` | double | Temps de début de l'event (s) |
| `raceCompletion` | objet | Avancement de la course |

**Notes :**
- `gamePhase` 5 = GREEN (course active)
- `maximumLaps: 2147483647` = INT32_MAX, signifie que la session est limitée en temps, pas en tours
- Le temps restant = `endEventTime - currentEventTime`

### 4.3 `GET /rest/watch/standings/history` ⭐⭐

**Historique des tours par pilote**

Retourne un objet clé=valeur où chaque clé est un `slotID` et la valeur un tableau de l'historique des tours.

**Paramètres :** Aucun

**Structure :**
```json
{
  "<slotID>": [
    {
      "slotID": 40,
      "driverName": "Bartholomeus Jeroen",
      "vehicleName": "McLaren 650S GT3 #58",
      "carClass": "GT3",
      "position": 1,
      "totalLaps": 0,
      "lapTime": -1.0,
      "sectorTime1": -1.0,
      "sectorTime2": -1.0,
      "pitting": false
    }
  ]
}
```

**Utilisation :**
- Reconstruction de la progression des positions
- Graphique d'évolution (courbes de position)
- Analyse des temps au tour par pilote

### 4.4 `GET /rest/watch/trackmap` ⭐⭐

**Waypoints du circuit pour l'affichage de la carte**

Retourne un tableau de points 3D {x, y, z, type} représentant le tracé du circuit.

**Utilisation :** Dessiner la carte du circuit sur RaceControl.

### 4.5 Autres endpoints Watch

| Endpoint | Méthode | Description | Données |
|----------|---------|-------------|---------|
| `/rest/watch/activeCamera` | GET | Index de la caméra active | ❌ Vide (session dédiée) |
| `/rest/watch/focus` | GET | SlotID under focus | ❌ Vide |
| `/rest/watch/focus/{slotID}` | PUT | Focus sur un véhicule | Commande |
| `/rest/watch/focusBackward` | PUT | Focus précédent | Commande |
| `/rest/watch/focusForward` | PUT | Focus suivant | Commande |
| `/rest/watch/sessionInfo` | GET | **(déjà documenté)** | ✅ |
| `/rest/watch/standings` | GET | **(déjà documenté)** | ✅ |
| `/rest/watch/standings/history` | GET | **(déjà documenté)** | ✅ |
| `/rest/watch/trackmap` | GET | **(déjà documenté)** | ✅ |
| `/rest/watch/replay/isActive` | GET | Replay actif ? | ❌ Vide |
| `/rest/watch/replay/toggleActive` | PUT | Bascule replay | Commande |
| `/rest/watch/replays` | GET | Liste des replays | ❌ Vide |

---

## 5. Sessions

> Gestion des sessions de course, météo, configuration
>
> Spec : `GET /swagger/docs/rest/sessions`
> Base : `http://localhost:<port>/rest/sessions/`

### 5.1 `GET /rest/sessions/weather` ⭐⭐

**Configuration météo complète pour toutes les sessions**

Retourne un objet avec les paramètres météo pour PRACTICE, QUALIFY et RACE.

**Exemple :**
```json
{
  "RACE": {
    "FINISH": {
      "WNV_STARTTIME": { "stringValue": "Finish", "currentValue": 660 },
      "WNV_HUMIDITY": { "stringValue": "40%", "currentValue": 40 },
      "WNV_AIR_TEMP": { "stringValue": "24.0°C", "currentValue": 24.0 },
      "WNV_TRACK_TEMP": { "stringValue": "33.0°C", "currentValue": 33.0 },
      "WNV_WIND_SPEED": { "stringValue": "4 m/s", "currentValue": 4 },
      "WNV_WIND_DIR": { "stringValue": "SE (135°)", "currentValue": 135 },
      "WNV_PRESSURE": { "stringValue": "1013.0 mbar", "currentValue": 1013.0 }
    }
  }
}
```

### 5.2 `GET /rest/sessions/weather/{session}` ⭐⭐

**Météo pour une session spécifique** (PRACTICE, QUALIFY ou RACE)

### 5.3 `GET /rest/sessions/amount` ⭐

**Configuration du nombre de sessions**

```json
{ "QUALIFY": 1, "PRACTICE": 1, "RACE": 1, "WARMUP": 0 }
```

### 5.4 `GET /rest/sessions/opponents` ⭐

**Liste des adversaires disponibles**

Retourne un tableau d'objets `{id, name}` listant tous les modèles de voiture disponibles pour la session.

### 5.5 Autres endpoints Sessions

| Endpoint | Méthode | Description | Données |
|----------|---------|-------------|---------|
| `/rest/sessions` | GET | Paramètres de session | ⚠️ Vide |
| `/rest/sessions/Spectators` | GET | Liste des spectateurs | ✅ Vide (aucun) |
| `/rest/sessions/ai/add` | POST | Ajouter une IA | Commande |
| `/rest/sessions/ai/kick/{slotId}` | POST | Retirer une IA | Commande |
| `/rest/sessions/setting/{setting}` | GET | Valeur d'un setting | ✅ |
| `/rest/sessions/settings` | POST | Modifier un setting | Commande |
| `/rest/sessions/realroad` | POST | Sauver le RealRoad | Commande |

---

## 6. Race

> Gestion de la sélection de série, circuit, voiture et des packages
>
> Spec : `GET /swagger/docs/rest/race`

### 6.1 `GET /rest/race/selection` ⭐

**Sélection actuelle (série, circuit, voiture)**

```json
{
  "series": {
    "shortName": "Championnat LSF",
    "name": "Championnat LSF",
    "description": "...",
    "disabled": false,
    "signature": "...",
    "version": "1.00"
  },
  "track": { ... },
  "car": { ... }
}
```

### 6.2 `GET /rest/race/series` ⭐

**Liste de toutes les séries/mods disponibles**

### 6.3 `GET /rest/race/series/{id}/image`

**Image large d'une série**

### 6.4 `GET /rest/race/series/{id}/thumbnail`

**Miniature d'une série**

### 6.5 `GET /rest/race/track/{id}/trackmap` ⭐

**Waypoints du circuit par ID**

### 6.6 Endpoints vides/indisponibles

| Endpoint | Condition nécessaire |
|----------|---------------------|
| `/rest/race/car` | Être dans l'écran de sélection de voiture |
| `/rest/race/track` | Être dans l'écran de sélection de circuit |
| `/rest/race/car/{id}/image` | Session UI active |
| `/rest/race/track/{id}/image` | Session UI active |
| `/rest/race/car/tuning/disabled` | Session UI active |
| `/rest/race/getAllowedToStartRacing` | Session UI active |
| `/rest/race/packages` | Données packages disponibles |

---

## 7. Navigation

> Contrôle de la navigation dans l'interface du jeu
>
> Spec : `GET /swagger/docs/navigation`

### 7.1 `GET /navigation/state` ⭐⭐

**État courant de la navigation et du jeu**

```json
{
  "state": {
    "navigationState": "NAV_MAIN_MENU",
    "gameState": "GSTATE_NULL",
    "settingMode": "SETTING_MULTIPLAYER",
    "gameSession": "PRACTICE1",
    "gamePhase": "GREEN",
    "user": { "userState": "DEFAULT", "isAdmin": false },
    "appBuild": 1250,
    "steamBetaBranchName": "public"
  }
}
```

Utile pour savoir où se trouve le jeu dans son cycle de vie.

### 7.2 `POST /navigation/action/{action}`

**Actions de navigation**

| Action | Description |
|--------|-------------|
| `NAV_EXIT` | Quitter |
| `NAV_RACE_SINGLE` | Course solo |
| `NAV_RACE_MULTIPLAYER` | Course multijoueur |
| `NAV_SPECTATE_MULTIPLAYER` | Spectateur multijoueur |
| `NAV_TO_MAIN_MENU` | Menu principal |
| `NAV_RESTART_RACE` | Redémarrer la course |
| `NAV_RESTART_WEEKEND` | Redémarrer le week-end |
| `NAV_NEXT_SESSION` | Session suivante |
| `NAV_FINISH_SESSION` | Terminer la session |
| `NAV_TO_TUNING` | Aller au tuning |
| `NAV_TO_GARAGE` | Aller au garage |
| `NAV_TO_REALTIME` | Aller en temps réel |

---

## 8. Multiplayer

> Gestion du multijoueur (joindre, configurer, administrer)
>
> Spec : `GET /swagger/docs/rest/multiplayer`

### 8.1 Endpoints détectés

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/rest/multiplayer/join` | GET | Joindre un serveur (host, port, password) |
| `/rest/multiplayer/join/state` | GET | État de la connexion (18 états possibles) |
| `/rest/multiplayer/join/error` | GET | Erreur de connexion |
| `/rest/multiplayer/join/downloadname` | GET | Nom du fichier en téléchargement |
| `/rest/multiplayer/join/downloadnumber` | GET | Nombre d'éléments restant à télécharger |
| `/rest/multiplayer/join/downloadpercent` | GET | Pourcentage du téléchargement |
| `/rest/multiplayer/reconfigureserver` | POST | Reconfigurer le serveur |
| `/rest/multiplayer/sendcommand/{command}` | POST | Envoyer une commande |
| `/rest/multiplayer/servers/favorites` | POST/DELETE | Gérer les favoris |
| `/rest/multiplayer/servers/history` | POST/DELETE | Gérer l'historique |
| `/rest/multiplayer/steam/status` | GET | Statut Steam (online/offline) |

### 8.2 Commandes disponibles

```json
[
  "VOTE_MECH_VOTE_YES", "VOTE_MECH_VOTE_NO",
  "VOTE_MECH_NEXT_SESSION", "VOTE_MECH_STRAIGHT_TO_RACE",
  "VOTE_MECH_NEXT_EVENT", "VOTE_MECH_SPECIFIC_EVENT",
  "VOTE_MECH_RESTART_RACE", "VOTE_MECH_RESTART_WARMUP1",
  "VOTE_MECH_RESTART_WARMUP2", "VOTE_MECH_RESTART_EVENT",
  "VOTE_MECH_ADD_AI", "VOTE_MECH_ADD_5_AI",
  "VOTE_MECH_REMOTE_SERVER", "VOTE_MECH_KICK",
  "VOTE_MECH_BAN", "VOTE_MECH_ADMIN",
  "VOTE_MECH_ADMIN_PWD", "VOTE_MECH_EDITGRID",
  "VOTE_MECH_SETMASS", "VOTE_MECH_FORWARDSECONDS",
  "VOTE_MECH_SCORECLIENT", "VOTE_MECH_UNSCORECLIENT",
  "VOTE_MECH_CHANGELAPS", "VOTE_MECH_ADDPENALTY",
  "VOTE_MECH_SUBPENALTY", "VOTE_MECH_PITBYDRIVER",
  "VOTE_MECH_PITBYVEHICLE", "VOTE_MECH_PITBYTEAM",
  "VOTE_MECH_DISQUALIFY", "VOTE_MECH_UNDISQUALIFY",
  "VOTE_MECH_THROWYELLOW", "VOTE_MECH_CLEARYELLOW",
  "VOTE_MECH_RACELENGTH", "VOTE_MECH_UNTHROTTLE",
  "VOTE_MECH_EXIT", "VOTE_MECH_MAXIMUM"
]
```

### 8.3 États de connexion

```
JOIN_IDLE, JOIN_INITIALIZE, JOIN_GETTING_DETAILS, JOIN_GOT_DETAILS,
JOIN_ENTERING_PASSWORD, JOIN_CHECKING_PASSWORD, JOIN_AWAITING_CHECKING_PASSWORD_RESPONSE,
JOIN_CHECKED_PASSWORD, JOIN_VERIFYING_MODS, JOIN_VERIFIED_MODS,
JOIN_INSTALLING_MODS, JOIN_DOWNLOADING_MODS, JOIN_INSTALL_DOWNLOADED_MODS,
JOIN_JOIN_SERVER, JOIN_JOINING_SERVER, JOIN_JOINED_SERVER,
JOIN_REJOINING_SERVER, JOIN_REJOINED_SERVER, JOIN_FAILURE,
JOIN_INVALID_PASSWORD, JOIN_CHECK_GAME_CONTENT_FOR_DOWNLOAD,
JOIN_DOWNLOADING_CONTENT, JOIN_DOWNLOADING_CONTENT_IN_PROGRESS
```

---

## 9. Chat

> Système de chat en jeu
>
> Spec : `GET /swagger/docs/rest/chat`

### `GET /rest/chat` ⭐

Récupère les messages du chat. Retourne un tableau :
```json
[
  { "m_message": "Hello!", "m_timestamp": 1234567890 }
]
```

### `POST /rest/chat`

Envoyer un message.

---

## 10. Profil

> Gestion du profil utilisateur
>
> Spec : `GET /swagger/docs/rest/profile`

### `GET /rest/profile`

Retourne les informations du profil Steam local :
```json
{
  "name": "...",
  "nick": "...",
  "steamID": "..."
}
```

> **Note :** Vide sur un serveur dédié sans joueur local connecté.

---

## 11. Garage et Tuning

> Gestion du garage et des réglages
>
> Spec : `GET /swagger/docs/rest/garage` et `GET /swagger/docs/rest/tuning`

### 11.1 Garage

| Endpoint | Méthode | Description | Données |
|----------|---------|-------------|---------|
| `/rest/garage/setup` | GET | Liste des configurations disponibles | ✅ |
| `/rest/garage/summary` | GET | Résumé des réglages | ✅ |
| `/rest/garage/test` | GET | Données de test du véhicule | ✅ |
| `/rest/garage/aerodynamics` | GET | Réglages aéro | ❌ UI |
| `/rest/garage/brakes` | GET | Réglages freins | ❌ UI |
| `/rest/garage/suspension` | GET | Réglages suspension | ❌ UI |
| `/rest/garage/tires` | GET | Réglages pneus | ❌ UI |
| `/rest/garage/drivetrain` | GET | Transmission | ❌ UI |
| `/rest/garage/electronics` | GET | Électronique | ❌ UI |
| `/rest/garage/fuel` | GET | Carburant | ❌ UI |
| `/rest/garage/gears` | GET | Rapports de boîte | ❌ UI |

> **Note :** La plupart des endpoints garage nécessitent que le joueur soit dans l'écran de garage (session UI interactive).

### 11.2 Tuning

| Endpoint | Méthode | Description | Données |
|----------|---------|-------------|---------|
| `/rest/tuning` | GET | Réglages tuning actuels | ✅ |
| `/rest/tuning/skins` | GET | Liste des skins disponibles | ❌ |
| `/rest/tuning/ai/params` | GET | Paramètres IA | ❌ |

---

## 12. Options

> Gestion des options du jeu (très grand nombre de settings)
>
> Spec : `GET /swagger/docs/rest/options`

### Endpoints disponibles

| Endpoint | Description |
|----------|-------------|
| `/rest/options/settings` | Tous les settings |
| `/rest/options/graphics` | Options graphiques |
| `/rest/options/sound` | Options sonores |
| `/rest/options/display` | Options d'affichage |
| `/rest/options/network` | Options réseau |
| `/rest/options/difficulty` | Options de difficulté |
| `/rest/options/joysticks` | Périphériques détectés |
| `/rest/options/summary` | Résumé de configuration |
| `/rest/options/assign` | Contrôles configurables |
| `/rest/options/calibrate` | Calibration |

> **Note :** La plupart retournent des Maps clé=valeur. L'API d'options contient des centaines de settings (graphiques, contrôles, serveur, etc.). Utile pour export de configuration, pas pour le Live Timing.

---

## 13. Autres catégories

| Catégorie | Endpoints | Utilité |
|-----------|-----------|---------|
| **Start** | 7 endpoints | Écran de démarrage, CS host |
| **Replay** | 10 endpoints | Gestion des replays |
| **Event** | 1 endpoint | Moniteur de replay |
| **RSS** | 1 endpoint | Lecteur RSS |
| **Screenshot** | 1 endpoint | Capture d'écran |
| **Shop** | 31 endpoints | Boutique + Workshop Steam |
| **Material Editor** | 7 endpoints | Éditeur de matériaux |
| **Dev/CarScreenshots** | 4 endpoints | Génération d'icônes voitures |
| **Dev/ImageMagick** | 3 endpoints | Vérification ImageMagick |
| **Dev/Teams** | 4 endpoints | Génération d'équipes |

---

## 14. Mapping des types rF2 vers LiveTimingData

### 14.1 SeasonInfo → LiveTimingData.server + session

| Champ rF2 | Champ LiveTimingData | Transformation |
|-----------|---------------------|----------------|
| `serverName` | `server.name` | Direct |
| `trackName` | `server.circuit` | Direct |
| `currentEventTime` | `session.elapsedTime` | Secondes → mm:ss.xxx |
| `endEventTime` | `server.totalSessionTime` | Secondes → mm:ss.xxx |
| `maximumLaps` | `server.totalLaps` | Direct |
| `ambientTemp` | `server.weather.temperature` + `session.airTemp` | Direct |
| `trackTemp` | `session.trackTemp` | Direct |
| `darkCloud` | `server.weather.condition` | 0-1 → texte |
| `raining` | `server.weather.rainPercent` + `trackCondition` | 0-1 → % + condition |
| `windSpeed.velocity` | `server.weather.windSpeed` | m/s → km/h |
| `numberOfVehicles` | `server.driversCount` | Direct |
| `maxPlayers` | `server.maxDrivers` | Direct |
| `session` | `server.currentSession` | Nom de session |
| `gamePhase` | `session.phase` | Mapping (5=GREEN=race, etc.) |
| `endEventTime - currentEventTime` | `server.timeRemaining` | Calcul direct |

### 14.2 Vehicle → StandingEntry

| Champ rF2 | Champ LiveTimingData | Transformation |
|-----------|---------------------|----------------|
| `position` | `position` | Direct (1-based) |
| `driverName` | `driverName` | Direct |
| `vehicleName` | `car` | Direct |
| `fullTeamName` | `team` | Direct |
| `carClass` | `carClass` | Direct, typé |
| `lapsCompleted` | `laps` | Direct |
| `bestLapTime` | `bestLap` | Secondes → mm:ss.xxx |
| `lastLapTime` | `lastLap` | Secondes → mm:ss.xxx |
| `bestSectorTime1` | `sector1` | Secondes → x.xxx |
| `bestSectorTime2` | `sector2` | Secondes → x.xxx |
| `timeBehindLeader` | `gapToLeader` | Secondes → texte |
| `timeBehindNext` | `gapToNext` | Secondes → texte |
| `lapsBehindLeader` | `gapToLeader` | Si laps > 0 → "+X tours" |
| `pitstops` | `pitStops` | Direct |
| `pitting` | `inPit` | Direct |
| `finishStatus` | `status` | FSTAT_DNF → dnf, etc. |
| `qualification` | `prevPosition` | Pour le diff position |

### 14.3 Champs supplémentaires disponibles

| Champ rF2 | Proposition d'ajout | Utilité |
|-----------|--------------------|---------|
| `carNumber` | `StandingEntry.carNumber` | Affichage du numéro |
| `fuelFraction` | `StandingEntry.fuel` | Niveau de carburant |
| `steamID` | (métadonnée) | Identification unique |
| `estimatedLapTime` | (calculable) | Estimation temps au tour |
| `flag` | (drapeau individuel) | Drapeau du pilote |
| `drsActive` | `StandingEntry.drsActive` | État DRS |
| `penalties` | `StandingEntry.penalties` | Pénalités reçues |
| `carPosition` | (carte) | Position 3D sur le circuit |
| `pitState` | (statut pit détaillé) | NONE/REQUEST/ENTERING/STOPPED/EXITING |

---

## 15. Recommandations pour RaceControl

### 15.1 Détection de l'API

```
1. Tester http://localhost:5297/rest/watch/sessionInfo
2. Si OK → utiliser cette instance comme source de données
3. Si NOK → tester 5300, 5303, 5306, 5309 (ou la plage port_jeu - 100)
4. Si aucune → fallback mock / Steam
```

### 15.2 Polling recommandé

| Données | Intervalle | Endpoint |
|---------|-----------|----------|
| Standings | 1-2 secondes | `/rest/watch/standings` |
| Session Info | 5 secondes | `/rest/watch/sessionInfo` |
| Historique | 30 secondes | `/rest/watch/standings/history` |
| Track map | Une fois (cache) | `/rest/watch/trackmap` |

### 15.3 Calculs dérivés

- **Meilleur tour absolu** : `min(standings[].bestLapTime)`
- **Secteur 3** : `bestLapTime - bestSectorTime1 - bestSectorTime2`
- **Temps restant** : `sessionInfo.endEventTime - sessionInfo.currentEventTime`
- **Condition piste** : basée sur `raining + minPathWetness`
- **Évolution position** : `qualification - position`

### 15.4 Architecture recommandée

```
RaceControl Frontend
       │
RF2DataProvider (port auto-détecté)
       │
├── GET /rest/watch/standings       → classement + statuts
├── GET /rest/watch/sessionInfo     → météo + session + timing
├── GET /rest/watch/standings/history → historique positions
├── GET /rest/watch/trackmap        → carte du circuit
├── GET /rest/sessions/weather      → config météo détaillée
└── GET /navigation/state           → état du jeu
```

### 15.5 Limitations connues

| Limitation | Détail |
|------------|--------|
| Pas de secteur 3 | rF2 ne fournit que S1 et S2 dans l'API (S3 = calculé) |
| Pas de classement par équipe | Chaque véhicule est indépendant |
| team = fullTeamName | L'API retourne le nom complet de l'équipe |
| Qualification = 0 | Possible si pas de session qualif |
| gamePhase individuel vs global | `gamePhase` dans Vehicle peut différer du `gamePhase` global |
| Session dédiée sans joueur | Certains endpoints UI sont vides |
| Port variable | Chaque instance dédiée a un port différent |

---

## 16. Glossaire

| Terme | Définition |
|-------|-----------|
| Amdatu | Framework REST Java/OSGi utilisé par rF2 pour son API |
| SlotID | Identifiant unique d'un emplacement véhicule |
| FSTAT | Finish Status (NONE=en course, FINISHED, DNF, DQ) |
| GamePhase | Phase de jeu (BEFORE, RECONNAISSANCE, GREEN, CHECKERED...) |
| NAV | Navigation (état de l'interface) |
| R2LA | rFactor 2 Log Analyzer (application web2py) |
| RF2W | rFactor 2 Web API (l'API documentée ici) |
| Push2Pass | Système d'attaque limité (DRS-like) |
| RealRoad | Évolution de l'adhérence de la piste |

---

> **Document généré le 16 juillet 2026**
>
> **Projet :** B404 RaceControl
> **Dossier :** `D:\Projet-site\b404-racecontrol`
> **Basé sur l'analyse de 5 instances rFactor 2 Dedicated actives**
> **API analysée :** 21 catégories, ~150 endpoints, 5 testés en profondeur
