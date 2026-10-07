function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function isVerifiedGeometryPayload(payload, technicalId) {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.geometry)) return false;
  const geometry = payload.geometry;
  const lapLength = Number(geometry.lapLength);
  if (
    geometry.technicalId !== technicalId
    || typeof geometry.viewBox !== "string"
    || !Number.isFinite(lapLength)
    || lapLength <= 0
    || !Array.isArray(geometry.points)
  ) return false;

  const validPointCount = geometry.points.filter((point) => (
    isRecord(point)
    && Number.isFinite(Number(point.x))
    && Number.isFinite(Number(point.y))
    && Number.isFinite(Number(point.distance))
  )).length;
  return validPointCount >= 3;
}

/** API-first geometry fetch with an exact-ID static artifact fallback. */
export async function fetchTrackGeometryPayload(apiUrl, technicalId, fetchImpl = globalThis.fetch) {
  const id = typeof technicalId === "string" ? technicalId.trim() : "";
  if (!id || typeof fetchImpl !== "function") return null;

  const candidates = [
    { url: apiUrl, cache: "no-store" },
    { url: `/track-geometry/${encodeURIComponent(id)}.json`, cache: "force-cache" },
  ].filter((candidate) => typeof candidate.url === "string" && candidate.url.length > 0);

  for (const candidate of candidates) {
    try {
      const response = await fetchImpl(candidate.url, {
        cache: candidate.cache,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      if (isVerifiedGeometryPayload(payload, id)) return payload;
    } catch {
      // The next source may be the verified static geometry artifact.
    }
  }

  return null;
}
