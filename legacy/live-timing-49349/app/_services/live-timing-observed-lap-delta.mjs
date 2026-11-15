import { lapTimeMilliseconds } from "./live-timing-best-lap.mjs";

function validLapCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Tracks only completed laps observed by this browser session. It never derives
 * a comparison from bestLap or from a single initial snapshot.
 */
export function observeLastLapDeltas(previousState, standings, sourceId, sessionKey) {
  const sameSession = previousState?.sourceId === sourceId
    && previousState?.sessionKey === sessionKey;
  const previousEntries = sameSession ? previousState.entries : new Map();
  const entries = new Map();
  const deltas = new Map();

  for (const entry of standings) {
    const participantId = entry?.participantId;
    if (typeof participantId !== "string" || !participantId) continue;

    const previous = previousEntries.get(participantId);
    const currentLapMilliseconds = lapTimeMilliseconds(entry.lastLap);
    const currentLapCount = validLapCount(entry.laps);
    const countReset = previous
      && currentLapCount !== null
      && previous.laps !== null
      && currentLapCount < previous.laps;
    const baseline = !previous || countReset ? null : previous;

    let deltaSeconds = baseline?.deltaSeconds ?? null;
    const lapCountAdvanced = baseline
      && currentLapCount !== null
      && baseline.laps !== null
      && currentLapCount > baseline.laps;
    const lapTimeChanged = baseline
      && currentLapMilliseconds !== null
      && baseline.lapMilliseconds !== null
      && currentLapMilliseconds !== baseline.lapMilliseconds;
    const completedLapObserved = lapCountAdvanced || (lapTimeChanged && !countReset);

    if (
      completedLapObserved
      && currentLapMilliseconds !== null
      && baseline?.lapMilliseconds !== null
      && baseline?.lapMilliseconds !== undefined
    ) {
      deltaSeconds = (currentLapMilliseconds - baseline.lapMilliseconds) / 1000;
    }

    const nextLapMilliseconds = currentLapMilliseconds ?? baseline?.lapMilliseconds ?? null;
    const nextLapCount = currentLapMilliseconds === null
      ? baseline?.laps ?? currentLapCount
      : currentLapCount ?? baseline?.laps ?? null;

    entries.set(participantId, {
      lapMilliseconds: nextLapMilliseconds,
      laps: nextLapCount,
      deltaSeconds,
    });
    deltas.set(participantId, deltaSeconds);
  }

  return {
    state: { sourceId, sessionKey, entries },
    deltas,
  };
}

export function withObservedLapDeltas(standings, deltas) {
  return standings.map((entry) => {
    if (typeof entry.lastLapDeltaSeconds === "number" && Number.isFinite(entry.lastLapDeltaSeconds)) {
      return entry;
    }
    const delta = typeof entry.participantId === "string"
      ? deltas.get(entry.participantId)
      : null;
    return { ...entry, lastLapDeltaSeconds: delta ?? null };
  });
}
