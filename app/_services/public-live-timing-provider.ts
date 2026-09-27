import type { IDataProvider, ProviderResult } from "./data-provider";
import type { LiveTimingData } from "../_types/live-timing";

export type LiveTimingSourceId = "s1_vm" | "s20_vm";

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

function isSourceId(value: string): value is LiveTimingSourceId {
  return value === "s1_vm" || value === "s20_vm";
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
  const response = await window.fetch(`${API_PATH}/sources`, {
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
        sourceId: LiveTimingSourceId;
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
      const response = await window.fetch(`${API_PATH}/${this.sourceId}`, {
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
    const eventSource = new EventSource(`${API_PATH}/${this.sourceId}/stream`);

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
