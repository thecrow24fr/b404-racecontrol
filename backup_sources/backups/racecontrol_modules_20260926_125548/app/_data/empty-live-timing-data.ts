import type { LiveTimingData } from "../_types/live-timing";

/**
 * État neutre affiché avant la première réponse de l'API publique.
 * Aucun pilote ou temps fictif n'est injecté dans la page réelle.
 */
export const emptyLiveTimingData: LiveTimingData = {
  server: {
    id: "s1_vm",
    sourceId: "s1_vm",
    name: "S1 VM",
    circuit: "Non disponible",
    category: "Inconnue",
    weather: {
      condition: "Non disponible",
      temperature: 0,
      windSpeed: 0,
      rainPercent: 0,
      trackCondition: "dry",
    },
    driversCount: 0,
    maxDrivers: 0,
    currentSession: "Non disponible",
    timeRemaining: "—",
    totalSessionTime: "—",
    lapsCompleted: 0,
    totalLaps: 0,
    status: "offline",
  },
  session: {
    phase: "waiting",
    sessionCode: undefined,
    inRealtime: false,
    serverTime: "—",
    trackTemp: 0,
    airTemp: 0,
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
