"use client";

import { useCallback, useEffect, useState } from "react";

interface S20Summary {
  status: "online" | "offline";
  driversCount: number | null;
  currentSession: string | null;
}

interface S20SummaryPayload {
  success?: boolean;
  data?: {
    server?: {
      status?: unknown;
      driversCount?: unknown;
      currentSession?: unknown;
    };
  };
}

const SUMMARY_URL = process.env.NEXT_PUBLIC_LIVE_TIMING_SUMMARY_URL?.trim() ?? "";

/**
 * Lit uniquement un endpoint de synthèse explicitement configuré et expurgé.
 * Ne jamais pointer ce hook vers le DTO Live complet (il peut contenir des
 * informations réservées au streamer, comme la durée des arrêts).
 */
export function useS20Summary() {
  const [summary, setSummary] = useState<S20Summary | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(SUMMARY_URL));

  const refresh = useCallback(async () => {
    if (!SUMMARY_URL) return;

    try {
      const response = await fetch(SUMMARY_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as S20SummaryPayload;
      const server = payload.success === true ? payload.data?.server : undefined;
      if (!server) throw new Error("Résumé S20 indisponible");

      setSummary({
        status: server.status === "online" ? "online" : "offline",
        driversCount:
          typeof server.driversCount === "number" && Number.isFinite(server.driversCount)
            ? server.driversCount
            : null,
        currentSession:
          typeof server.currentSession === "string" && server.currentSession.trim()
            ? server.currentSession.trim()
            : null,
      });
    } catch {
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!SUMMARY_URL) return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await refresh();
    };
    const first = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { summary, isLoading, refresh };
}
