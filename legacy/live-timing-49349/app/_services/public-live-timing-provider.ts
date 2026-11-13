import type { IDataProvider, ProviderResult } from "./data-provider";
import type { LapHistoryEntry, LiveTimingData } from "../_types/live-timing";

export type LiveTimingSourceId = string;

export interface LiveTimingSourceOption {
  sourceId: LiveTimingSourceId;
  serverNumber: number | null;
  circuit: string | null;
  label: string;
  description: string;
}

export const LIVE_TIMING_SOURCE_ID: LiveTimingSourceId = "s20_vm";

const API_BASE_URL = (process.env.NEXT_PUBLIC_LIVE_TIMING_API_URL ?? "").replace(/\/$/, "");
const API_PATH = `${API_BASE_URL}/api/public/live-timing`;
const FETCH_TIMEOUT = 8000;

export function publicLiveTimingApiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_PATH}${suffix}`;
}

interface PublicApiResponse {
  success?: boolean;
  data?: LiveTimingData;
  error?: string;
}

interface PublicSourcesResponse {
  success?: boolean;
  sources?: Array<{
    sourceId?: string;
    serverNumber?: number | null;
    circuit?: string | null;
    label?: string;
    description?: string;
  }>;
  error?: string;
}

interface PublicStreamStatus {
  success?: boolean;
  sourceStatus?: string;
  error?: string;
}

function isSourceId(value: string): boolean {
  return /^s[1-9]\d*_vm$/.test(value);
}

function toPublicError(code: string | undefined): string {
  switch (code) {
    case "standings_unavailable":
      return "Classement rFactor 2 indisponible";
    case "source_unavailable":
      return "Source Live Timing indisponible";
    case "stream_disconnected":
      return "Flux Live Timing reconnecté…";
    default:
      return "Live Timing indisponible";
  }
}

export async function fetchLiveTimingSources(): Promise<LiveTimingSourceOption[]> {
  const response = await window.fetch(publicLiveTimingApiUrl("/sources"), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  let payload: PublicSourcesResponse = {};
  try {
    payload = (await response.json()) as PublicSourcesResponse;
  } catch {
    throw new Error("Configuration des serveurs Live indisponible");
  }
  if (!response.ok || payload.success !== true || !Array.isArray(payload.sources)) {
    throw new Error("Configuration des serveurs Live indisponible");
  }
  return payload.sources
    .filter(
      (source): source is {
        sourceId: string;
        serverNumber?: number | null;
        circuit?: string | null;
        label?: string;
        description?: string;
      } =>
        typeof source.sourceId === "string" &&
        isSourceId(source.sourceId),
    )
    .map((source) => ({
      sourceId: source.sourceId,
      serverNumber:
        typeof source.serverNumber === "number" && Number.isFinite(source.serverNumber)
          ? source.serverNumber
          : null,
      circuit:
        typeof source.circuit === "string" && source.circuit.trim()
          ? source.circuit.trim()
          : null,
      label:
        typeof source.label === "string" && source.label.trim()
          ? source.label
          : `Serveur ${source.serverNumber ?? source.sourceId}`,
      description:
        typeof source.description === "string"
          ? source.description
          : "Source Live Timing configurée",
    }));
}

/**
 * Provider navigateur : il ne connaît que les routes publiques RaceControl.
 * L'origine et le port rFactor 2 restent exclusivement côté serveur.
 */
interface PublicLapHistoryResponse {
  success?: boolean;
  sourceId?: string;
  participantId?: string;
  laps?: LapHistoryEntry[];
  error?: string;
}

export async function fetchLiveTimingLapHistory(
  sourceId: LiveTimingSourceId,
  participantId: string,
  signal?: AbortSignal,
): Promise<LapHistoryEntry[]> {
  if (!isSourceId(sourceId) || !/^p[a-z0-9]{7}$/.test(participantId)) {
    throw new Error("Pilote ou serveur incorrect");
  }

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await window.fetch(
      publicLiveTimingApiUrl(`/${sourceId}/lap-history/${participantId}`),
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      },
    );
    let payload: PublicLapHistoryResponse = {};
    try {
      payload = (await response.json()) as PublicLapHistoryResponse;
    } catch {
      throw new Error("Historique des tours illisible");
    }
    if (!response.ok || payload.success !== true || !Array.isArray(payload.laps)) {
      throw new Error(
        payload.error === "participant_not_found"
          ? "Pilote introuvable dans la session"
          : "Historique des tours indisponible",
      );
    }
    return payload.laps;
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export class PublicLiveTimingProvider implements IDataProvider {
  readonly name = "RaceControl Live Timing";

  constructor(private readonly sourceId: LiveTimingSourceId = LIVE_TIMING_SOURCE_ID) {}

  /** La route publique porte elle-même la preuve de disponibilité. */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async fetch(): Promise<ProviderResult> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await window.fetch(publicLiveTimingApiUrl(`/${this.sourceId}`), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      let payload: PublicApiResponse = {};
      try {
        payload = (await response.json()) as PublicApiResponse;
      } catch {
        throw new Error("Live Timing indisponible");
      }

      if (!response.ok || payload.success !== true || !payload.data) {
        throw new Error(toPublicError(payload.error));
      }

      return {
        data: payload.data,
        source: this.sourceId,
        fetchedAt: payload.data.fetchedAt ?? new Date().toISOString(),
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /**
   * Ouvre le flux SSE RaceControl. EventSource reconnecte automatiquement si
   * le listener local ou l'adaptateur source connaît une interruption.
   */
  openStream(
    onSnapshot: (result: ProviderResult) => void,
    onStatus: (status: { error: string; sourceStatus?: string }) => void,
  ): () => void {
    const eventSource = new EventSource(publicLiveTimingApiUrl(`/${this.sourceId}/stream`));

    const handleSnapshot = (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as PublicApiResponse & {
          sourceId?: string;
        };
        if (payload.success !== true || !payload.data) {
          onStatus({ error: toPublicError(payload.error) });
          return;
        }
        onSnapshot({
          data: payload.data,
          source: payload.sourceId ?? this.sourceId,
          fetchedAt: payload.data.fetchedAt ?? new Date().toISOString(),
        });
      } catch {
        onStatus({ error: "Flux Live Timing invalide" });
      }
    };

    const handleStatus = (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as PublicStreamStatus;
        onStatus({
          error: toPublicError(payload.error),
          sourceStatus: payload.sourceStatus,
        });
      } catch {
        onStatus({ error: "Source Live Timing indisponible" });
      }
    };

    eventSource.addEventListener("snapshot", handleSnapshot);
    eventSource.addEventListener("status", handleStatus);
    eventSource.onerror = () => {
      onStatus({ error: toPublicError("stream_disconnected") });
    };

    return () => {
      eventSource.removeEventListener("snapshot", handleSnapshot);
      eventSource.removeEventListener("status", handleStatus);
      eventSource.close();
    };
  }
}
