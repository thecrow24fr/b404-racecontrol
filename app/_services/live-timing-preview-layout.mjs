const VERIFIED_PREVIEW_LAYOUTS = new Map([
  ["watkins glen boot", "WATKINS_GLEN_BOOT"],
]);

function normalizeExactCircuitName(value) {
  if (typeof value !== "string") return null;
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * The 3012 preview has one locally verified display-name/layout pair. Prefer
 * an identity supplied by the live source; never guess another layout.
 */
export function resolvePreviewTrackTechnicalId(circuit, upstreamTechnicalId) {
  if (typeof upstreamTechnicalId === "string" && upstreamTechnicalId.trim()) {
    return upstreamTechnicalId.trim();
  }

  const normalizedCircuit = normalizeExactCircuitName(circuit);
  return normalizedCircuit ? VERIFIED_PREVIEW_LAYOUTS.get(normalizedCircuit) ?? null : null;
}
