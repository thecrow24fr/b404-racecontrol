const LAP_TIME_PATTERN = /^(?:(\d+):)?([0-5]?\d)\.(\d{3})$/;

function parseLapTimeMilliseconds(value) {
  if (typeof value !== "string") return null;
  const match = LAP_TIME_PATTERN.exec(value.trim());
  if (!match) return null;

  const minutes = Number(match[1] ?? 0);
  const seconds = Number(match[2]);
  const milliseconds = Number(match[3]);
  if (![minutes, seconds, milliseconds].every(Number.isSafeInteger)) return null;

  return minutes * 60_000 + seconds * 1_000 + milliseconds;
}

function formatLapTimeMilliseconds(milliseconds) {
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const remainder = milliseconds % 1_000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(remainder).padStart(3, "0")}`;
}

/**
 * Shows the server-calculated theoretical optimal when available. Until an old
 * Live Timing process is reloaded, it can safely derive the same value from the
 * three session-best individual sectors already present in the public DTO.
 */
export function optimalLapDisplay(apiOptimal, bestIndividualSectors) {
  const validApiOptimal = parseLapTimeMilliseconds(apiOptimal);
  if (validApiOptimal !== null) return apiOptimal.trim();
  if (!Array.isArray(bestIndividualSectors) || bestIndividualSectors.length !== 3) return null;

  const sectorMilliseconds = bestIndividualSectors.map(parseLapTimeMilliseconds);
  if (sectorMilliseconds.some((value) => value === null)) return null;

  return formatLapTimeMilliseconds(sectorMilliseconds.reduce((sum, value) => sum + value, 0));
}
