import type { ResultsViewerData } from "../_types/results-viewer";

export type ResultsViewerSourceId = "s1_vm" | "s20_vm";

export const RESULTS_VIEWER_SOURCE_ID: ResultsViewerSourceId = "s20_vm";

const API_BASE_URL = (process.env.NEXT_PUBLIC_RESULTS_API_URL ?? "").replace(/\/$/, "");
const FETCH_TIMEOUT_MS = 8000;

interface PublicResultsResponse {
  success?: boolean;
  data?: ResultsViewerData;
  error?: string;
}

function publicError(code: string | undefined): string {
  switch (code) {
    case "standings_unavailable":
      return "Classement source indisponible";
    case "source_unavailable":
      return "Source Results Viewer indisponible";
    default:
      return "Results Viewer indisponible";
  }
}

export class PublicResultsProvider {
  constructor(
    private readonly sourceId: ResultsViewerSourceId = RESULTS_VIEWER_SOURCE_ID,
  ) {}

  async fetch(): Promise<ResultsViewerData> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await window.fetch(
        `${API_BASE_URL}/api/public/results/${this.sourceId}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        },
      );

      let payload: PublicResultsResponse = {};
      try {
        payload = (await response.json()) as PublicResultsResponse;
      } catch {
        throw new Error("Results Viewer indisponible");
      }

      if (!response.ok || payload.success !== true || !payload.data) {
        throw new Error(publicError(payload.error));
      }

      return payload.data;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
}
