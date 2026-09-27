/**
 * MergeEngineProvider — Provider React interrogeant le Merge Engine B404 (:3002)
 *
 * Provider PRINCIPAL du Live Timing.
 * Le Merge Engine gère la sélection des sources (rF2, R2LA, futurs).
 * Ce provider ne fait que du mapping de format — aucune logique métier.
 *
 * @module merge-engine-provider
 */

"use client";

import type {
  LiveTimingData,
  ServerInfo,
  SessionInfo,
  StandingEntry,
  SessionPhase,
  FlagType,
  Flag,
  DriverStatus,
  CarCategory,
  Weather,
} from "../_types/live-timing";

// Interface du provider (définie localement — le seul consommateur)
export interface ProviderResult {
  data: LiveTimingData;
  source: string;
  fetchedAt: string;
}

export interface IDataProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  fetch(): Promise<ProviderResult>;
}

const MERGE_ENGINE_URL =
  process.env.NEXT_PUBLIC_MERGE_ENGINE_URL ?? "http://localhost:3002";
const FETCH_TIMEOUT = 10_000;

/** Formate un temps en secondes vers "M:SS.mmm" ou "--:--.---" */
function formatTime(seconds: number): string {
  if (seconds < 0) return "--:--.---";
  const totalMs = Math.round(seconds * 1000);
  const mins = Math.floor(totalMs / 60000);
  const secs = (totalMs % 60000) / 1000;
  return `${mins}:${secs.toFixed(3).padStart(7, "0")}`;
}

/** Formate un écart (secondes) vers "+X.XXXs" ou "Leader" */
function formatGap(seconds: number, isLeader: boolean): string {
  if (isLeader) return "Leader";
  if (seconds < 0) return "--";
  return `+${seconds.toFixed(3)}s`;
}

/** Calcule le secteur 3 : bestLapTime - bestSector1 - bestSector2 */
function calcSector3(bestLap: number, s1: number, s2: number): string {
  if (bestLap <= 0 || s1 <= 0 || s2 <= 0) return "--:--.---";
  return formatTime(bestLap - s1 - s2);
}

export class MergeEngineProvider implements IDataProvider {
  private serverId: number;

  constructor(serverId: number = 2) {
    this.serverId = serverId;
  }

  readonly name = "Merge Engine";

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const res = await fetch(
        `${MERGE_ENGINE_URL}/api/health?instance=serveur-${this.serverId}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) return false;
      const d = await res.json();
      return d.status === "ok" || d.status === "degraded";
    } catch {
      return false;
    }
  }

  async fetch(): Promise<ProviderResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const res = await fetch(
      `${MERGE_ENGINE_URL}/api/merge/live-timing?instance=serveur-${this.serverId}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error("Merge Engine HTTP " + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Merge Engine error");

    // ── Session (format camelCase depuis _session_to_dict) ──
    const s = json.session ?? {};
    const vehicles: any[] = json.standings ?? [];

    // Weather depuis le backend (formaté par le Merge Engine)
    // Note : _session_to_dict() expose les champs bruts, pas le weather formaté.
    // On garde le calcul local jusqu'à ce que le backend expose weather dans live-timing.
    const weather: Weather = {
      condition:
        s.raining > 0.5 ? "Rain" : s.darkCloud > 0.5 ? "Cloudy" : "Clear",
      temperature: s.ambientTemp ?? 0,
      windSpeed:
        typeof s.windSpeed === "object"
          ? s.windSpeed.velocity ?? 0
          : s.windSpeed ?? 0,
      rainPercent: Math.round((s.raining ?? 0) * 100),
      trackCondition:
        (s as any).averagePathWetness > 0.5
          ? "wet"
          : (s as any).averagePathWetness > 0.1
            ? "damp"
            : "dry",
    };

    // Flags depuis les données brutes
    const flags: Flag[] = [];
    if (s.yellowFlag && s.yellowFlag !== "NONE") {
      flags.push({ type: "yellow" as FlagType, sector: 0 });
    }

    // Phase de session normalisée
    const gp: number = s.gamePhase ?? 0;
    const SESSION_PHASE_MAP: Record<number, SessionPhase> = {
      0: "waiting",
      1: "practice",
      2: "practice",
      3: "race",
      4: "race",
      5: "race",
      6: "paused",
      7: "paused",
    };
    const sessionPhase: SessionPhase = SESSION_PHASE_MAP[gp] ?? "practice";

    // ServerInfo
    const server: ServerInfo = {
      id: `serveur-${this.serverId}`,
      name: s.serverName ?? `Serveur ${this.serverId}`,
      circuit: s.trackName ?? "Inconnu",
      category: "GT3" as CarCategory,
      weather,
      driversCount: vehicles.length,
      maxDrivers: s.numVehicles ?? vehicles.length,
      currentSession: s.sessionType ?? "Practice",
      timeRemaining: formatTime(
        (s.endEventTime ?? 0) - (s.currentEventTime ?? 0)
      ),
      totalSessionTime: formatTime(s.endEventTime ?? 0),
      lapsCompleted:
        vehicles.length > 0
          ? Math.max(...vehicles.map((v: any) => v.laps_completed ?? 0))
          : 0,
      totalLaps:
        s.maxLaps && s.maxLaps < 1000000 ? s.maxLaps : 0,
      status: "online",
    };

    // SessionInfo
    const session: SessionInfo = {
      phase: sessionPhase,
      serverTime: formatTime(s.currentEventTime ?? 0),
      trackTemp: s.trackTemp ?? 0,
      airTemp: s.ambientTemp ?? 0,
      flags,
      elapsedTime: formatTime(
        (s.endEventTime ?? 0) - (s.currentEventTime ?? 0)
      ),
    };

    // Standings
    const standings: StandingEntry[] = vehicles.map((v: any, idx: number) => {
      const bestLap = v.best_lap_time ?? -1;
      const s1 = v.best_sector1 ?? -1;
      const s2 = v.best_sector2 ?? -1;
      const isLeader = (v.position ?? 99) === 1;

      return {
        position: v.position ?? idx + 1,
        prevPosition: v.position ?? idx + 1,
        driverName: v.driver_name ?? "Pilote",
        team: v.full_team_name || v.vehicle_name || "",
        car: v.vehicle_name ?? "",
        carNumber: v.car_number,
        carClass: (v.car_class ?? "GT3") as CarCategory,
        laps: v.laps_completed ?? 0,
        gapToLeader: formatGap(v.gap_leader ?? 0, isLeader),
        gapToNext: formatGap(v.gap_next ?? 0, isLeader),
        bestLap: formatTime(bestLap),
        lastLap: formatTime(v.last_lap_time ?? -1),
        sector1: formatTime(s1),
        sector2: formatTime(s2),
        sector3: calcSector3(bestLap, s1, s2),
        inPit: v.in_pits ?? false,
        status: (v.in_pits
          ? "pit"
          : v.finish_status === "FSTAT_DNF"
            ? "dnf"
            : v.finish_status === "FSTAT_FINISHED"
              ? "finished"
              : "running") as DriverStatus,
        pitStops: v.pitstops ?? 0,
        fuel: v.fuel_percent ?? undefined,
        drsActive: v.drs_active ?? false,
        penalties: v.penalties ?? 0,
        steamID: v.steamID,
      };
    });

    const data: LiveTimingData = { server, session, standings };

    return {
      data,
      source: "Merge Engine",
      fetchedAt: new Date().toISOString(),
    };
  }
}
