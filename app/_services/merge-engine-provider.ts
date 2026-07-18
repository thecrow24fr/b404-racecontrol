/**
 * MergeEngineProvider — Provider React interrogeant le Merge Engine B404 (:3002)
 *
 * Provider PRINCIPAL du Live Timing. Aucune logique liee a un simulateur.
 * Le Merge Engine gere la selection des sources (rF2, R2LA, futurs).
 *
 * @module merge-engine-provider
 */

"use client";

import type { IDataProvider, ProviderResult } from "./data-provider";
import type {
  LiveTimingData,
  ServerInfo,
  SessionInfo,
  StandingEntry,
  SessionPhase,
  FlagType,
  DriverStatus,
  CarCategory,
  Weather,
} from "../_types/live-timing";

const MERGE_ENGINE_URL =
  process.env.NEXT_PUBLIC_MERGE_ENGINE_URL ?? "http://localhost:3002";
const FETCH_TIMEOUT = 10_000;

/** Mapping gamePhase (API native) -> SessionPhase (frontend) */
const GAME_PHASE_MAP: Record<number, SessionPhase> = {
  0: "practice",
  1: "practice",
  2: "qualifying",
  3: "race",
  4: "race",
  5: "finished",
  6: "paused",
};

/** Formatte un temps en secondes vers "MM:SS.mmm" */
function formatTime(seconds: number): string {
  if (seconds < 0) return "--:--.---";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${secs.toFixed(3).padStart(7, "0")}`;
}

/** Formate un ecart (secondes) vers "+X.XXXs" ou "Leader" */
function formatGap(seconds: number, isLeader: boolean): string {
  if (isLeader) return "Leader";
  if (seconds < 0) return "--";
  return `+${seconds.toFixed(3)}s`;
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
      const res = await fetch(`${MERGE_ENGINE_URL}/api/health?server=${this.serverId}`, { signal: controller.signal });
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
    const res = await fetch(`${MERGE_ENGINE_URL}/api/merge/live-timing?server=${this.serverId}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error("Merge Engine HTTP " + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Merge Engine error");

    const s = json.session ?? {};
    const vehicles: any[] = json.standings ?? [];
    const gp = s.game_phase ?? 0;

    // Mapper les flags
    const flags = [];
    if (s.yellow_flag && s.yellow_flag !== "NONE") {
      flags.push({ type: "yellow" as FlagType, sector: 0 });
    }

    // Weather
    const weather: Weather = {
      condition: s.raining > 0.5 ? "Rain" : s.dark_cloud > 0.5 ? "Cloudy" : "Clear",
      temperature: s.ambient_temp ?? 0,
      windSpeed: s.wind_speed ?? 0,
      rainPercent: Math.round((s.raining ?? 0) * 100),
      trackCondition: s.average_path_wetness > 0.5 ? "wet" : s.average_path_wetness > 0.1 ? "damp" : "dry",
    };

    // ServerInfo
    const server: ServerInfo = {
      id: "rf2-2",
      name: s.server_name ?? "Serveur 2",
      circuit: s.track_name ?? "Inconnu",
      category: "GT3" as CarCategory,
      weather,
      driversCount: vehicles.length,
      maxDrivers: s.num_vehicles ?? vehicles.length,
      currentSession: s.session_type ?? "Practice",
      timeRemaining: formatTime((s.end_event_time ?? 0) - (s.current_event_time ?? 0)),
      totalSessionTime: formatTime(s.end_event_time ?? 0),
      lapsCompleted: 0,
      totalLaps: s.max_laps ?? 0,
      status: "online",
    };

    // SessionInfo
    const session: SessionInfo = {
      phase: GAME_PHASE_MAP[gp] ?? "practice",
      serverTime: formatTime(s.current_event_time ?? 0),
      trackTemp: s.track_temp ?? 0,
      airTemp: s.ambient_temp ?? 0,
      flags,
      elapsedTime: formatTime((s.end_event_time ?? 0) - (s.current_event_time ?? 0)),
    };

    // Standings
    const standings: StandingEntry[] = vehicles.map((v: any, idx: number) => ({
      position: v.position ?? idx + 1,
      prevPosition: v.position ?? idx + 1,
      driverName: v.driver_name ?? "Pilote",
      team: v.vehicle_name ?? "",
      car: v.vehicle_name ?? "",
      carClass: (v.car_class ?? "GT3") as CarCategory,
      laps: v.laps_completed ?? 0,
      gapToLeader: formatGap(v.gap_leader ?? 0, (v.position ?? 99) === 1),
      gapToNext: formatGap(v.gap_next ?? 0, (v.position ?? 99) === 1),
      bestLap: formatTime(v.best_lap_time ?? -1),
      lastLap: formatTime(v.last_lap_time ?? -1),
      sector1: formatTime(v.sector1_time ?? -1),
      sector2: formatTime(v.sector2_time ?? -1),
      sector3: "--:--.---",
      inPit: v.in_pits ?? false,
      status: (v.in_pits ? "pit" : v.finish_status === "FSTAT_DNF" ? "dnf" : "running") as DriverStatus,
      pitStops: v.pitstops ?? 0,
      fuel: v.fuel_percent,
      drsActive: false,
      penalties: v.penalties ?? 0,
    }));

    const data: LiveTimingData = { server, session, standings };

    return {
      data,
      source: "Merge Engine",
      fetchedAt: new Date().toISOString(),
    };
  }
}