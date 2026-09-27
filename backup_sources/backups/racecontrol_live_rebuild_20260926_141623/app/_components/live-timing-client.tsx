"use client";

import type { LiveTimingData } from "../_types/live-timing";
import type { LiveTimingSourceId } from "../_services/public-live-timing-provider";
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

export function LiveTimingClient({
  initialData,
  sourceId = "s20_vm",
}: LiveTimingClientProps) {
  const { data, isLive, isLoading, error, lastUpdated, refresh } =
    useLiveTiming(initialData, sourceId);

  const sourceBadge = isLive ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
      <span className="inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-emerald-400" />
      Source S20
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
      Source S20
    </span>
  );

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <div className="border-b border-white/5 bg-[#0a1420]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2">
          <div className="flex min-w-0 items-center gap-3">
            {sourceBadge}
            {isLoading && <span className="text-[10px] text-gray-500">Actualisation…</span>}
            {error && <span className="truncate text-[10px] text-red-400">{error}</span>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {lastUpdated && (
              <span className="hidden text-[10px] text-gray-500 sm:inline">
                Actualisé
              </span>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200 disabled:opacity-50"
              title="Rafraîchir les données Live Timing"
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
