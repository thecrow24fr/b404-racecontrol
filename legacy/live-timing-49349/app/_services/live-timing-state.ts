import type { LiveTimingData } from "../_types/live-timing";

/** Rafraîchit le contexte de session sans publier un nouveau classement non vérifié. */
export function mergeStandingsUnavailableSnapshot(
  snapshot: LiveTimingData,
  lastGoodData: LiveTimingData | null,
): LiveTimingData {
  return {
    ...snapshot,
    standings: lastGoodData?.standings ?? [],
  };
}

export function markLiveTimingUnavailable(data: LiveTimingData): LiveTimingData {
  return {
    ...data,
    server: { ...data.server, status: "degraded" },
    session: { ...data.session, serverReadyElapsed: null },
  };
}

export function isStandingsSnapshotUnavailable(data: Pick<LiveTimingData, "server" | "standings">): boolean {
  if (!Array.isArray(data.standings) || data.standings.length === 0) return true;
  if (data.server.standingsSource === "unavailable") return true;

  // A degraded Watch feed can still carry a complete, verified Shared Memory
  // fallback. Keep its rows current while preserving the degraded source badge.
  if (data.server.status === "degraded" && data.server.standingsSource === "shared_memory_scoring") {
    return false;
  }

  return data.server.status !== "online";
}

export function hasCurrentStandingsForMotion(data: Pick<LiveTimingData, "server" | "standings">): boolean {
  return !isStandingsSnapshotUnavailable(data);
}
