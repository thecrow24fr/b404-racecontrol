"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import { emptyLiveTimingData } from "../_data/empty-live-timing-data";
import {
  LIVE_TIMING_SOURCE_ID,
  PublicLiveTimingProvider,
  type LiveTimingSourceId,
} from "./public-live-timing-provider";

export type LiveTimingTransport = "connecting" | "sse" | "reconnecting";

export interface LiveTimingState {
  data: LiveTimingData;
  source: string;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  transport: LiveTimingTransport;
  refresh: () => Promise<void>;
}

function emptyDataForSource(sourceId: LiveTimingSourceId): LiveTimingData {
  return {
    ...emptyLiveTimingData,
    sourceId,
    server: {
      ...emptyLiveTimingData.server,
      id: sourceId,
      sourceId,
      name: sourceId === "s20_vm" ? "Serveur 20" : "Serveur 1",
    },
  };
}

/**
 * Flux SSE de la seule API publique RaceControl.
 * Le navigateur ne sonde plus la source toutes les deux secondes : une boucle
 * backend par source pousse chaque snapshot reçu aux clients connectés.
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
  const [transport, setTransport] = useState<LiveTimingTransport>("connecting");

  const mountedRef = useRef(true);

  const applyResult = useCallback((result: {
    data: LiveTimingData;
    source: string;
    fetchedAt: string;
  }) => {
    if (!mountedRef.current) return;
    setData(result.data);
    setSource(result.source);
    setIsLive(result.data.server.status === "online");
    setLastUpdated(new Date(result.fetchedAt));
    setError(null);
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const provider = new PublicLiveTimingProvider(sourceId);
    if (mountedRef.current) setIsLoading(true);
    try {
      const result = await provider.fetch();
      applyResult(result);
    } catch (reason) {
      if (!mountedRef.current) return;
      const message = reason instanceof Error ? reason.message : "Live Timing indisponible";
      setError(message);
      setIsLive(false);
      setIsLoading(false);
    }
  }, [applyResult, sourceId]);

  useEffect(() => {
    mountedRef.current = true;
    const provider = new PublicLiveTimingProvider(sourceId);

    const closeStream = provider.openStream(
      (result) => {
        applyResult(result);
        setTransport("sse");
      },
      (status) => {
        if (!mountedRef.current) return;
        setSource(sourceId);
        setError(status.error);
        setIsLive(false);
        setIsLoading(false);
        setTransport("reconnecting");
        setData((previous) => ({
          ...(previous.sourceId === sourceId
            ? previous
            : emptyDataForSource(sourceId)),
          server: {
            ...(previous.sourceId === sourceId
              ? previous.server
              : emptyDataForSource(sourceId).server),
            status:
              previous.sourceId === sourceId && previous.server.status !== "offline"
                ? "stale"
                : "offline",
          },
        }));
      },
    );

    return () => {
      mountedRef.current = false;
      closeStream();
    };
  }, [applyResult, sourceId]);

  const hasCurrentData = data.sourceId === sourceId;
  const visibleData = hasCurrentData ? data : emptyDataForSource(sourceId);

  return {
    data: visibleData,
    source: source === sourceId ? source : sourceId,
    isLive: hasCurrentData && isLive,
    isLoading: !hasCurrentData || isLoading,
    error: hasCurrentData ? error : null,
    lastUpdated: hasCurrentData ? lastUpdated : null,
    transport: hasCurrentData ? transport : "connecting",
    refresh,
  };
}
