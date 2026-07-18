/**
 * RF2DataProvider — Fournisseur de données via l'API native rFactor 2
 *
 * B404 RaceControl
 *
 * Ce provider interroge l'API REST native de rFactor 2 exposée via
 * le framework Amdatu sur le port (port_jeu - 100).
 *
 * Endpoints utilisés (découverts via Swagger le 16/07/2026) :
 *   GET /rest/watch/standings    — Classement temps réel (58 propriétés/véhicule)
 *   GET /rest/watch/sessionInfo  — Infos session + météo
 *   GET /rest/watch/standings/history — Historique des tours
 *   GET /rest/watch/trackmap     — Waypoints du circuit
 *
 * @see docs/API_RFACTOR2.md pour la documentation complète de l'API
 * @module rf2-provider
 */

import type { IDataProvider, ProviderResult } from "./data-provider";
import type {
  LiveTimingData,
  ServerInfo,
  SessionInfo,
  StandingEntry,
  SessionPhase,
  ServerStatus,
  FlagType,
  Weather,
} from "../_types/live-timing";

// ─── Types des réponses API rF2 ──────────────────────────────────────

/** Réponse de /rest/watch/sessionInfo */
interface RF2SessionInfoResponse {
  trackName: string;
  serverName: string;
  session: string;
  currentEventTime: number;
  endEventTime: number;
  maximumLaps: number;
  lapDistance: number;
  numberOfVehicles: number;
  gamePhase: number;
  yellowFlagState: string;
  sectorFlag: string[];
  playerName: string;
  playerFileName: string;
  darkCloud: number;
  raining: number;
  ambientTemp: number;
  trackTemp: number;
  windSpeed: { x: number; y: number; z: number; velocity: number };
  minPathWetness: number;
  averagePathWetness: number;
  maxPathWetness: number;
  gameMode: string;
  passwordProtected: boolean;
  serverPort: number;
  maxPlayers: number;
  startEventTime: number;
  raceCompletion: { timeCompletion?: number };
}

/** Un véhicule dans /rest/watch/standings (58 propriétés) */
interface RF2Vehicle {
  slotID: number;
  driverName: string;
  vehicleName: string;
  fullTeamName: string;
  carNumber: string;
  carClass: string;
  position: number;
  qualification: number;
  lapsCompleted: number;
  bestLapTime: number;
  bestSectorTime1: number;
  bestSectorTime2: number;
  bestLapSectorTime1: number;
  bestLapSectorTime2: number;
  lastLapTime: number;
  lastSectorTime1: number;
  lastSectorTime2: number;
  currentSectorTime1: number;
  currentSectorTime2: number;
  timeIntoLap: number;
  estimatedLapTime: number;
  timeBehindLeader: number;
  lapsBehindLeader: number;
  timeBehindNext: number;
  lapsBehindNext: number;
  pitstops: number;
  penalties: number;
  sector: string;
  pitting: boolean;
  pitState: string;
  inGarageStall: boolean;
  pitLapDistance: number;
  pitGroup: string;
  finishStatus: string;
  flag: string;
  underYellow: boolean;
  gamePhase: string;
  inControl: number;
  player: boolean;
  hasFocus: boolean;
  fuelFraction: number;
  lapDistance: number;
  pathLateral: number;
  trackEdge: number;
  lapStartET: number;
  serverScored: boolean;
  countLapFlag: string;
  upgradePack: string;
  steamID: number;
  vehicleFilename: string;
  carId: string;
  carPosition: { x: number; y: number; z: number; type: number };
  carVelocity: { x: number; y: number; z: number; velocity: number };
  carAcceleration: { x: number; y: number; z: number; velocity: number };
  attackMode: { totalCount: number; remainingCount: number; timeRemaining: number };
  drsActive: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────

/** Ports à essayer pour détecter l'API rF2 (scan de plage : port_jeu - 100) */
const PORT_SCAN_START = 5290;
const PORT_SCAN_END = 5420;

/** Timeout pour les requêtes (ms) */
const API_TIMEOUT = 3000;

/** Constante INT32_MAX = session limitée en temps */
const LAP_LIMIT_TIME = 2147483647;

// ─── Helpers ──────────────────────────────────────────────────────────

function fetchWithTimeout(
  url: string,
  timeoutMs: number = API_TIMEOUT,
): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).then((response) => {
      clearTimeout(id);
      return response;
    });
  } catch {
    return Promise.resolve(null);
  }
}

function formatTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

function formatLapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

function formatTimeRemaining(endTime: number, currentTime: number): string {
  const remaining = Math.max(0, endTime - currentTime);
  return formatTime(remaining);
}

function formatGap(
  timeGap: number,
  lapsGap: number,
): string {
  if (timeGap <= 0 && lapsGap <= 0) return "Leader";
  if (lapsGap > 0) return `+${lapsGap} tour${lapsGap > 1 ? "s" : ""}`;
  return formatTime(timeGap);
}

// ─── Mappeurs ─────────────────────────────────────────────────────────

function mapSessionPhase(gamePhase: number): SessionPhase {
  switch (gamePhase) {
    case 0: return "waiting";
    case 1: return "practice";
    case 2: return "practice"; // warmup
    case 3: return "qualifying";
    case 4: return "race";
    case 5: return "finished";
    case 6: return "paused";
    case 7: return "waiting";
    default: return "waiting";
  }
}

function mapServerStatus(state: number | undefined): ServerStatus {
  if (state === undefined) return "offline";
  if (state === 0 || state === 7) return "offline";
  if (state === 5 || state === 6) return "paused";
  return "online";
}

function mapSessionLabel(session: string): string {
  const labels: Record<string, string> = {
    TESTDAY: "Test Day",
    PRACTICE1: "Essais libres 1",
    PRACTICE2: "Essais libres 2",
    PRACTICE3: "Essais libres 3",
    PRACTICE4: "Essais libres 4",
    QUALIFY1: "Qualifications 1",
    QUALIFY2: "Qualifications 2",
    QUALIFY3: "Qualifications 3",
    QUALIFY4: "Qualifications 4",
    WARMUP: "Warmup",
    RACE1: "Course 1",
    RACE2: "Course 2",
    RACE3: "Course 3",
    RACE4: "Course 4",
  };
  return labels[session] || session;
}

function mapWeatherCondition(darkCloud: number, raining: number): string {
  if (raining < 0.05) {
    if (darkCloud < 0.3) return "Dégagé";
    if (darkCloud < 0.7) return "Partiellement nuageux";
    return "Couvert";
  }
  if (raining < 0.3) return "Bruine";
  if (raining < 0.7) return "Pluie modérée";
  return "Pluie forte";
}

function mapTrackCondition(
  raining: number,
  wetness: number,
): Weather["trackCondition"] {
  if (raining < 0.1 && wetness < 0.1) return "dry";
  if (wetness < 0.5) return "damp";
  return "wet";
}

function mapFlags(
  yellowState: string,
  sectorFlags: string[],
): { type: FlagType; sector: number }[] {
  const flags: { type: FlagType; sector: number }[] = [
    { type: "green", sector: 0 },
  ];
  if (yellowState && yellowState !== "NONE" && yellowState !== "INVALID") {
    flags.push({ type: "yellow", sector: 0 });
  }
  return flags;
}

function mapFinishStatus(status: string): StandingEntry["status"] {
  switch (status) {
    case "FSTAT_FINISHED": return "finished";
    case "FSTAT_DNF": return "dnf";
    case "FSTAT_DQ": return "dnf";
    default: return "running";
  }
}

function mapCarClass(rf2Class: string): string {
  if (!rf2Class) return "GT3";
  return rf2Class;
}

// ─── Provider ─────────────────────────────────────────────────────────

/**
 * Fournisseur de données via l'API REST native de rFactor 2.
 *
 * Détecte automatiquement l'instance de serveur dédié en testant
 * les ports 5297, 5300, 5303, 5306, 5309 (pattern port_jeu - 100).
 */
export class RF2DataProvider implements IDataProvider {
  readonly name = "rF2 API";

  private baseUrl: string | null = null;

  /**
   * Détecte une instance rF2 active en scannant une plage de ports.
   */
  async isAvailable(): Promise<boolean> {
    // Scan la plage de ports par pas de 3 (incrément standard rF2)
    for (let port = PORT_SCAN_START; port <= PORT_SCAN_END; port += 3) {
      const url = `http://localhost:${port}/rest/watch/sessionInfo`;
      const response = await fetchWithTimeout(url);
      if (response && response.ok) {
        this.baseUrl = `http://localhost:${port}`;
        return true;
      }
    }
    return false;
  }

  /**
   * Récupère toutes les données Live Timing depuis l'API rF2.
   * Utilise les endpoints watch/standings et watch/sessionInfo.
   */
  async fetch(): Promise<ProviderResult> {
    if (!this.baseUrl) {
      throw new Error("rF2 API non détectée — appeler isAvailable() d'abord");
    }

    const [standingsRes, sessionRes, historyRes] = await Promise.all([
      this.fetchJSON<RF2Vehicle[]>(`${this.baseUrl}/rest/watch/standings`),
      this.fetchJSON<RF2SessionInfoResponse>(
        `${this.baseUrl}/rest/watch/sessionInfo`,
      ),
      this.fetchHistory(),
    ]);

    const vehicles = standingsRes ?? [];
    const session = sessionRes;

    const server = this.buildServerInfo(session, vehicles);
    const sessionInfo = this.buildSessionInfo(session);
    const standings = this.buildStandings(vehicles);

    return {
      data: { server, session: sessionInfo, standings },
      source: `rF2 [${this.baseUrl}]`,
      fetchedAt: new Date().toISOString(),
    };
  }

  // ─── Requêtes internes ───────────────────────────────────────────

  private async fetchJSON<T>(url: string): Promise<T | null> {
    const response = await fetchWithTimeout(url);
    if (!response || !response.ok) return null;
    try {
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  private async fetchHistory(): Promise<Record<string, unknown> | null> {
    return this.fetchJSON<Record<string, unknown>>(
      `${this.baseUrl}/rest/watch/standings/history`,
    );
  }

  // ─── Construction des données ────────────────────────────────────

  private buildServerInfo(
    session: RF2SessionInfoResponse | null,
    vehicles: RF2Vehicle[],
  ): ServerInfo {
    if (!session) {
      return {
        id: "rf2-unknown",
        name: "rFactor 2 Server",
        circuit: "Inconnu",
        category: "GT3",
        weather: {
          condition: "—",
          temperature: 0,
          windSpeed: 0,
          rainPercent: 0,
          trackCondition: "dry",
        },
        driversCount: vehicles.length,
        maxDrivers: 31,
        currentSession: "—",
        timeRemaining: "—",
        totalSessionTime: "—",
        lapsCompleted: 0,
        totalLaps: 0,
        status: "online",
      };
    }

    const isTimeLimited = session.maximumLaps >= LAP_LIMIT_TIME;
    const lapsDisplay = isTimeLimited ? "∞" : String(session.maximumLaps);

    // Déterminer le nombre de tours complétés (le max de tous les véhicules)
    const maxLapsCompleted = vehicles.reduce(
      (max, v) => Math.max(max, v.lapsCompleted ?? 0),
      0,
    );

    // Déterminer les catégories présentes
    const categories = new Set(vehicles.map((v) => mapCarClass(v.carClass)));
    const primaryCategory =
      categories.size === 1
        ? mapCarClass(vehicles[0]?.carClass)
        : "Multi-classe";

    return {
      id: "rf2-live",
      name: session.serverName ?? "rFactor 2 Server",
      circuit: session.trackName ?? "Inconnu",
      category: primaryCategory as ServerInfo["category"],
      weather: {
        condition: mapWeatherCondition(session.darkCloud, session.raining),
        temperature: Math.round(session.ambientTemp),
        windSpeed: Math.round(session.windSpeed?.velocity ?? 0),
        rainPercent: Math.round(session.raining * 100),
        trackCondition: mapTrackCondition(
          session.raining,
          session.averagePathWetness,
        ),
      },
      driversCount: session.numberOfVehicles ?? vehicles.length,
      maxDrivers: session.maxPlayers ?? 31,
      currentSession: mapSessionLabel(session.session),
      timeRemaining: formatTimeRemaining(
        session.endEventTime,
        session.currentEventTime,
      ),
      totalSessionTime: formatTime(session.endEventTime - session.startEventTime),
      lapsCompleted: maxLapsCompleted,
      totalLaps: isTimeLimited ? 0 : session.maximumLaps,
      status: mapServerStatus(session.gamePhase),
    };
  }

  private buildSessionInfo(
    session: RF2SessionInfoResponse | null,
  ): SessionInfo {
    if (!session) {
      return {
        phase: "waiting",
        serverTime: new Date().toLocaleTimeString("fr-FR"),
        trackTemp: 0,
        airTemp: 0,
        flags: [],
        elapsedTime: "—",
      };
    }

    return {
      phase: mapSessionPhase(session.gamePhase),
      serverTime: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      trackTemp: Math.round(session.trackTemp),
      airTemp: Math.round(session.ambientTemp),
      flags: mapFlags(session.yellowFlagState, session.sectorFlag),
      elapsedTime: formatTime(session.currentEventTime),
    };
  }

  private buildStandings(vehicles: RF2Vehicle[]): StandingEntry[] {
    if (!vehicles || vehicles.length === 0) return [];

    // Filtrer les véhicules valides et trier par position
    const valid = vehicles
      .filter((v) => v.position > 0 && v.driverName)
      .sort((a, b) => a.position - b.position);

    // Meilleur tour absolu
    const overallBestLap = valid.reduce(
      (best, v) =>
        v.bestLapTime > 0 && v.bestLapTime < best ? v.bestLapTime : best,
      Infinity,
    );

    return valid.map((v, idx) => ({
      position: v.position,
      prevPosition: v.qualification > 0 ? v.qualification : v.position,
      driverName: v.driverName || "Inconnu",
      team: v.fullTeamName || "",
      car: v.vehicleName || "Inconnue",
      carNumber: v.carNumber || "",
      carClass: mapCarClass(v.carClass) as StandingEntry["carClass"],
      laps: v.lapsCompleted ?? 0,
      gapToLeader: formatGap(v.timeBehindLeader, v.lapsBehindLeader),
      gapToNext: formatGap(v.timeBehindNext, v.lapsBehindNext),
      bestLap: formatLapTime(v.bestLapTime),
      lastLap: formatLapTime(v.lastLapTime),
      sector1:
        v.bestSectorTime1 > 0 ? v.bestSectorTime1.toFixed(3) : "—",
      sector2:
        v.bestSectorTime2 > 0 ? v.bestSectorTime2.toFixed(3) : "—",
      sector3: this.calculateSector3(v),
      inPit: v.pitting ?? false,
      status: mapFinishStatus(v.finishStatus),
      pitStops: v.pitstops ?? 0,
      isPole: v.bestLapTime > 0 && v.bestLapTime === overallBestLap,
      // Champs enrichis (optionnels)
      fuel: v.fuelFraction ?? 0,
      drsActive: v.drsActive ?? false,
      penalties: v.penalties ?? 0,
      steamID: v.steamID ?? 0,
    }));
  }

  /**
   * Calcule le secteur 3 à partir du meilleur tour moins S1 + S2.
   * rF2 ne fournit pas S3 directement dans l'API REST.
   */
  private calculateSector3(v: RF2Vehicle): string {
    if (v.bestLapTime > 0 && v.bestSectorTime1 > 0 && v.bestSectorTime2 > 0) {
      const s3 = v.bestLapTime - v.bestSectorTime2;
      if (s3 > 0) return s3.toFixed(3);
    }
    return "—";
  }
}
