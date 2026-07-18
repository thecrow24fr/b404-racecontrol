/**
 * ServerOverview — Type pour la Vue d ensemble des serveurs
 *
 * B404 RaceControl
 *
 * Concu pour etre extensible : tous les champs futurs sont optionnels.
 * L UI n affiche un champ que si sa valeur est presente.
 *
 * @module server-overview
 */

/** Conditions meteorologiques */
export type WeatherCondition = "clear" | "cloudy" | "rain" | "fog" | "overcast";

/** Statut d un serveur */
export type ServerStatus = "online" | "offline" | "starting" | "paused";

/** Simulateur */
export type SimulatorId = "rf2" | "lmu" | "ac" | "acc" | "iracing";

/** Type de drapeau */
export type FlagType = "green" | "yellow" | "red" | "blue" | "chequered" | "white" | "fcy" | "sc";

/** Meteo */
export interface WeatherInfo {
  temperature: number;       // °C ambiant
  trackTemp: number;         // °C piste
  condition: WeatherCondition;
  rainPercent: number;       // 0-100
  windSpeed: number;         // km/h
}

/** Drapeau en cours */
export interface FlagInfo {
  type: FlagType;
  sector?: number;
  reason?: string;
}

/** Informations de session */
export interface SessionOverview {
  type: string;              // Practice, Qualifying, Race, Warmup
  timeRemaining: string;     // "12:34" ou "--:--"
  totalTime: string;         // duree totale
  lapsCompleted: number;
  totalLaps: number;
  bestLap: string;           // "2:15.432" ou "--:--.---"
}

/**
 * Vue d ensemble d un serveur pour la page /serveurs.
 * Tous les champs marques "futur" sont optionnels et n apparaissent
 * dans l UI que lorsque leur valeur est fournie.
 */
export interface ServerOverview {
  // ── Identite ──
  id: string;
  name: string;
  circuit: string;
  simulator: SimulatorId;     // "rf2" par defaut

  // ── Statut ──
  status: ServerStatus;

  // ── Session ──
  session: SessionOverview;

  // ── Pilotes ──
  drivers: number;
  maxDrivers: number;

  // ── Meteo ──
  weather: WeatherInfo;

  // ── Drapeaux ──
  flags: FlagInfo[];

  // ── Acces ──
  access: "public" | "private" | "password";
  hasPassword: boolean;

  // ═══════════════════════════════════════════════════════
  // FUTUR : champs optionnels qui apparaissent
  // automatiquement dans l UI quand ils sont renseignes.
  // Aucune modification du code necessaire pour les activer.
  // ═══════════════════════════════════════════════════════

  // ── Championnat (futur) ──
  championship?: string;
  championshipId?: string;

  // ── Spectateurs (futur) ──
  spectators?: number;

  // ── Progression (futur) ──
  progressPercent?: number;   // 0-100
  estimatedLaps?: number;

  // ── Incidents (futur) ──
  incidents?: number;
  safetyCar?: boolean;
  fullCourseYellow?: boolean;

  // ── Strategie (futur) ──
  averageFuel?: number;       // consommation moyenne
  tireWear?: number;          // usure moyenne 0-1
  tireCompound?: string;

  // ── IA / Analyse (futur) ──
  aiPredictedWinner?: string;
  aiPredictedPodium?: string[];
}
