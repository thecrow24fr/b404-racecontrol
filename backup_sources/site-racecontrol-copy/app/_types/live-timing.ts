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
export type ServerStatus = "online" | "offline" | "starting" | "paused";

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
export type CarCategory = "GT3" | "Hypercar" | "LMP2" | "GT4" | "Porsche Cup";

// ─── Interfaces ───────────────────────────────────────────────────────

/** Informations météo */
export interface Weather {
  condition: string;
  temperature: number;
  windSpeed: number;
  rainPercent: number;
  /** Piste sèche / humide / mouillée */
  trackCondition: "dry" | "damp" | "wet";
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
  name: string;
  circuit: string;
  category: CarCategory;
  weather: Weather;
  driversCount: number;
  maxDrivers: number;
  currentSession: string;
  timeRemaining: string;
  totalSessionTime: string;
  lapsCompleted: number;
  totalLaps: number;
  status: ServerStatus;
}

/** Une entrée du classement (un pilote) */
export interface StandingEntry {
  position: number;
  prevPosition: number;
  driverName: string;
  team: string;
  car: string;
  /** Numéro de la voiture (disponible via API rF2) */
  carNumber?: string;
  carClass: CarCategory;
  laps: number;
  /** Écart au leader ("Leader" pour le premier) */
  gapToLeader: string;
  /** Écart au pilote précédent */
  gapToNext: string;
  bestLap: string;
  lastLap: string;
  sector1: string;
  sector2: string;
  sector3: string;
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
  trackTemp: number;
  airTemp: number;
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
  server: ServerInfo;
  session: SessionInfo;
  standings: StandingEntry[];
}
