"use client";

import type { ServerInfo } from "../_types/live-timing";

interface LiveTimingHeroProps {
  server: ServerInfo;
}

const STATUS_LABELS: Record<ServerInfo["status"], string> = {
  online: "En ligne",
  offline: "Hors ligne",
  starting: "Démarrage",
  paused: "En pause",
  stale: "Périmée",
  degraded: "Dégradée",
};

const STATUS_STYLES: Record<ServerInfo["status"], string> = {
  online: "bg-emerald-400",
  offline: "bg-gray-500",
  starting: "bg-yellow-400",
  paused: "bg-yellow-300",
  stale: "bg-yellow-300",
  degraded: "bg-orange-300",
};

/**
 * Hero dédié à la page Live Timing.
 * Affiche le titre, le statut et le contexte de session.
 */
export function LiveTimingHero({ server }: LiveTimingHeroProps) {
  const sessionLabel =
    server.currentSession === "Non disponible" || server.currentSession === "--"
      ? "—"
      : server.currentSession;
  const driversLabel =
    server.driversCount === null
      ? "Non disponible"
      : String(server.driversCount);

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#09111d]">
      {/* Dégradé de fond */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,122,0,0.18),transparent_40%),linear-gradient(180deg,#09111d_0%,#06101d_100%)]" />

      {/* Éléments décoratifs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-breathe absolute -left-20 -top-20 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="animate-breathe absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl -translate-y-3 pt-[38px]">
          {/* Titre */}
          <h1 className="animate-fade-up animate-delay-200 text-center text-4xl font-black leading-none sm:text-5xl lg:text-6xl">
            Live Timing
          </h1>

          {/* Sous-titre */}
          <p className="animate-fade-up animate-delay-300 mx-auto mt-5 max-w-2xl text-center text-base leading-7 text-gray-300">
            Suivez les sessions B404 en direct avec les classements, les temps
            au tour et les informations serveur actualisées en temps réel.
          </p>
        </div>

        <div className="mt-4">
          {/* Badge */}
          <p className="animate-fade-up animate-delay-100 mb-2 flex w-fit items-center border-l-2 border-orange-400/70 pl-3 text-[11px] font-black uppercase tracking-[0.28em] text-orange-300">
            Temps réel
          </p>

          {/* Stats rapides */}
          <div className="animate-fade-up animate-delay-400 inline-flex flex-wrap gap-3">
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Session</span>
            <span className="ml-2 text-sm font-bold text-white">{sessionLabel}</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Pilotes</span>
            <span className="ml-2 text-sm font-bold text-white">{driversLabel}</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="inline-flex items-center gap-2">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  STATUS_STYLES[server.status]
                } ${server.status === "online" ? "animate-glow-pulse" : ""}`}
              />
              <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">
                {STATUS_LABELS[server.status]}
              </span>
            </span>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
