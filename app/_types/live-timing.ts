/**
 * Types pour le Live Timing Premium — B404 RaceControl
 *
 * Ces types définissent l'ensemble des structures de données utilisées
 * par la page Live Timing. Ils sont conçus pour être compatibles avec
 * les futures données réelles provenant de R2LA.
 *
 * @module live-timing
 */

// ─── Énumérations ─────────────────────────────────────────────────────

/** Phase de session en cours */
export type SessionPhase =
  | "waiting"
  | "practice"
  | "qualifying"
  | "race"
  | "finished"
  | "paused";

/** Statut d'un serveur (étend le StatusType existant) */
export type ServerStatus = "online" | "offline" | "starting" | "paused" | "stale" | "degraded";

/** Type de drapeau affiché en piste */
export type FlagType =
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "chequered"
  | "white";

/** Statut d'un pilote dans le classement */
export type DriverStatus =
  | "running"
  | "pit"
  | "out"
  | "finished"
  | "dnf";

/** Catégorie de voiture */
export type CarCategory = string;

// ─── Interfaces ───────────────────────────────────────────────────────

/** Informations météo */
export interface Weather {
  condition: string;
  temperature: number | null;
  windSpeed: number | null;
  rainPercent: number | null;
  /** Piste sèche / humide / mouillée */
  trackCondition: "dry" | "damp" | "wet" | "unknown";
}

/** Information d'un drapeau */
export interface Flag {
  type: FlagType;
  sector: number;
  reason?: string;
}

/** Informations générales du serveur de course */
export interface ServerInfo {
  id: string;
  sourceId?: string;
  name: string;
  circuit: string;
  category: CarCategory;
  weather: Weather;
  driversCount: number | null;
  maxDrivers: number | null;
  currentSession: string;
  timeRemaining: string;
  totalSessionTime: string;
  lapsCompleted: number | null;
  totalLaps: number | null;
  status: ServerStatus;
}

/** Une entrée du classement (un pilote) */
export interface StandingEntry {
  position: number;
  participantId?: string;
  startingPosition?: number | null;
  prevPosition: number;
  driverName: string;
  team: string;
  car: string;
  /** Numéro de la voiture (disponible via API rF2) */
  carNumber?: string;
  carClass: CarCategory | null;
  laps: number;
  /** Écart au leader ("Leader" pour le premier) */
  gapToLeader: string;
  /** Écart au pilote précédent */
  gapToNext: string;
  timeBehindNext?: number | null;
  bestLap: string;
  lastLap: string;
  bestLapSector1?: string | null;
  bestLapSector2?: string | null;
  bestLapSector3?: string | null;
  lastLapSector1?: string | null;
  lastLapSector2?: string | null;
  lastLapSector3?: string | null;
  sector1: string;
  sector2: string;
  sector3: string | null;
  optimalLap?: string | null;
  maxSpeedKmh?: number | null;
  frontTyreCompound?: string | null;
  rearTyreCompound?: string | null;
  fuelFraction?: number | null;
  inPit: boolean;
  status: DriverStatus;
  /** Nombre d'arrêts au stand */
  pitStops: number;
  /** Meilleur tour absolu de la course */
  isPole?: boolean;
  /** Carburant restant (0.0 → 1.0) */
  fuel?: number;
  /** DRS actif */
  drsActive?: boolean;
  /** Nombre de pénalités */
  penalties?: number;
  /** Identifiant Steam */
  steamID?: number;
}

/** Informations globales de la session */
export interface SessionInfo {
  phase: SessionPhase;
  serverTime: string;
  trackTemp: number | null;
  airTemp: number | null;
  flags: Flag[];
  elapsedTime: string;
}

/** Point de donnée de télémétrie minute par minute (préparé pour futur usage) */
export interface TelemetryPoint {
  minute: number;
  driverName: string;
  position: number;
  gapToLeader: number;
}

// ─── Conteneur principal ──────────────────────────────────────────────

/** Données complètes du Live Timing pour un serveur */
export interface LiveTimingData {
  sourceId?: string;
  fetchedAt?: string;
  server: ServerInfo;
  session: SessionInfo;
  standings: StandingEntry[];
}
