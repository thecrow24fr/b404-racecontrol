const MAX_ROWS_PER_PARTICIPANT = 500;
const CORNERS = ["wearFrontLeft", "wearFrontRight", "wearRearLeft", "wearRearRight"];
const RESET_GAIN_POINTS = 10;

function valid(row) {
  return row && typeof row.participantId === "string" && Number.isInteger(row.lap) && row.lap >= 0 && typeof row.sessionSeconds === "number" && Number.isFinite(row.sessionSeconds) && CORNERS.every((key) => typeof row[key] === "number" && Number.isFinite(row[key]));
}

function tyreReset(previous, next) {
  return CORNERS.every((key) => next[key] >= previous[key] + RESET_GAIN_POINTS);
}

function isChange(previous, next) {
  return Boolean(previous) && (next.frontTyreCompound !== previous.frontTyreCompound || next.rearTyreCompound !== previous.rearTyreCompound || tyreReset(previous, next));
}

export function createTyreHistoryStore() {
  const sessions = new Map();
  return {
    record(sessionKey, row) {
      if (!valid(row)) return;
      let drivers = sessions.get(sessionKey); if (!drivers) sessions.set(sessionKey, drivers = new Map());
      const rows = drivers.get(row.participantId) ?? [];
      const previous = rows.at(-1);
      const changed = isChange(previous, row);
      const entry = { ...row, relay: previous ? previous.relay + (changed ? 1 : 0) : 1, pitOrTyreChange: changed };
      if (previous?.lap === row.lap) {
        // Même tour : remplacer uniquement si le nouveau snapshot prouve l'arrêt/changement postérieur.
        if (changed || (previous.inPit !== true && row.inPit === true)) rows[rows.length - 1] = entry;
        return;
      }
      rows.push(entry);
      if (rows.length > MAX_ROWS_PER_PARTICIPANT) rows.splice(0, rows.length - MAX_ROWS_PER_PARTICIPANT);
      drivers.set(row.participantId, rows);
    },
    history(sessionKey, participantId) { return [...(sessions.get(sessionKey)?.get(participantId) ?? [])]; },
  };
}
