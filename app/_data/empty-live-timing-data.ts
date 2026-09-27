import type { LiveTimingData } from "../_types/live-timing";

/** État neutre avant la première réponse publique RaceControl. */
export const emptyLiveTimingData: LiveTimingData = {
  sourceId: "s20_vm",
  server: {
    id: "s20_vm",
    sourceId: "s20_vm",
    name: "S20",
    circuit: "Non disponible",
    category: "Inconnue",
    weather: {
      condition: "Non disponible",
      temperature: null,
      windSpeed: null,
      rainPercent: null,
      trackCondition: "unknown",
    },
    driversCount: null,
    maxDrivers: null,
    currentSession: "Non disponible",
    timeRemaining: "—",
    totalSessionTime: "—",
    lapsCompleted: null,
    totalLaps: null,
    lapDistance: null,
    status: "offline",
  },
  session: {
    phase: "waiting",
    sessionCode: undefined,
    inRealtime: false,
    serverTime: "—",
    trackTemp: null,
    airTemp: null,
    flags: [],
    elapsedTime: "—",
  },
  standings: [],
  records: {
    available: false,
    message: "Records en attente de la source Live Timing.",
    entries: [],
  },
  tyres: {
    available: false,
    message: "Données pneus en attente de la source Live Timing.",
    evolutionAvailable: false,
    entries: [],
  },
};
