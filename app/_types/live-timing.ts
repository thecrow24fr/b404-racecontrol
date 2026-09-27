/** Contrat public du Live Timing RaceControl. */

export type SessionPhase =
  | "waiting"
  | "practice"
  | "qualifying"
  | "race"
  | "finished"
  | "paused";

export type ServerStatus =
  | "online"
  | "offline"
  | "starting"
  | "paused"
  | "stale"
  | "degraded";

export type FlagType =
  | "green"
  | "yellow"
  | "red"
  | "blue"
  | "chequered"
  | "white";

export type DriverStatus = "running" | "pit" | "out" | "finished" | "dnf";

export type CarCategory =
  | "GT3"
  | "Hypercar"
  | "LMP2"
  | "GT4"
  | "Porsche Cup"
  | "Multi-classe"
  | "Inconnue"
  | string;

export interface Weather {
  condition: string;
  temperature: number | null;
  windSpeed: number | null;
  rainPercent: number | null;
  trackCondition: "dry" | "damp" | "wet" | "unknown";
}

export interface Flag {
  type: FlagType;
  sector: number;
  reason?: string;
}

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
  /** Longueur de progression renvoyée par sessionInfo, en mètres. */
  lapDistance?: number | null;
  status: ServerStatus;
}

export interface StandingEntry {
  position: number;
  /** Position officielle de départ issue du champ native qualification. */
  startingPosition?: number | null;
  /** Alias historique conservé pour les fixtures/providers existants. */
  prevPosition: number;
  driverName: string;
  team: string;
  car: string;
  carNumber?: string;
  carClass: CarCategory;
  laps: number;
  gapToLeader: string;
  gapToNext: string;
  bestLap: string;
  lastLap: string;
  sector1: string;
  sector2: string;
  sector3: string | null;
  inPit: boolean;
  status: DriverStatus;
  pitStops: number;
  isPole?: boolean;
  /** Valeur native fuelFraction ; aucune conversion en litres ou en pourcentage. */
  fuelFraction?: number | null;
  /** Position longitudinale native, en mètres lorsque fournie. */
  lapDistance?: number | null;
  /** Dérivée uniquement lorsque lapDistance et la longueur source existent. */
  lapProgress?: number | null;
  drsActive?: boolean;
  penalties?: number;
  steamID?: number;
}

export interface SessionInfo {
  phase: SessionPhase;
  sessionCode?: string;
  inRealtime?: boolean;
  serverTime: string;
  trackTemp: number | null;
  airTemp: number | null;
  flags: Flag[];
  /** Temps restant de la session, dérivé du contrat endEventTime-currentEventTime. */
  sessionTimeRemaining?: string;
  /** Alias historique conservé pour les providers/fixtures existants. */
  elapsedTime: string;
}

export interface RecordEntry {
  session: string;
  driverName: string;
  car: string | null;
  bestLap: string;
  observedLaps: number | null;
}

export interface RecordsData {
  available: boolean;
  message: string;
  entries: RecordEntry[];
}

export interface TyreCorner {
  compound: string | null;
  wear: number | null;
  temperature: number | null;
  pressure: number | null;
}

export interface TyreEvolutionPoint {
  lap: number;
  frontLeft: TyreCorner | null;
  frontRight: TyreCorner | null;
  rearLeft: TyreCorner | null;
  rearRight: TyreCorner | null;
}

export interface TyreEntry {
  driverName: string;
  compound: string | null;
  corners: {
    frontLeft: TyreCorner;
    frontRight: TyreCorner;
    rearLeft: TyreCorner;
    rearRight: TyreCorner;
  };
  evolution: TyreEvolutionPoint[];
}

export interface TyresData {
  available: boolean;
  message: string;
  evolutionAvailable: boolean;
  entries: TyreEntry[];
}

export interface TelemetryPoint {
  minute: number;
  driverName: string;
  position: number;
  gapToLeader: number;
}

export interface LiveTimingData {
  /** Public durations are formatted once from native rFactor 2 seconds. */
  durationFormat?: "rFactor2-seconds-v1";
  fetchedAt?: string;
  sourceId?: string;
  server: ServerInfo;
  session: SessionInfo;
  standings: StandingEntry[];
  records?: RecordsData;
  tyres?: TyresData;
}
