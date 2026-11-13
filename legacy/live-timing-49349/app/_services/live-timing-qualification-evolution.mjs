function validPosition(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * Evolves only from the native qualification reference and the current position
 * in one public Live snapshot. It never substitutes the current rank as grid.
 */
export function qualificationEvolution({ sessionPhase, startingPosition, currentPosition }) {
  if (sessionPhase !== "race") {
    return { kind: "unavailable", label: "—", delta: null };
  }

  const qualificationPosition = validPosition(startingPosition);
  const position = validPosition(currentPosition);
  if (qualificationPosition === null || position === null) {
    return { kind: "unavailable", label: "—", delta: null };
  }

  const delta = qualificationPosition - position;
  if (delta > 0) return { kind: "gain", label: `+${delta}`, delta };
  if (delta < 0) return { kind: "loss", label: `-${Math.abs(delta)}`, delta };
  return { kind: "neutral", label: "0", delta: 0 };
}
