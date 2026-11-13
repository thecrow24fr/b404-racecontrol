"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import {
  fetchLiveTimingSources,
  type LiveTimingSourceId,
  type LiveTimingSourceOption,
} from "../_services/public-live-timing-provider";
import { useLiveTiming } from "../_services/use-live-timing";
import { formatCurrentTimes } from "../_services/live-timing-received-clock.mjs";
import { projectElapsedSeconds } from "../_services/live-timing-elapsed-clock.mjs";

import { formatRFactorDuration, nextMonotonicSecondBoundary, subtractElapsedSeconds } from "../_services/live-timing-formatters";
import { LiveTimingHero } from "./live-timing-hero";
import { LiveTimingTrackLine } from "./live-timing-track-line";
import { SessionBanner } from "./live-timing-session-banner";
import { ServerInfoPanel } from "./live-timing-server-info";
import { StandingsTable } from "./live-timing-standings";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { ScrollTopButton } from "./scroll-top-button";

interface LiveTimingClientProps {
  initialData?: LiveTimingData;
  sourceId?: LiveTimingSourceId;
}

export function LiveTimingClient({
  initialData,
  sourceId = "s20_vm",
}: LiveTimingClientProps) {
  const [sources, setSources] = useState<LiveTimingSourceOption[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<LiveTimingSourceId>(sourceId);
  const [sourceListError, setSourceListError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const loadSources = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const configuredSources = await fetchLiveTimingSources();
        if (cancelled) return;
        setSources(configuredSources);
        setSelectedSourceId((current) =>
          configuredSources.some((item) => item.sourceId === current)
            ? current
            : configuredSources[0]?.sourceId ?? current,
        );
        setSourceListError(
          configuredSources.length === 0
            ? "Aucun serveur en ligne dans RaceControl Manager"
            : null,
        );
      } catch (reason) {
        if (!cancelled) {
          setSourceListError(
            reason instanceof Error
              ? reason.message
              : "Configuration des serveurs Live indisponible",
          );
        }
      } finally {
        inFlight = false;
      }
    };
    void loadSources();
    const refreshTimer = window.setInterval(() => void loadSources(), 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  const {
    data,
    isLive,
    standingsMotionAvailable,
    isLoading,
    error,
    snapshotReceivedMonotonicAt,
    countdownAnchorMonotonicAt,
    serverReadyElapsedAnchor,
    refresh,
  } = useLiveTiming(initialData, selectedSourceId);
  const [wallClockNow, setWallClockNow] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      setWallClockNow(now);
      timer = window.setTimeout(tick, Math.max(1, 1000 - (now % 1000)));
    };
    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
  const currentTimes = formatCurrentTimes(wallClockNow);
  const [clockNow, setClockNow] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const tick = () => {
      if (cancelled) return;
      const now = performance.now();
      setClockNow(now);
      const delay = countdownAnchorMonotonicAt === null
        ? 1000
        : Math.max(1, nextMonotonicSecondBoundary(countdownAnchorMonotonicAt, now) - now);
      timer = window.setTimeout(tick, delay);
    };
    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [countdownAnchorMonotonicAt]);
  const elapsedSinceAnchor = countdownAnchorMonotonicAt !== null
    ? Math.max(0, Math.floor((clockNow - countdownAnchorMonotonicAt) / 1000))
    : 0;
  const liveServer = useMemo(() => elapsedSinceAnchor > 0
    ? {
        ...data.server,
        timeRemaining: subtractElapsedSeconds(data.server.timeRemaining, elapsedSinceAnchor),
      }
    : data.server,
  [data.server, elapsedSinceAnchor]);
  const activeReadyElapsedAnchor = serverReadyElapsedAnchor?.sourceId === selectedSourceId
    ? serverReadyElapsedAnchor
    : null;
  const readyElapsedSeconds = data.server.status === "offline"
    || data.session.serverReadyElapsed == null
    ? null
    : projectElapsedSeconds(
        data.session.serverReadyElapsed,
        snapshotReceivedMonotonicAt,
        clockNow,
        activeReadyElapsedAnchor,
      );
  const projectedServerReadyElapsed = data.server.status === "offline"
    ? null
    : readyElapsedSeconds === null
      ? data.session.serverReadyElapsed ?? null
      : formatRFactorDuration(readyElapsedSeconds);
  const liveSession = useMemo(() => {
    const sessionTimeRemaining = elapsedSinceAnchor > 0
      ? subtractElapsedSeconds(data.session.sessionTimeRemaining, elapsedSinceAnchor)
      : data.session.sessionTimeRemaining;
    if (
      projectedServerReadyElapsed === data.session.serverReadyElapsed
      && sessionTimeRemaining === data.session.sessionTimeRemaining
    ) {
      return data.session;
    }
    return {
      ...data.session,
      serverReadyElapsed: projectedServerReadyElapsed,
      sessionTimeRemaining,
    };
  }, [data.session, elapsedSinceAnchor, projectedServerReadyElapsed]);
  const selectedSource = sources.find((item) => item.sourceId === selectedSourceId);
  const sourceLabel = selectedSource?.label ?? `Source ${selectedSourceId}`;
  const publicError = error === data.server.standingsUnavailableReason ? null : error;
  const trackSessionKey = [
    selectedSourceId,
    data.session.sessionCode ?? data.server.currentSession,
    data.session.phase,
  ].join(":");
  const sourceBadgeClass = isLive
    ? "bg-emerald-500/10 text-emerald-400"
    : "bg-amber-500/10 text-amber-400";

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <div className="border-b border-white/5 bg-[#0a1420]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-3 px-6 py-3 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex min-w-0 items-center justify-start gap-3 lg:col-start-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${sourceBadgeClass}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isLive ? "animate-glow-pulse bg-emerald-400" : "bg-amber-400"
                }`}
              />
              {sourceLabel}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-center gap-3 lg:col-start-2">
            <label htmlFor="live-timing-source" className="text-xs font-bold uppercase tracking-[0.12em] text-gray-300">
              Choisir un serveur
            </label>
            <select
              id="live-timing-source"
              aria-label="Choisir un serveur"
              value={selectedSourceId}
              onChange={(event) => {
                const next = event.target.value;
                if (sources.some((item) => item.sourceId === next)) {
                  setSelectedSourceId(next);
                }
              }}
              disabled={sources.length === 0}
              className="min-w-0 flex-1 rounded-xl border border-orange-400/35 bg-[#0d1b2e] px-4 py-2.5 text-sm font-bold text-gray-100 shadow-lg shadow-black/20 outline-none transition hover:border-orange-300/70 focus:border-orange-300 disabled:opacity-50 sm:min-w-[22rem] sm:flex-none"
            >
              {sources.length === 0 ? (
                <option value={selectedSourceId}>{sourceListError ?? "Chargement des serveurs…"}</option>
              ) : (
                sources.map((item) => (
                  <option key={item.sourceId} value={item.sourceId}>
                    {item.label}
                  </option>
                ))
              )}
            </select>

            {sourceListError && sources.length === 0 && (
              <span
                role="status"
                aria-live="polite"
                className="truncate text-[10px] text-amber-400"
              >
                {sourceListError}
              </span>
            )}
            {publicError && (
              <span
                role="status"
                aria-live="polite"
                className="text-[10px] text-amber-400"
              >
                {publicError}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-center gap-3 lg:col-start-3 lg:justify-end">
            <div
              className="hidden whitespace-nowrap text-right text-[10px] leading-4 text-gray-500 sm:flex sm:flex-col"
              data-current-utc={currentTimes.iso}
              data-current-paris={currentTimes.paris}
            >
              <time dateTime={currentTimes.iso || undefined}>Heure UTC {currentTimes.utc}</time>
              <time dateTime={currentTimes.iso || undefined}>Heure Paris {currentTimes.paris}</time>
            </div>
            {isLoading && <span className="text-[10px] text-gray-500">Réception…</span>}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200 disabled:opacity-50"
              title="Demander un snapshot Live Timing"
            >
              {isLoading ? "…" : "Rafraîchir"}
            </button>
          </div>
        </div>
      </div>
      <LiveTimingHero server={liveServer} />
      <SessionBanner session={liveSession} server={liveServer} />
      <ServerInfoPanel
        server={liveServer}
        trackTemperature={liveSession.trackTemp}
        weatherClientStatus={liveSession.weatherClientStatus}
      />
      <LiveTimingTrackLine
        key={trackSessionKey}
        sourceId={selectedSourceId}
        sessionKey={trackSessionKey}
        trackTechnicalId={data.server.trackTechnicalId ?? null}
        lapDistance={data.server.lapDistance ?? null}
        trackLength={data.server.trackLength ?? null}
        trackLengthSource={data.server.trackLengthSource ?? null}
        standings={data.standings}
        motionAvailable={standingsMotionAvailable}
        flags={data.session.flags}
        snapshotTimeMs={snapshotReceivedMonotonicAt}
        sourceFetchedAt={data.fetchedAt}
      />
      <StandingsTable
        sourceId={selectedSourceId}
        server={liveServer}
        standings={data.standings}
        flags={data.session.flags}
        sessionName={data.server.currentSession}
        sessionPhase={data.session.phase}
        pitTimerNow={clockNow}
        snapshotReceivedMonotonicAt={snapshotReceivedMonotonicAt}
      />
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
