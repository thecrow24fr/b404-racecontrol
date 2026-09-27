/**
 * useLiveTiming — Hook React pour les donnees Live Timing
 *
 * Provider UNIQUE : Merge Engine (:3002)
 * Aucun fallback mock — si indisponible, data = null.
 *
 * @module use-live-timing
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import { MergeEngineProvider } from "./merge-engine-provider";

export interface LiveTimingState {
  data: LiveTimingData | null;
  source: string;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL = 5000;

export function useLiveTiming(serverId: number = 2): LiveTimingState {
  const [data, setData] = useState<LiveTimingData | null>(null);
  const [source, setSource] = useState<string>("connexion...");
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const providerRef = useRef<MergeEngineProvider | null>(null);
  const isMountedRef = useRef(true);

  if (!providerRef.current) {
    providerRef.current = new MergeEngineProvider(serverId);
  }

  const fetchData = useCallback(async () => {
    const provider = providerRef.current;
    if (!provider) return;
    setIsLoading(true);
    setError(null);

    try {
      const available = await provider.isAvailable();
      if (!available) {
        if (isMountedRef.current) {
          setIsLoading(false);
          setError("Serveur hors ligne");
        }
        return;
      }
      const result = await provider.fetch();
      if (!isMountedRef.current) return;
      setData(result.data);
      setSource(result.source);
      setIsLive(true);
      setLastUpdated(new Date(result.fetchedAt));
      setIsLoading(false);
      setError(null);
    } catch (e) {
      if (!isMountedRef.current) return;
      setIsLoading(false);
      setSource("");
      setIsLive(false);
      setError(
        e instanceof Error ? e.message : "Erreur de connexion"
      );
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    fetchData();

    const intervalId = setInterval(async () => {
      if (!isMountedRef.current) return;
      const provider = providerRef.current;
      if (!provider) return;

      try {
        const available = await provider.isAvailable();
        if (!available) {
          if (isMountedRef.current) {
            setIsLive(false);
            setError("Serveur hors ligne");
          }
          return;
        }
        const result = await provider.fetch();
        if (!isMountedRef.current) return;
        setData(result.data);
        setSource(result.source);
        setIsLive(true);
        setLastUpdated(new Date(result.fetchedAt));
        setError(null);
      } catch {
        if (isMountedRef.current) {
          setIsLive(false);
          setError("Perte de connexion");
        }
      }
    }, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchData]);

  return {
    data, source, isLive, isLoading, error, lastUpdated,
    refresh: fetchData,
  };
}