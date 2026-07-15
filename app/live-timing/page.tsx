import type { Metadata } from "next";
import { LiveTimingHero } from "../_components/live-timing-hero";
import { SessionBanner } from "../_components/live-timing-session-banner";
import { ServerInfoPanel } from "../_components/live-timing-server-info";
import { StandingsTable } from "../_components/live-timing-standings";
import { SiteFooter } from "../_components/site-footer";
import { ScrollTopButton } from "../_components/scroll-top-button";
import { mockLiveTimingData } from "../_data/live-timing-data";

export const metadata: Metadata = {
  title: "Live Timing Premium — B404 RaceControl",
  description:
    "Suivez les sessions B404 en direct : classements en temps réel, temps au tour, informations serveur et météo.",
};

/**
 * Page Live Timing Premium — B404 RaceControl
 *
 * Affiche les données de course en direct (actuellement simulées).
 * Sprint 1 — Fondation modulaire. Aucune connexion R2LA.
 *
 * @see live-timing-data.ts pour remplacer les mock data par R2LA
 */
export default function LiveTimingPage() {
  const data = mockLiveTimingData;

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <LiveTimingHero />
      <SessionBanner session={data.session} />
      <ServerInfoPanel server={data.server} />
      <StandingsTable standings={data.standings} />
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
