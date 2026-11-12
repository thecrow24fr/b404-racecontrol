/**
 * LiveTimingClient — Wrapper client du Live Timing
 *
 * B404 RaceControl
 * Composant "use client" qui orchestre le Merge Engine.
 *
 * États d'affichage :
 * - isLoading && !data  → squelette de chargement
 * - !data               → hors ligne / erreur
 * - data                → données temps réel
 */

"use client";

import { useLiveTiming } from "../_services/use-live-timing";
import { LiveTimingHero } from "./live-timing-hero";
import { SessionBanner } from "./live-timing-session-banner";
import { ServerInfoPanel } from "./live-timing-server-info";
import { StandingsTable } from "./live-timing-standings";
import { SiteFooter } from "./site-footer";
import { ScrollTopButton } from "./scroll-top-button";
import { SiteHeader } from "./site-header";

interface LiveTimingClientProps {
  serverId?: number;
}

function LiveTimingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#06101d] text-white">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      <p className="text-sm text-gray-400">Connexion au flux public…</p>
      </main>
    </div>
  );
}

function LiveTimingOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#06101d] text-white">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 text-5xl" aria-hidden="true">📡</div>
        <p className="mb-3 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-amber-200">
          Serveur S20 · préparation
        </p>
        <h1 className="mb-3 text-2xl font-black sm:text-3xl">Live Timing en préparation</h1>
        <p className="mb-2 max-w-xl text-sm leading-6 text-gray-300">
          Cette page est prête à accueillir le classement public du serveur S20.
        </p>
        <p className="mb-7 max-w-xl text-sm leading-6 text-gray-500">
          Le flux public n’est pas encore raccordé. Aucune donnée de démonstration n’est affichée ; le Live apparaîtra ici dès que la source sera disponible.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-white/10 px-6 py-2 text-sm font-bold text-gray-300 transition hover:border-orange-400/30 hover:text-orange-200"
        >
          Vérifier à nouveau
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}

export function LiveTimingClient({ serverId = 20 }: LiveTimingClientProps) {
  const { data, source, isLive, isLoading, error, lastUpdated, refresh } =
    useLiveTiming(serverId);

  // ── CAS 1 : Premier chargement ──
  if (isLoading && !data) {
    return <LiveTimingSkeleton />;
  }

  // ── CAS 2 : Aucune donnée (offline permanent) ──
  if (!data) {
    return (
      <LiveTimingOffline onRetry={refresh} />
    );
  }

  // ── CAS 3 : Données disponibles ──
  const sourceBadge = isLive ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
      <span className="inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-emerald-400" />
      {source}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
      {source}
    </span>
  );

  const timeAgo = lastUpdated
    ? `Mis à jour à ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "";

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <div className="border-b border-white/5 bg-[#0a1420]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            {sourceBadge}
            {isLoading && <span className="text-[10px] text-gray-500">Chargement...</span>}
            {error && <span className="text-[10px] text-red-400">{error}</span>}
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-[10px] text-gray-500">{timeAgo}</span>}
            <button
              type="button" onClick={refresh} disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200 disabled:opacity-50"
              title="Rafraîchir"
            >
              {isLoading ? "..." : "↻"}
            </button>
          </div>
        </div>
      </div>
      <LiveTimingHero server={data.server} isLive={isLive} />
      <SessionBanner session={data.session} />
      <ServerInfoPanel server={data.server} />
      <StandingsTable
        standings={data.standings}
        server={data.server}
        isLive={isLive}
      />
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
