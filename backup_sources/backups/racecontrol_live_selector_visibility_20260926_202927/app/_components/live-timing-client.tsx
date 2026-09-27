"use client";

import { useEffect, useState } from "react";
import type { LiveTimingData } from "../_types/live-timing";
import {
  fetchLiveTimingSources,
  type LiveTimingSourceId,
  type LiveTimingSourceOption,
} from "../_services/public-live-timing-provider";
import { useLiveTiming } from "../_services/use-live-timing";
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

function receivedLabel(date: Date | null): string {
  if (!date) return "—";
  return `${date.toISOString().slice(11, 19)} UTC`;
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
    void fetchLiveTimingSources()
      .then((configuredSources) => {
        if (cancelled) return;
        setSources(configuredSources);
        setSelectedSourceId((current) =>
          configuredSources.some((item) => item.sourceId === current)
            ? current
            : configuredSources[0]?.sourceId ?? sourceId,
        );
        setSourceListError(null);
      })
      .catch((reason) => {
        if (cancelled) return;
        setSourceListError(
          reason instanceof Error
            ? reason.message
            : "Configuration des serveurs Live indisponible",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [sourceId]);

  const { data, isLive, isLoading, error, lastUpdated, transport, refresh } =
    useLiveTiming(initialData, selectedSourceId);
  const selectedSource = sources.find((item) => item.sourceId === selectedSourceId);
  const sourceLabel = selectedSource?.label ?? `Source ${selectedSourceId}`;
  const sourceBadgeClass = isLive
    ? "bg-emerald-500/10 text-emerald-400"
    : "bg-amber-500/10 text-amber-400";
  const transportLabel =
    transport === "sse"
      ? "Flux SSE RaceControl"
      : transport === "reconnecting"
        ? "Reconnexion du flux…"
        : "Connexion au flux…";

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <div className="border-b border-white/5 bg-[#0a1420]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
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
            <label htmlFor="live-timing-source" className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
              Serveur
            </label>
            <select
              id="live-timing-source"
              aria-label="Serveur Live Timing"
              value={selectedSourceId}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "s1_vm" || next === "s20_vm") {
                  setSelectedSourceId(next);
                }
              }}
              disabled={sources.length === 0}
              className="max-w-[19rem] rounded-full border border-white/10 bg-[#0d1b2e] px-3 py-1 text-[11px] font-bold text-gray-200 outline-none transition hover:border-orange-400/40 focus:border-orange-300 disabled:opacity-50"
            >
              {sources.length === 0 ? (
                <option value={selectedSourceId}>Chargement des serveurs…</option>
              ) : (
                sources.map((item) => (
                  <option key={item.sourceId} value={item.sourceId}>
                    {item.label}
                  </option>
                ))
              )}
            </select>
            <span className="text-[10px] text-gray-500" title={selectedSource?.description}>
              {transportLabel}
            </span>
            {sourceListError && (
              <span className="truncate text-[10px] text-red-400">{sourceListError}</span>
            )}
            {error && <span className="truncate text-[10px] text-red-400">{error}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-[10px] text-gray-500 sm:inline">
              Reçu {receivedLabel(lastUpdated)}
            </span>
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
      <LiveTimingHero server={data.server} />
      <SessionBanner session={data.session} />
      <ServerInfoPanel server={data.server} />
      <LiveTimingTrackLine
        lapDistance={data.server.lapDistance ?? null}
        standings={data.standings}
      />
      <StandingsTable
        standings={data.standings}
        sessionName={data.server.currentSession}
        sessionPhase={data.session.phase}
      />
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
