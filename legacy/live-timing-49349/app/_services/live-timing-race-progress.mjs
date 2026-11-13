function isRaceSession(value) {
  if (typeof value !== "string") return false;
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(?:race|course)\b/.test(normalized);
}

export function raceProgress(server) {
  const totalLaps = Number.isInteger(server?.totalLaps) ? server.totalLaps : null;
  const lapsCompleted = Number.isInteger(server?.lapsCompleted) ? server.lapsCompleted : null;

  if (isRaceSession(server?.currentSession) && totalLaps !== null && totalLaps > 0) {
    const completed = lapsCompleted === null
      ? null
      : Math.min(Math.max(lapsCompleted, 0), totalLaps);
    return {
      mode: "laps",
      label: completed === null ? `Course aux tours · ${totalLaps} tours` : `${completed} / ${totalLaps} tours`,
      remaining: completed === null
        ? null
        : `${totalLaps - completed} tour${totalLaps - completed === 1 ? "" : "s"} restant${totalLaps - completed === 1 ? "" : "s"}`,
    };
  }

  const timeRemaining = typeof server?.timeRemaining === "string" ? server.timeRemaining.trim() : "";
  if (timeRemaining && !/^0{1,2}:0{2}:0{2}$/.test(timeRemaining)) {
    return { mode: "time", label: `${timeRemaining} restant`, remaining: null };
  }
  if (isRaceSession(server?.currentSession)) {
    return { mode: "time", label: "Temps écoulé", remaining: null };
  }
  return { mode: "unknown", label: "Progression indisponible", remaining: null };
}

export function carStatusBadge(status) {
  if (status === "dnf") return "DNF";
  if (status === "out") return "ABANDON";
  return null;
}
