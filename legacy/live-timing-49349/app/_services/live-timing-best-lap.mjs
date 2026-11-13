export function lapTimeMilliseconds(value) {
  const match = /^(\d+):(\d{2}\.\d{3})$/.exec(value);
  if (!match) return null;
  const milliseconds = Math.round((Number(match[1]) * 60 + Number(match[2])) * 1000);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : null;
}

/**
 * Selects the best valid lap from one immutable Live snapshot. The returned
 * entry supplies both the displayed time and driver, preventing mixed pairs.
 */
export function bestLapEntry(standings) {
  let best = null;
  for (const entry of standings) {
    const milliseconds = lapTimeMilliseconds(entry?.bestLap);
    if (milliseconds === null) continue;
    if (best === null || milliseconds < best.milliseconds) {
      best = { entry, milliseconds };
    }
  }
  return best;
}
