import { lapTimeMilliseconds } from "./live-timing-best-lap.mjs";

function officialPosition(entry) {
  return Number.isInteger(entry?.position) && entry.position > 0
    ? entry.position
    : Number.POSITIVE_INFINITY;
}

/**
 * Returns a new display order without changing official positions or entries.
 * Practice sessions rank valid best laps first; races retain rFactor 2 order.
 */
export function orderStandingsForPhase(standings, sessionPhase) {
  const ordered = [...standings];
  if (sessionPhase !== "practice") {
    return ordered.sort((left, right) => officialPosition(left) - officialPosition(right));
  }
  return ordered.sort((left, right) => {
    const leftLap = lapTimeMilliseconds(left?.bestLap);
    const rightLap = lapTimeMilliseconds(right?.bestLap);
    if (leftLap !== null && rightLap !== null) return leftLap - rightLap;
    if (leftLap !== null) return -1;
    if (rightLap !== null) return 1;
    return officialPosition(left) - officialPosition(right);
  });
}
