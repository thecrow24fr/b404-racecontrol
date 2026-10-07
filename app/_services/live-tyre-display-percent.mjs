export function formatTyrePercent(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) return "N/D";
  return `${Math.round(value)} %`;
}

/** @param {{ status: "online" | "offline" | "starting" | "paused" | "stale" | "degraded"; standingsSource?: string; driversCount: number | null; standingsCount: number; error?: string | null }} state
 * @returns {{ status: "online" | "offline" | "starting" | "paused" | "stale" | "degraded"; notice: string | null }}
 */
export function liveTimingHealthPresentation({ status, standingsSource, driversCount, standingsCount, error = null }) {
  const completeNativeFallback =
    (status === "online" || status === "degraded") &&
    standingsSource === "shared_memory_scoring" &&
    Number.isInteger(driversCount) &&
    driversCount > 0 &&
    standingsCount === driversCount;
  if (!completeNativeFallback) return { status, notice: null };
  return {
    status: error ? "degraded" : "online",
    notice: "Classement natif complet (Shared Memory) — source standings indisponible.",
  };
}
