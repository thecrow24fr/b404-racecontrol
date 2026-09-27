export type ResultsViewerPhase =
  | "waiting"
  | "practice"
  | "qualifying"
  | "race";

export type ResultSessionStatus = "current" | "observed";
export type ResultDriverStatus =
  | "running"
  | "pit"
  | "finished"
  | "dnf"
  | "observed";

export interface ResultDriverEntry {
  position: number | null;
  driverName: string;
  team: string | null;
  car: string | null;
  carNumber: string | null;
  laps: number | null;
  bestLap: string | null;
  lastLap: string | null;
  gapToLeader: string | null;
  status: ResultDriverStatus;
}

export interface ResultSession {
  id: string;
  code: string;
  name: string;
  phase: ResultsViewerPhase;
  status: ResultSessionStatus;
  circuit: string | null;
  serverName: string | null;
  eventName: string | null;
  observedAt: string;
  participants: number;
  entries: ResultDriverEntry[];
}

export interface ResultsViewerData {
  sourceId: string;
  sourceName: string;
  fetchedAt: string;
  currentSessionId: string | null;
  archive: {
    available: boolean;
    message: string;
  };
  sessions: ResultSession[];
}
