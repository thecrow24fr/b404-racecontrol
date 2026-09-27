"use client";

import { ServerCard } from "./server-card";
import { useServers } from "../_services/use-servers";

/**
 * ServersSection — Section « Sessions en direct » de la page d'accueil.
 *
 * B404 RaceControl
 *
 * Affiche les serveurs depuis le Merge Engine (données réelles).
 * Les 8 serveurs sont toujours affichés (grille fixe) ; chaque carte
 * est mise à jour par useServers avec les données live du Merge Engine.
 */

export function ServersSection() {
  const { servers, onlineCount, isLoading, error } = useServers();

  return (
    <section id="servers" className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(255,122,0,0.13),transparent_34%),linear-gradient(180deg,#09111d_0%,#06101d_100%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">Serveurs</p>
            <h2 className="text-3xl font-black sm:text-4xl">Sessions en direct</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
              Selectionnez un serveur pour acceder au Live Timing en direct.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
            <p className="text-2xl font-black leading-none text-orange-300 tabular-nums">{onlineCount}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-500">en ligne</p>
          </div>
        </div>
        {error && (
          <div className="mb-6 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            {error}
          </div>
        )}
        {isLoading && (
          <p className="mb-6 text-xs text-gray-500">Chargement des serveurs...</p>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {servers.map(s => <ServerCard key={s.id} server={s} />)}
        </div>
      </div>
    </section>
  );
}
