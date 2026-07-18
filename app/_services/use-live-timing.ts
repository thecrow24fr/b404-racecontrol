/**
 * useLiveTiming -- Hook React pour la gestion des donnees Live Timing
 *
 * Provider PRINCIPAL : Merge Engine (:3002)
 * Fallback : Mock data (hors ligne)
 *
 * Le Merge Engine gere la totalite des sources de donnees cote serveur.
 * Aucune modification du frontend necessaire pour ajouter un simulateur.
 *
 * @module use-live-timing
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import type { IDataProvider, ProviderResult } from "./data-provider";
import { getPollDelay, delay } from "./data-provider";
import { MergeEngineProvider } from "./merge-engine-provider";
import { MockDataProvider } from "./mock-provider";

export interface LiveTimingState {
  data: LiveTimingData;
  source: string;
  isLive: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL = 5000;
const ERROR_RETRY_DELAY = 10_000;

export function useLiveTiming(initialData?: LiveTimingData, serverId: number = 2): LiveTimingState {
  // Stocker le serverId pour le passer au MergeEngineProvider
  const [data, setData] = useState<LiveTimingData>(
    initialData ?? (null as unknown as LiveTimingData),
  );
  const [source, setSource] = useState<string>("initialisation...");
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const providersRef = useRef<IDataProvider[] | null>(null);
  const activeProviderRef = useRef<IDataProvider | null>(null);
  const pollAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  if (!providersRef.current) {
    providersRef.current = [new MergeEngineProvider(serverId), new MockDataProvider()];
  }

  const fetchData = useCallback(async () => {
    const providers = providersRef.current;
    if (!providers) return;
    setIsLoading(true);
    setError(null);

    for (const provider of providers) {
      try {
        const available = await provider.isAvailable();
        if (!available) continue;
        const result: ProviderResult = await provider.fetch();
        if (!isMountedRef.current) return;
        setData(result.data);
        setSource(result.source);
        setIsLive(provider instanceof MergeEngineProvider);
        setLastUpdated(new Date(result.fetchedAt));
        setIsLoading(false);
        setError(null);
        activeProviderRef.current = provider;
        pollAttemptRef.current = 0;
        return;
      } catch {
        if (!isMountedRef.current) return;
        continue;
      }
    }
    if (isMountedRef.current) {
      setIsLoading(false);
      setError("Aucune source de donnees disponible");
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    fetchData();

    const intervalId = setInterval(async () => {
      if (!isMountedRef.current) return;
      const currentSource = activeProviderRef.current;
      const providers = providersRef.current;
      if (!providers) return;

      if (currentSource instanceof MockDataProvider) {
        pollAttemptRef.current += 1;
        for (const provider of providers) {
          if (provider === currentSource) break;
          try {
            const available = await provider.isAvailable();
            if (!available) {
              await delay(getPollDelay(pollAttemptRef.current));
              continue;
            }
            const result = await provider.fetch();
            if (!isMountedRef.current) return;
            setData(result.data);
            setSource(result.source);
            setIsLive(provider instanceof MergeEngineProvider);
            setLastUpdated(new Date(result.fetchedAt));
            setError(null);
            activeProviderRef.current = provider;
            pollAttemptRef.current = 0;
            return;
          } catch {
            await delay(ERROR_RETRY_DELAY);
            continue;
          }
        }
        return;
      }

      if (!currentSource) {
        await fetchData();
        return;
      }

      try {
        const available = await currentSource.isAvailable();
        if (!available) {
          activeProviderRef.current = null;
          await fetchData();
          return;
        }
        const result = await currentSource.fetch();
        if (!isMountedRef.current) return;
        setData(result.data);
        setLastUpdated(new Date(result.fetchedAt));
        setError(null);
        pollAttemptRef.current = 0;
      } catch {
        pollAttemptRef.current += 1;
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