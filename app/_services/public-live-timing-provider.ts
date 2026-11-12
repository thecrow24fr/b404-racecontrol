import {
  buildPublicLiveTimingApiUrl,
} from "./public-live-timing-api-url.mjs";
import type { LiveTimingData } from "../_types/live-timing";
import {
  assertViewerSafeSnapshot,
  isPublicLiveTimingSourceId,
} from "./public-live-timing-contract.mjs";

export const LIVE_TIMING_SOURCE_ID = "s20_vm";
const FETCH_TIMEOUT_MS = 8000;

export interface ViewerSnapshotResult {
  data: LiveTimingData;
  source: string;
  fetchedAt: string;
}

interface PublicApiEnvelope {
  success?: boolean;
  data?: unknown;
  error?: string;
}

interface PublicStreamStatus {
  success?: boolean;
  sourceStatus?: string;
  error?: string;
}

export function publicLiveTimingApiUrl(path: string): string {
  return buildPublicLiveTimingApiUrl(path, process.env.NEXT_PUBLIC_LIVE_TIMING_API_URL);
}

function toPublicError(code?: string): string {
  switch (code) {
    case "source_unavailable":
      return "Flux public Live Timing indisponible";
    case "standings_unavailable":
      return "Classement public indisponible";
    default:
      return "Flux public Live Timing en attente";
  }
}

function parseSnapshot(payload: PublicApiEnvelope): ViewerSnapshotResult {
  let data: LiveTimingData;
  try {
    data = assertViewerSafeSnapshot(payload) as LiveTimingData;
  } catch {
    throw new Error("Flux Viewer non conforme ; affichage suspendu");
  }
  if (!isPublicLiveTimingSourceId(data.server.sourceId ?? data.sourceId)) {
    throw new Error("Snapshot refusé : source publique S20 attendue");
  }
  return {
    data,
    source: LIVE_TIMING_SOURCE_ID,
    fetchedAt:
      typeof data.fetchedAt === "string" && Number.isFinite(Date.parse(data.fetchedAt))
        ? data.fetchedAt
        : new Date().toISOString(),
  };
}

export async function fetchPublicLiveTiming(
  serverId: number,
  callerSignal?: AbortSignal,
): Promise<ViewerSnapshotResult> {
  if (serverId !== 20) {
    throw new Error("Cette source Live Timing n’est pas publiée");
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await window.fetch(publicLiveTimingApiUrl(`/${LIVE_TIMING_SOURCE_ID}`), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    let payload: PublicApiEnvelope;
    try {
      payload = (await response.json()) as PublicApiEnvelope;
    } catch {
      throw new Error("Flux public Live Timing en attente");
    }
    if (!response.ok || payload.success !== true) {
      throw new Error(toPublicError(payload.error));
    }
    return parseSnapshot(payload);
  } finally {
    window.clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function openPublicLiveTimingStream(
  serverId: number,
  onSnapshot: (result: ViewerSnapshotResult) => void,
  onStatus: (error: string) => void,
): () => void {
  if (serverId !== 20) {
    onStatus("Cette source Live Timing n’est pas publiée");
    return () => undefined;
  }

  const stream = new EventSource(publicLiveTimingApiUrl(`/${LIVE_TIMING_SOURCE_ID}/stream`));
  const handleSnapshot = (event: Event) => {
    try {
      const payload = JSON.parse((event as MessageEvent<string>).data) as PublicApiEnvelope;
      onSnapshot(parseSnapshot(payload));
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Snapshot Viewer invalide");
    }
  };
  const handleStatus = (event: Event) => {
    try {
      const payload = JSON.parse((event as MessageEvent<string>).data) as PublicStreamStatus;
      onStatus(toPublicError(payload.error));
    } catch {
      onStatus("État du flux public illisible");
    }
  };

  stream.addEventListener("snapshot", handleSnapshot);
  stream.addEventListener("status", handleStatus);
  stream.onerror = () => onStatus("Reconnexion au flux public Live Timing…");

  return () => {
    stream.removeEventListener("snapshot", handleSnapshot);
    stream.removeEventListener("status", handleStatus);
    stream.close();
  };
}
