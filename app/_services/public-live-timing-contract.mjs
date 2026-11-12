const PUBLIC_SOURCE_ID = "s20_vm";
const PRIVATE_VIEWER_FIELDS = ["pitStopDurationSeconds"];

export function isPublicLiveTimingSourceId(sourceId) {
  return sourceId === PUBLIC_SOURCE_ID;
}

/**
 * Validates the envelope used by the public Viewer API. It fails closed rather
 * than attempting to hide streamer-only data in browser code; redaction must
 * already have happened on the server.
 */
export function assertViewerSafeSnapshot(payload) {
  if (!payload || typeof payload !== "object" || payload.success !== true) {
    throw new Error("Snapshot Viewer illisible");
  }

  const data = payload.data;
  if (
    !data ||
    typeof data !== "object" ||
    !isPublicLiveTimingSourceId(data.sourceId)
  ) {
    throw new Error("Snapshot refusé : source publique S20 attendue");
  }
  if (
    !data.server ||
    typeof data.server !== "object" ||
    !data.session ||
    typeof data.session !== "object" ||
    !Array.isArray(data.standings)
  ) {
    throw new Error("Snapshot Viewer incomplet");
  }

  for (const standing of data.standings) {
    if (!standing || typeof standing !== "object") {
      throw new Error("Classement Viewer invalide");
    }
    for (const field of PRIVATE_VIEWER_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(standing, field)) {
        throw new Error(`Le snapshot Viewer contient le champ privé réservé au streamer : ${field}`);
      }
    }
  }

  return data;
}
