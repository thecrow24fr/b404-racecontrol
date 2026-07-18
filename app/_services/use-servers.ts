/**
 * useServers — Hook React pour la liste FIXE des 7 serveurs
 *
 * B404 RaceControl
 *
 * Affiche toujours les serveurs 1 a 7 dans le meme ordre.
 * Le Merge Engine met a jour chaque carte si le serveur est en ligne.
 *
 * @module use-servers
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServerOverview, SimulatorId } from "../_types/server-overview";

const MERGE_ENGINE_URL =
  process.env.NEXT_PUBLIC_MERGE_ENGINE_URL ?? "http://localhost:3002";

const POLL_INTERVAL = 10_000;

export interface UseServersResult {
  servers: ServerOverview[];
  onlineCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Grille fixe des 7 serveurs ─────────────────────────────────────

const SERVER_IDS = [1, 2, 3, 4, 5, 6, 7];

function makeOfflineServer(id: number): ServerOverview {
  return {
    id: String(id),
    name: `Serveur ${id}`,
    circuit: "--",
    simulator: "rf2",
    status: "offline",
    session: {
      type: "--",
      timeRemaining: "--:--",
      totalTime: "--:--",
      lapsCompleted: 0,
      totalLaps: 0,
      bestLap: "--:--.---",
    },
    drivers: 0,
    maxDrivers: 31,
    weather: { temperature: 0, trackTemp: 0, condition: "clear", rainPercent: 0, windSpeed: 0 },
    flags: [],
    access: "public",
    hasPassword: false,
  };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useServers(): UseServersResult {
  // Initialise avec les 7 serveurs offline
  const [servers, setServers] = useState<ServerOverview[]>(
    () => SERVER_IDS.map(makeOfflineServer),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const fetchServers = useCallback(async () => {
    setError(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(
        `${MERGE_ENGINE_URL}/api/merge/servers`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.servers)) {
        // Fusion : les serveurs retournes par le Merge Engine ecrasent les offline
        setServers((prev) => {
          const updated = [...prev];
          for (const live of json.servers) {
            const idx = updated.findIndex((s) => s.id === live.id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], ...live, status: "online" };
            }
          }
          return updated;
        });
      }
    } catch {
      // Merge Engine indisponible — conserver etat actuel
      if (fetchCount === 0) {
        setError("Mode demonstration (Merge Engine indisponible)");
      }
    } finally {
      setIsLoading(false);
      setFetchCount((c) => c + 1);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchServers();
    const interval = setInterval(fetchServers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchServers]);

  return {
    servers,
    onlineCount: servers.filter((s) => s.status === "online").length,
    isLoading,
    error,
    refresh: fetchServers,
  };
}
