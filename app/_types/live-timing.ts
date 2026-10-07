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

/** État local minimal du processus météo; ne prouve pas sa connexion. */
export type WeatherClientStatus = "launched";

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
  /** Longueur canonique du catalogue Manager, en mètres, si la résolution est unique. */
  trackLength?: number | null;
  /** Source de la longueur canonique (par exemple GDB ou AIW). */
  trackLengthSource?: string | null;
  /** Identité exacte du layout résolue par Manager, utilisée pour charger l’AIW. */
  trackTechnicalId?: string | null;
  /** Longueur runtime renvoyée par sessionInfo, en mètres. */
  lapDistance?: number | null;
  /** Route native réellement utilisée pour le classement courant. */
  standingsSource?: "standings" | "standings/history" | "shared_memory_scoring" | "unavailable";
  /** Cause explicite si le classement est absent; ne contient aucun identifiant natif. */
  standingsUnavailableReason?: string | null;
  status: ServerStatus;
}

export interface TyreHistoryEntry {
  lap: number;
  sessionSeconds: number;
  /** Temps au tour public réellement observé avec cet échantillon. */
  lapTime: string;
  relay: number;
  pitOrTyreChange: boolean;
  frontTyreCompound: string;
  rearTyreCompound: string;
  wearFrontLeft: number;
  wearFrontRight: number;
  wearRearLeft: number;
  wearRearRight: number;
}

export interface StandingEntry {
  position: number;
  /** Identifiant public opaque, stable pendant une session pour confirmer une paire. */
  participantId?: string;
  /** Position officielle de départ issue du champ native qualification. */
  startingPosition?: number | null;
  /** Alias historique conservé pour les fixtures/providers existants. */
  prevPosition: number;
  driverName: string;
  /** Participant class, published only when proven by native mControl. */
  driverType?: "human" | "ai";
  team: string;
  car: string;
  carNumber?: string;
  carClass: CarCategory | null;
  laps: number;
  gapToLeader: string;
  gapToNext: string;
  /** Écart natif numérique vers la voiture classée juste devant, en secondes. */
  timeBehindNext?: number | null;
  /** Identifiant public opaque de la voiture correspondant à timeBehindNext. */
  nextParticipantId?: string | null;
  bestLap: string;
  lastLap: string;
  /** Maximum observé dans la session depuis Vehicle.carVelocity, converti de m/s en km/h. */
  maxSpeedKmh?: number | null;
  /** Secteurs du dernier tour; S3 est le résidu contrôlé lorsque le dernier tour et S1/S2 sont cohérents. */
  sector1: string;
  sector2: string;
  sector3: string | null;
  inPit: boolean;
  /** État individuel explicite sous drapeau jaune, lorsque la source le fournit. */
  underYellow?: boolean | null;
  status: DriverStatus;
  pitStops: number;
  isPole?: boolean;
  /** Litres de carburant provenant de la paire native Shared Memory vérifiée. */
  fuelLiters?: number | null;
  /** Capacité native en litres du même participant, requise pour la jauge/% . */
  fuelCapacityLiters?: number | null;
  /** Fraction calculée exclusivement mFuel/mFuelCapacity après jointure vérifiée. */
  fuelFraction?: number | null;
  /** Composé natif de l’essieu avant, absent de la Swagger Watch actuelle. */
  frontTyreCompound?: string | null;
  /** Composé natif de l’essieu arrière, absent de la Swagger Watch actuelle. */
  rearTyreCompound?: string | null;
  /** Mesures natives d’usure par roue, absentes de la Swagger Watch actuelle. */
  wearFrontLeft?: number | null;
  wearFrontRight?: number | null;
  wearRearLeft?: number | null;
  wearRearRight?: number | null;
  /** Journal collecté après démarrage du preview, jamais rétroactif. */
  tyreHistory?: TyreHistoryEntry[];
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
  /** Uptime du Dedicated fourni explicitement par la source; absent sinon. */
  serverUptime?: string | null;
  /** Présence locale de rf2WeatherClient.exe; ne signifie pas « connecté ». */
  weatherClientStatus?: WeatherClientStatus | null;
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
