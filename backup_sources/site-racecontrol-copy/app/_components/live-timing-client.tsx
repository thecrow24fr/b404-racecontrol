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

import type { LiveTimingData } from "../_types/live-timing";
import { useLiveTiming } from "../_services/use-live-timing";
import { LiveTimingHero } from "./live-timing-hero";
import { SessionBanner } from "./live-timing-session-banner";
import { ServerInfoPanel } from "./live-timing-server-info";
import { StandingsTable } from "./live-timing-standings";
import { SiteFooter } from "./site-footer";
import { ScrollTopButton } from "./scroll-top-button";

interface LiveTimingClientProps {
  serverId?: number;
}

function LiveTimingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#06101d] text-white">
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      <p className="text-sm text-gray-400">Connexion au serveur...</p>
    </div>
  );
}

function LiveTimingOffline({
  serverId,
  error,
  onRetry,
}: {
  serverId: number;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#06101d] text-white">
      <div className="mb-6 text-5xl">📡</div>
      <h2 className="mb-2 text-xl font-black">Serveur hors ligne</h2>
      <p className="mb-1 text-sm text-gray-400">Serveur {serverId}</p>
      {error && (
        <p className="mb-6 text-xs text-red-400/80">{error}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-white/10 px-6 py-2 text-sm font-bold text-gray-300 transition hover:border-orange-400/30 hover:text-orange-200"
      >
        Réessayer
      </button>
    </div>
  );
}

export function LiveTimingClient({ serverId = 2 }: LiveTimingClientProps) {
  const { data, source, isLive, isLoading, error, lastUpdated, refresh } =
    useLiveTiming(serverId);

  // ── CAS 1 : Premier chargement ──
  if (isLoading && !data) {
    return <LiveTimingSkeleton />;
  }

  // ── CAS 2 : Aucune donnée (offline permanent) ──
  if (!data) {
    return (
      <LiveTimingOffline
        serverId={serverId}
        error={error}
        onRetry={refresh}
      />
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
    ? `Mis à jour il y a ${Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s`
    : "";

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
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
      <LiveTimingHero />
      <SessionBanner session={data.session} />
      <ServerInfoPanel server={data.server} />
      <StandingsTable standings={data.standings} />
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
