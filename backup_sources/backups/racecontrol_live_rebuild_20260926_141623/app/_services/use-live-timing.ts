"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import { emptyLiveTimingData } from "../_data/empty-live-timing-data";
import {
  LIVE_TIMING_SOURCE_ID,
  PublicLiveTimingProvider,
  type LiveTimingSourceId,
} from "./public-live-timing-provider";

export interface LiveTimingState {
  data: LiveTimingData;
  source: string;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL = 2000;

/**
 * Polling de la seule API publique RaceControl.
 * Aucun fallback mock n’est utilisé : une erreur reste visible et les données
 * précédentes deviennent stale au lieu d’être remplacées par des données fictives.
 */
export function useLiveTiming(
  initialData: LiveTimingData = emptyLiveTimingData,
  sourceId: LiveTimingSourceId = LIVE_TIMING_SOURCE_ID,
): LiveTimingState {
  const [data, setData] = useState<LiveTimingData>(initialData);
  const [source, setSource] = useState<string>(sourceId);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const providerRef = useRef<PublicLiveTimingProvider | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  if (providerRef.current == null) {
    providerRef.current = new PublicLiveTimingProvider(sourceId);
  }

  const fetchData = useCallback(async () => {
    if (inFlightRef.current || !providerRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await providerRef.current.fetch();
      if (!mountedRef.current) return;
      setData(result.data);
      setSource(result.source);
      setIsLive(result.data.server.status === "online");
      setLastUpdated(new Date(result.fetchedAt));
    } catch (reason) {
      if (!mountedRef.current) return;
      const message = reason instanceof Error ? reason.message : "Live Timing indisponible";
      setError(message);
      setIsLive(false);
      setData((previous) => ({
        ...previous,
        server: {
          ...previous.server,
          status: previous.server.status === "offline" ? "offline" : "stale",
        },
      }));
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();
    const intervalId = window.setInterval(() => void fetchData(), POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [fetchData]);

  return {
    data,
    source,
    isLive,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
