"use client";

import type { LiveTimingData } from "../_types/live-timing";
import type { LiveTimingSourceId } from "../_services/public-live-timing-provider";
import { useLiveTiming } from "../_services/use-live-timing";
import { LiveTimingHero } from "./live-timing-hero";
import { LiveTimingModuleNav } from "./live-timing-module-nav";
import { SessionBanner } from "./live-timing-session-banner";
import { ServerInfoPanel } from "./live-timing-server-info";
import { StandingsTable } from "./live-timing-standings";
import { LiveTimingRecords } from "./live-timing-records";
import { LiveTimingTyres } from "./live-timing-tyres";
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
      RaceControl
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
      RaceControl
    </span>
  );

  const timeAgo = lastUpdated ? "Actualisé" : "";

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <div className="border-b border-white/5 bg-[#0a1420]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            {sourceBadge}
            {isLoading && <span className="text-[10px] text-gray-500">Chargement…</span>}
            {error && <span className="text-[10px] text-red-400">{error}</span>}
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-[10px] text-gray-500">{timeAgo}</span>}
          </div>
        </div>
      </div>
      <LiveTimingModuleNav
        isLoading={isLoading}
        onRefresh={() => refresh()}
      />
      <LiveTimingHero server={data.server} />
      <SessionBanner session={data.session} />
      <ServerInfoPanel server={data.server} />
      <StandingsTable standings={data.standings} />
      <LiveTimingRecords records={data.records} />
      <LiveTimingTyres tyres={data.tyres} />
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
