"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import {
  fetchPublicLiveTiming,
  openPublicLiveTimingStream,
  type ViewerSnapshotResult,
} from "./public-live-timing-provider";

export interface LiveTimingState {
  data: LiveTimingData | null;
  source: string;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useLiveTiming(serverId = 20): LiveTimingState {
  const [data, setData] = useState<LiveTimingData | null>(null);
  const [source, setSource] = useState("S20");
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(false);
  const streamCleanupRef = useRef<(() => void) | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const applySnapshot = useCallback((result: ViewerSnapshotResult) => {
    if (!mountedRef.current) return;
    setData(result.data);
    setSource("S20 · public");
    setLastUpdated(new Date(result.fetchedAt));
    setIsLive(result.data.server.status === "online");
    setIsLoading(false);
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPublicLiveTiming(serverId, controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;
      applySnapshot(result);
      if (!streamCleanupRef.current) {
        streamCleanupRef.current = openPublicLiveTimingStream(
          serverId,
          applySnapshot,
          (message) => {
            if (!mountedRef.current) return;
            setIsLive(false);
            setError(message);
          },
        );
      }
    } catch (reason) {
      if (!mountedRef.current || controller.signal.aborted) return;
      setIsLive(false);
      setError(reason instanceof Error ? reason.message : "Flux public Live Timing en attente");
    } finally {
      if (mountedRef.current && !controller.signal.aborted) setIsLoading(false);
    }
  }, [applySnapshot, serverId]);

  useEffect(() => {
    mountedRef.current = true;
    const initialLoadTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoadTimer);
      requestRef.current?.abort();
      requestRef.current = null;
      streamCleanupRef.current?.();
      streamCleanupRef.current = null;
    };
  }, [refresh]);

  return { data, source, isLive, isLoading, error, lastUpdated, refresh };
}
