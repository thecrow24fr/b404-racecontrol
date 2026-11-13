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
  /** Cause d’absence du classement ou avertissement si le fallback validé Shared Memory est utilisé. */
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

export interface LapHistoryEntry {
  lap: number;
  position: number | null;
  status: "completed" | "incomplete";
  lapTime: string | null;
  sector1: string | null;
  sector2: string | null;
  sector3: string | null;
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
  /** Somme des meilleurs secteurs individuels observés dans la session; pas nécessairement un tour réel. */
  optimalLap?: string | null;
  lastLap: string;
  /** Dernier tour moins tour précédent du même pilote, en secondes; négatif = gain. */
  lastLapDeltaSeconds?: number | null;
  /** Secteurs du tour associé à bestLap, reconstruits uniquement si cohérents. */
  bestLapSector1?: string | null;
  bestLapSector2?: string | null;
  bestLapSector3?: string | null;
  /** Secteurs du dernier tour terminé, reconstruits depuis les bornes cumulatives cohérentes. */
  lastLapSector1?: string | null;
  lastLapSector2?: string | null;
  lastLapSector3?: string | null;
  /** Secteurs visibles : dernier tour pendant S1, puis secteurs validés du nouveau tour. */
  progressiveSector1?: string | null;
  progressiveSector2?: string | null;
  progressiveSector3?: string | null;
  /** Maximum observé dans la session depuis Watch carVelocity ou Shared Memory mLocalVel, en km/h. */
  maxSpeedKmh?: number | null;
  /** Moyenne pondérée sur les tours complets chronométrés présents dans l’historique Watch, en km/h. */
  averageSpeedKmh?: number | null;
  /** Nombre de tours complets chronométrés utilisés pour averageSpeedKmh. */
  averageSpeedLapCount?: number | null;
  /** Meilleurs secteurs individuels observés sur des tours complets, potentiellement différents. */
  sector1: string;
  sector2: string;
  sector3: string | null;
  inPit: boolean;
  /** Durée courante ou dernier arrêt, mesurée en mémoire serveur pendant une course. */
  pitStopDurationSeconds?: number | null;
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
  /** Rempli uniquement par la route d’historique demandée pour ce pilote. */
  lapHistory?: LapHistoryEntry[];
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
  /** Durée depuis le passage du Dedicated à En ligne, observé via son API native. */
  serverReadyElapsed?: string | null;
  /** Génération opaque du processus Dedicated ; change uniquement à un nouveau PID. */
  serverReadyGeneration?: number | null;
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
