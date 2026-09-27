import type { IDataProvider, ProviderResult } from "./data-provider";
import type { LiveTimingData } from "../_types/live-timing";

export type LiveTimingSourceId = "s1_vm" | "s20_vm";

export const LIVE_TIMING_SOURCE_ID: LiveTimingSourceId = "s20_vm";

const API_BASE_URL = (process.env.NEXT_PUBLIC_LIVE_TIMING_API_URL ?? "").replace(/\/$/, "");
const FETCH_TIMEOUT = 8000;

interface PublicApiResponse {
  success?: boolean;
  data?: LiveTimingData;
  error?: string;
}

function toPublicError(code: string | undefined): string {
  switch (code) {
    case "standings_unavailable":
      return "Classement rFactor 2 indisponible";
    case "source_unavailable":
      return "Source Live Timing indisponible";
    default:
      return "Live Timing indisponible";
  }
}

/**
 * Provider navigateur : il ne connaît que la route publique RaceControl.
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
      const response = await window.fetch(
        `${API_BASE_URL}/api/public/live-timing/${this.sourceId}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        },
      );

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
}
