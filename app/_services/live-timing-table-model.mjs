function lapMilliseconds(value) {
  if (typeof value !== "string" || !value.trim() || /^[—-]$/.test(value.trim())) {
    return null;
  }
  const parts = value.trim().split(":");
  if (parts.length < 1 || parts.length > 3) return null;
  const seconds = Number(parts.pop());
  if (!Number.isFinite(seconds) || seconds < 0 || (parts.length > 0 && seconds >= 60)) {
    return null;
  }
  let total = seconds;
  if (parts.length > 0) {
    const minutes = Number(parts.pop());
    if (!Number.isInteger(minutes) || minutes < 0 || (parts.length > 0 && minutes >= 60)) {
      return null;
    }
    total += minutes * 60;
  }
  if (parts.length > 0) {
    const hours = Number(parts.pop());
    if (!Number.isInteger(hours) || hours < 0 || parts.length > 0) return null;
    total += hours * 3600;
  }
  return Math.round(total * 1000);
}

export function bestLapDriver(standings) {
  if (!Array.isArray(standings)) return null;
  let fastest = null;
  let fastestMs = Infinity;
  for (const entry of standings) {
    const lapMs = lapMilliseconds(entry?.bestLap);
    if (lapMs !== null && lapMs < fastestMs) {
      fastest = entry;
      fastestMs = lapMs;
    }
  }
  return fastest;
}

export function raceProgress(server) {
  const sessionName = typeof server?.currentSession === "string"
    ? server.currentSession.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    : "";
  const isRace = /\b(?:race|course)\b/.test(sessionName);
  const totalLaps = Number.isInteger(server?.totalLaps) ? server.totalLaps : null;
  const lapsCompleted = Number.isInteger(server?.lapsCompleted) ? server.lapsCompleted : null;
  if (isRace && totalLaps !== null && totalLaps > 0) {
    const completed = lapsCompleted === null ? null : Math.min(Math.max(lapsCompleted, 0), totalLaps);
    return {
      mode: "laps",
      label: completed === null ? `Course aux tours · ${totalLaps} tours` : `${completed} / ${totalLaps} tours`,
      remaining: completed === null ? null : `${totalLaps - completed} tours restantes`,
    };
  }

  const timeRemaining = typeof server?.timeRemaining === "string" ? server.timeRemaining.trim() : "";
  if (timeRemaining && !/^0{1,2}:0{2}:0{2}$/.test(timeRemaining)) {
    return { mode: "time", label: `${timeRemaining} restant`, remaining: null };
  }
  return { mode: "unknown", label: "Progression indisponible", remaining: null };
}

export function carNumberStatusBadge(status) {
  return status === "dnf" ? "DNF" : null;
}

export function positionDelta(previousPosition, currentPosition) {
  if (
    !Number.isInteger(previousPosition) ||
    previousPosition <= 0 ||
    !Number.isInteger(currentPosition) ||
    currentPosition <= 0 ||
    previousPosition === currentPosition
  ) {
    return { direction: "none", amount: 0 };
  }
  return previousPosition > currentPosition
    ? { direction: "gain", amount: previousPosition - currentPosition }
    : { direction: "loss", amount: currentPosition - previousPosition };
}
