function parseElapsedSeconds(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text === "—" || text === "Non disponible") return null;
  const parts = text.split(":").map(Number);
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return null;
  const seconds = parts.at(-1);
  const minutes = parts.at(-2);
  if (seconds > 59 || (parts.length === 3 && minutes > 59)) return null;
  return parts.length === 3
    ? parts[0] * 3600 + minutes * 60 + seconds
    : minutes * 60 + seconds;
}

/** Captures one integer snapshot as a stable local elapsed-clock origin. */
export function hasElapsedClockGenerationChanged(previousGeneration, nextGeneration) {
  return Number.isSafeInteger(previousGeneration)
    && Number.isSafeInteger(nextGeneration)
    && previousGeneration !== nextGeneration;
}

export function createElapsedClockAnchor(value, snapshotReceivedAt) {
  const baseSeconds = parseElapsedSeconds(value);
  if (baseSeconds === null || !Number.isFinite(snapshotReceivedAt)) return null;
  return { baseSeconds, anchoredAt: snapshotReceivedAt };
}

/**
 * @param {{ baseSeconds: number, anchoredAt: number } | null} [anchor=null]
 */
export function projectElapsedSeconds(value, snapshotReceivedAt, now, anchor = null) {
  const snapshotAnchor = anchor ?? createElapsedClockAnchor(value, snapshotReceivedAt);
  if (
    !snapshotAnchor
    || !Number.isFinite(snapshotAnchor.baseSeconds)
    || !Number.isFinite(snapshotAnchor.anchoredAt)
    || !Number.isFinite(now)
  ) {
    return null;
  }
  return snapshotAnchor.baseSeconds
    + Math.floor(Math.max(0, now - snapshotAnchor.anchoredAt) / 1000);
}
