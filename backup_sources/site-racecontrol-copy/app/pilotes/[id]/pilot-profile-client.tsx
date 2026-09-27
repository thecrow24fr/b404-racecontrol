/**
 * PilotProfileClient — Composant client du profil pilote.
 */

"use client";

import { use } from "react";
import { usePilotProfile } from "../../_services/use-pilot-profile";
import { PilotHeader } from "../../_components/pilot-header";
import { PilotStatsGrid } from "../../_components/pilot-stats-grid";
import { PilotBadgeCollection } from "../../_components/pilot-badge-collection";
import { PilotResultsTable } from "../../_components/pilot-results-table";
import { PilotCareerStats } from "../../_components/pilot-career-stats";
import { PilotRatingChart } from "../../_components/pilot-rating-chart";
import { PilotNotFound } from "../../_components/pilot-not-found";
import { SiteHeader } from "../../_components/site-header";
import { SiteFooter } from "../../_components/site-footer";
import { ScrollTopButton } from "../../_components/scroll-top-button";

interface Props {
  params: Promise<{ id: string }>;
}

function PilotSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#06101d]">
      <SiteHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-[#0d1b2e] rounded-3xl" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 bg-[#0d1b2e] rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-[#0d1b2e] rounded-3xl" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function PilotProfileClient({ params }: Props) {
  const { id } = use(params);
  const {
    profile,
    recentResults,
    badges,
    stats,
    ratingHistory,
    isLoading,
    error,
  } = usePilotProfile(id);

  if (isLoading) {
    return <PilotSkeleton />;
  }

  if (error || !profile) {
    return <PilotNotFound />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#06101d]">
      <SiteHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-12">
        <PilotHeader pilot={profile} />
        <PilotStatsGrid pilot={profile} />
        <PilotBadgeCollection badges={badges} />
        <PilotResultsTable results={recentResults} />
        {stats && <PilotCareerStats stats={stats} />}
        <PilotRatingChart
          history={ratingHistory}
          currentBER={profile.ber}
          currentBSR={profile.bsr}
        />
      </main>
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
