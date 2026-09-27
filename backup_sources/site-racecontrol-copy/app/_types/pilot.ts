/**
 * Types pour le Profil Pilote — B404 RaceControl
 *
 * @module pilot
 */

export type BsrLicense = "Rookie" | "B" | "A";

export interface PilotRatings {
  ber: number;
  bsr: BsrLicense;
  bsrLabel: string;
  cri?: number;
}

export interface PilotBadge {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: "career" | "performance" | "community" | "special";
  tier: number;
  achievedAt: number;
  raceResultId?: string;
}

export interface PilotRaceResult {
  id: string;
  eventId: string;
  circuit: string;
  vehicle: string;
  position: number;
  gridPosition: number;
  totalLaps: number;
  raceTime: number;
  bestLapTime?: number;
  incidents: number;
  dnf: boolean;
  raceDate: number;
  championship?: string | null;
}

export interface PilotCareerStats {
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  totalDnf: number;
  totalLapsDriven: number;
  totalRaceHours: number;
  winRate: number;
  podiumRate: number;
  dnfRate: number;
  avgFinishPosition: number;
  bestFinish: number;
  worstFinish: number;
  currentStreak: number;
  topFavoriteCircuits: string[];
  topFavoriteVehicles: string[];
}

export interface RatingPoint {
  date: string;
  ber: number;
  bsr: string;
  berDelta: number | null;
  label?: string | null;
  eventId?: string | null;
}

export interface PilotProfile {
  id: string;
  displayName: string;
  steamId?: string | null;
  discordId?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  joinedAt: number;
  ber: number;
  bsr: BsrLicense;
  bsrLabel: string;
  cri?: number | null;
  totalRaces: number;
  totalWins: number;
  totalPodiums: number;
  totalPoles: number;
  totalBestLaps: number;
  totalDnf: number;
  totalIncidents: number;
  totalLapsDriven: number;
  totalRaceHours: number;
  lastRaceCircuit?: string | null;
  lastRacePosition?: number | null;
  lastRaceVehicle?: string | null;
}

export interface PilotDetailResponse {
  success: boolean;
  pilot: PilotProfile | null;
  recentResults: PilotRaceResult[];
  badges: PilotBadge[];
  error?: string;
}

export interface PilotSummary {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  ber: number;
  bsr: BsrLicense;
  totalRaces: number;
  totalWins: number;
}
