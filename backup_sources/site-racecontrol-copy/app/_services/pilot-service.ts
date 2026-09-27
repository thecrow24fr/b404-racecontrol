/**
 * PilotService — Appels API vers le Merge Engine pour les profils pilotes.
 *
 * B404 RaceControl
 */

import type {
  PilotDetailResponse,
  PilotRaceResult,
  PilotBadge,
  PilotCareerStats,
  RatingPoint,
  PilotSummary,
} from "../_types/pilot";

const MERGE_ENGINE_URL =
  process.env.NEXT_PUBLIC_MERGE_ENGINE_URL ?? "http://localhost:3002";

const FETCH_TIMEOUT = 10_000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

/** Profil complet d'un pilote */
export async function fetchPilotProfile(
  pilotId: string
): Promise<PilotDetailResponse> {
  return fetchJson<PilotDetailResponse>(
    `${MERGE_ENGINE_URL}/api/pilots/${encodeURIComponent(pilotId)}`
  );
}

/** Résultats d'un pilote (pagines) */
export async function fetchPilotResults(
  pilotId: string,
  limit = 20,
  offset = 0
): Promise<{ results: PilotRaceResult[]; total: number }> {
  return fetchJson(
    `${MERGE_ENGINE_URL}/api/pilots/${encodeURIComponent(pilotId)}/results?limit=${limit}&offset=${offset}`
  );
}

/** Badges d'un pilote */
export async function fetchPilotBadges(
  pilotId: string
): Promise<{ success: boolean; badges: PilotBadge[] }> {
  return fetchJson(
    `${MERGE_ENGINE_URL}/api/pilots/${encodeURIComponent(pilotId)}/badges`
  );
}

/** Statistiques carriere */
export async function fetchPilotStats(
  pilotId: string
): Promise<{ success: boolean; stats: PilotCareerStats }> {
  return fetchJson(
    `${MERGE_ENGINE_URL}/api/pilots/${encodeURIComponent(pilotId)}/stats`
  );
}

/** Historique BER/BSR */
export async function fetchPilotRatings(
  pilotId: string,
  limit = 50
): Promise<{
  success: boolean;
  current: { ber: number; bsr: string };
  history: RatingPoint[];
}> {
  return fetchJson(
    `${MERGE_ENGINE_URL}/api/pilots/${encodeURIComponent(pilotId)}/ratings?limit=${limit}`
  );
}

/** Liste des pilotes */
export async function fetchPilotList(
  query = "",
  limit = 50,
  offset = 0
): Promise<{ pilots: PilotSummary[]; total: number }> {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return fetchJson(
    `${MERGE_ENGINE_URL}/api/pilots?${params.toString()}`
  );
}
