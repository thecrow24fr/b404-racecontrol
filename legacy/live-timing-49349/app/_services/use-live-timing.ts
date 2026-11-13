"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import { emptyLiveTimingData } from "../_data/empty-live-timing-data";
import {
  createElapsedClockAnchor,
  hasElapsedClockGenerationChanged,
} from "./live-timing-elapsed-clock.mjs";
import {
  advanceMonotonicDuration,
  decodeLegacyRFactorDuration,
  formatRFactorDuration,
  rebaseSnapshotDurationAtReceipt,
  type MonotonicDurationAnchor,
} from "./live-timing-formatters";
import { hasCurrentStandingsForMotion, isStandingsSnapshotUnavailable, markLiveTimingUnavailable, mergeStandingsUnavailableSnapshot } from "./live-timing-state";
import {
  LIVE_TIMING_SOURCE_ID,
  PublicLiveTimingProvider,
  type LiveTimingSourceId,
} from "./public-live-timing-provider";

export type LiveTimingTransport = "connecting" | "sse" | "reconnecting";

const SSE_SNAPSHOT_STALE_AFTER_MS = 8_000;
const SNAPSHOT_RECOVERY_POLL_INTERVAL_MS = 5_000;

export interface ServerReadyElapsedAnchor {
  sourceId: LiveTimingSourceId;
  baseSeconds: number;
  anchoredAt: number;
}

export interface LiveTimingState {
  data: LiveTimingData;
  source: string;
  isLive: boolean;
  standingsMotionAvailable: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  snapshotReceivedAt: number | null;
  snapshotReceivedMonotonicAt: number | null;
  countdownAnchorMonotonicAt: number | null;
  serverReadyElapsedAnchor: ServerReadyElapsedAnchor | null;
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
      name: `Serveur ${/^s(\d+)_vm$/.exec(sourceId)?.[1] ?? sourceId}`,
    },
  };
}

/**
 * Compatibilité bornée avec le processus 3001 chargé avant la correction du
 * backend : ses chaînes HH:MM:SS encodent encore des secondes comme minutes.
 * Le nouveau DTO porte durationFormat et contourne ce décodage.
 */
function normalizeLiveTimingDurations(data: LiveTimingData): LiveTimingData {
  if (data.durationFormat === "rFactor2-seconds-v1") return data;

  return {
    ...data,
    durationFormat: "rFactor2-seconds-v1",
    server: {
      ...data.server,
      timeRemaining: decodeLegacyRFactorDuration(data.server.timeRemaining),
      totalSessionTime: decodeLegacyRFactorDuration(data.server.totalSessionTime),
    },
    session: {
      ...data.session,
      serverTime: decodeLegacyRFactorDuration(data.session.serverTime),
      sessionTimeRemaining: decodeLegacyRFactorDuration(
        data.session.sessionTimeRemaining,
      ),
      elapsedTime: decodeLegacyRFactorDuration(data.session.elapsedTime),
    },
  };
}

function applyMonotonicSessionCountdown(
  data: LiveTimingData,
  sourceId: LiveTimingSourceId,
  now: number,
  anchorRef: { current: MonotonicDurationAnchor | null },
  sampledAt: string,
  receivedAt: number,
): { data: LiveTimingData; anchorAt: number | null } {
  const sessionCode = data.session.sessionCode?.trim();
  const sessionLabel = sessionCode && sessionCode !== "—"
    ? sessionCode
    : data.server.currentSession;
  const phaseFallback = sessionCode && sessionCode !== "—" ? "" : data.session.phase;
  const countdownMode = [
    data.server.totalLaps ?? "laps-unknown",
    data.server.totalSessionTime ?? "duration-unknown",
    data.session.serverReadyGeneration ?? "generation-unknown",
  ].join(":");
  const key = `${sourceId}:${sessionLabel}:${phaseFallback}:${countdownMode}`;
  const remaining = data.session.sessionTimeRemaining ?? data.server.timeRemaining;
  const remainingAtReceipt = rebaseSnapshotDurationAtReceipt(remaining, sampledAt, receivedAt);
  const countdown = advanceMonotonicDuration(
    remainingAtReceipt,
    key,
    now,
    anchorRef.current,
  );
  anchorRef.current = countdown.anchor;
  if (!countdown.anchor) return { data, anchorAt: null };

  // Store the unchanging session baseline in the DTO. The client projects both
  // countdown fields from this same monotonic anchor, never from the last SSE.
  const baseline = formatRFactorDuration(countdown.anchor.remainingSeconds);
  return {
    data: {
      ...data,
      server: { ...data.server, timeRemaining: baseline },
      session: { ...data.session, sessionTimeRemaining: baseline },
    },
    anchorAt: countdown.anchor.anchoredAt,
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
  const [standingsMotionAvailable, setStandingsMotionAvailable] = useState(
    hasCurrentStandingsForMotion(initialData),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [snapshotReceivedAt, setSnapshotReceivedAt] = useState<number | null>(null);
  const [snapshotReceivedMonotonicAt, setSnapshotReceivedMonotonicAt] = useState<number | null>(null);
  const [countdownAnchorMonotonicAt, setCountdownAnchorMonotonicAt] = useState<number | null>(null);
  const [serverReadyElapsedAnchor, setServerReadyElapsedAnchor] = useState<ServerReadyElapsedAnchor | null>(null);
  const [transport, setTransport] = useState<LiveTimingTransport>("connecting");

  const mountedRef = useRef(true);
  const serverReadyElapsedAnchorRef = useRef<ServerReadyElapsedAnchor | null>(null);
  const serverReadyGenerationRef = useRef<number | null>(
    initialData.session.serverReadyGeneration ?? null,
  );
  const lastGoodDataRef = useRef<LiveTimingData | null>(
    initialData && !isStandingsSnapshotUnavailable(initialData) ? initialData : null,
  );
  const countdownAnchorRef = useRef<MonotonicDurationAnchor | null>(null);
  const lastSseSnapshotAtRef = useRef(0);
  const activeSourceIdRef = useRef(sourceId);
  const recoveryFetchInFlightRef = useRef(false);
  const applyResult = useCallback((result: {
    data: LiveTimingData;
    source: string;
    fetchedAt: string;
  }): boolean => {
    if (!mountedRef.current) return false;
    const normalizedData = normalizeLiveTimingDurations(result.data);
    if (lastGoodDataRef.current?.sourceId !== sourceId) {
      lastGoodDataRef.current = null;
    }
    const standingsMotionAvailableNow = hasCurrentStandingsForMotion(normalizedData);
    const standingsUnavailable = !standingsMotionAvailableNow;
    setStandingsMotionAvailable(standingsMotionAvailableNow);
    const receivedAt = Date.now();
    const receivedMonotonicAt = performance.now();
    let elapsedClockAnchor = serverReadyElapsedAnchorRef.current;
    const nextGeneration = normalizedData.session.serverReadyGeneration ?? null;
    const generationChanged = hasElapsedClockGenerationChanged(
      serverReadyGenerationRef.current,
      nextGeneration,
    );
    if (typeof nextGeneration === "number" && Number.isSafeInteger(nextGeneration)) {
      serverReadyGenerationRef.current = nextGeneration;
    }
    if (
      generationChanged
      || normalizedData.server.status === "offline"
      || (elapsedClockAnchor !== null && elapsedClockAnchor.sourceId !== sourceId)
    ) {
      elapsedClockAnchor = null;
      serverReadyElapsedAnchorRef.current = null;
      setServerReadyElapsedAnchor(null);
    }
    if (!elapsedClockAnchor && normalizedData.server.status !== "offline") {
      const newAnchor = createElapsedClockAnchor(
        normalizedData.session.serverReadyElapsed,
        receivedMonotonicAt,
      );
      if (newAnchor) {
        elapsedClockAnchor = { ...newAnchor, sourceId };
        serverReadyElapsedAnchorRef.current = elapsedClockAnchor;
        setServerReadyElapsedAnchor(elapsedClockAnchor);
      }
    }
    const countdown = applyMonotonicSessionCountdown(
      normalizedData,
      sourceId,
      receivedMonotonicAt,
      countdownAnchorRef,
      result.fetchedAt,
      receivedAt,
    );
    const timedData = countdown.data;
    const displayData = standingsUnavailable
      ? mergeStandingsUnavailableSnapshot(timedData, lastGoodDataRef.current)
      : timedData;
    if (!standingsUnavailable) lastGoodDataRef.current = timedData;
    setData(displayData);
    setSource(result.source);
    setIsLive(!standingsUnavailable && timedData.server.status === "online");
    setLastUpdated(new Date(result.fetchedAt));
    setSnapshotReceivedAt(receivedAt);
    setSnapshotReceivedMonotonicAt(receivedMonotonicAt);
    setCountdownAnchorMonotonicAt(countdown.anchorAt);
    setError(standingsUnavailable
      ? normalizedData.server.standingsUnavailableReason
        ?? "Classement indisponible; dernières données valides conservées."
      : null);
    setIsLoading(false);
    return true;
  }, [sourceId]);

  const clearUnavailableData = useCallback((message: string) => {
    if (!mountedRef.current) return;
    setSource(sourceId);
    setError(message);
    setIsLive(false);
    setStandingsMotionAvailable(false);
    setIsLoading(false);
    setTransport("reconnecting");
    const lastGoodData = lastGoodDataRef.current;
    if (lastGoodData?.sourceId === sourceId) {
      setData(markLiveTimingUnavailable(lastGoodData));
      setSnapshotReceivedMonotonicAt(null);
      setCountdownAnchorMonotonicAt(null);
    } else {
      const recoveryData = emptyDataForSource(sourceId);
      setData(recoveryData);
      setLastUpdated(null);
      setSnapshotReceivedAt(null);
      setSnapshotReceivedMonotonicAt(null);
      setCountdownAnchorMonotonicAt(null);
    }
  }, [sourceId]);

  const refresh = useCallback(async () => {
    const provider = new PublicLiveTimingProvider(sourceId);
    if (mountedRef.current) setIsLoading(true);
    try {
      const result = await provider.fetch();
      applyResult(result);
    } catch (reason) {
      if (!mountedRef.current) return;
      const message = reason instanceof Error ? reason.message : "Live Timing indisponible";
      clearUnavailableData(message);
    }
  }, [applyResult, clearUnavailableData, sourceId]);

  const recoverSnapshotSilently = useCallback(async () => {
    if (!mountedRef.current || recoveryFetchInFlightRef.current) return;
    recoveryFetchInFlightRef.current = true;
    try {
      const result = await new PublicLiveTimingProvider(sourceId).fetch();
      if (mountedRef.current && activeSourceIdRef.current === sourceId) applyResult(result);
    } catch (reason) {
      if (!mountedRef.current || activeSourceIdRef.current !== sourceId) return;
      const message = reason instanceof Error ? reason.message : "Live Timing indisponible";
      clearUnavailableData(message);
    } finally {
      recoveryFetchInFlightRef.current = false;
    }
  }, [applyResult, clearUnavailableData, sourceId]);

  useEffect(() => {
    const recoveryTimer = window.setInterval(() => {
      if (performance.now() - lastSseSnapshotAtRef.current < SSE_SNAPSHOT_STALE_AFTER_MS) return;
      setTransport("reconnecting");
      void recoverSnapshotSilently();
    }, SNAPSHOT_RECOVERY_POLL_INTERVAL_MS);

    return () => window.clearInterval(recoveryTimer);
  }, [recoverSnapshotSilently]);

  useEffect(() => {
    activeSourceIdRef.current = sourceId;
    lastSseSnapshotAtRef.current = performance.now();
  }, [sourceId]);

  useEffect(() => {
    mountedRef.current = true;
    const provider = new PublicLiveTimingProvider(sourceId);

    const closeStream = provider.openStream(
      (result) => {
        if (activeSourceIdRef.current !== sourceId) return;
        if (applyResult(result)) {
          lastSseSnapshotAtRef.current = performance.now();
          setTransport("sse");
        }
      },
      () => {
        if (!mountedRef.current || activeSourceIdRef.current !== sourceId) return;
        setTransport("reconnecting");
        void recoverSnapshotSilently();
      },
    );

    return () => {
      mountedRef.current = false;
      closeStream();
    };
  }, [applyResult, recoverSnapshotSilently, sourceId]);

  const hasCurrentData = data.sourceId === sourceId;
  const visibleData = hasCurrentData ? data : emptyDataForSource(sourceId);

  return {
    data: visibleData,
    source: source === sourceId ? source : sourceId,
    isLive: hasCurrentData && isLive,
    standingsMotionAvailable: hasCurrentData && standingsMotionAvailable,
    isLoading: !hasCurrentData || isLoading,
    error: hasCurrentData ? error : null,
    lastUpdated: hasCurrentData ? lastUpdated : null,
    snapshotReceivedAt: hasCurrentData ? snapshotReceivedAt : null,
    snapshotReceivedMonotonicAt: hasCurrentData ? snapshotReceivedMonotonicAt : null,
    countdownAnchorMonotonicAt: hasCurrentData ? countdownAnchorMonotonicAt : null,
    serverReadyElapsedAnchor:
      hasCurrentData && serverReadyElapsedAnchor?.sourceId === sourceId
        ? serverReadyElapsedAnchor
        : null,
    transport: hasCurrentData ? transport : "connecting",
    refresh,
  };
}
