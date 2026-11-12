"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ServerInfo } from "../_types/live-timing";

interface LiveTimingHeroProps {
  server: ServerInfo;
  isLive: boolean;
}

export function LiveTimingHero({ server, isLive }: LiveTimingHeroProps) {
  const drivers =
    Number.isFinite(server.driversCount) && Number.isFinite(server.maxDrivers)
      ? `${server.driversCount} / ${server.maxDrivers}`
      : "—";
  const statusLabel = isLive ? "Live" : "Flux en attente";

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#09111d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,122,0,0.18),transparent_40%),linear-gradient(180deg,#09111d_0%,#06101d_100%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-breathe absolute -left-20 -top-20 h-48 w-48 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="animate-breathe absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" style={{ animationDelay: "2s" }} />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
        <div className="max-w-3xl">
          <Link
            href="/"
            className="animate-fade-up mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-orange-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&rsquo;accueil
          </Link>
          <p className="animate-fade-up animate-delay-100 mb-4 inline-flex rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-orange-200">
            Serveur S20
          </p>
          <h1 className="animate-fade-up animate-delay-200 text-4xl font-black leading-none sm:text-5xl lg:text-6xl">
            Live Timing
            <span className="mt-2 block text-orange-400">B404</span>
          </h1>
          <p className="animate-fade-up animate-delay-300 mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-300">
            Classement et informations de course issus du flux public Viewer.
          </p>
        </div>
        <div className="animate-fade-up animate-delay-400 mt-10 inline-flex flex-wrap gap-3">
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Session</span>
            <span className="ml-2 text-sm font-bold text-white">{server.currentSession || "—"}</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Pilotes</span>
            <span className="ml-2 text-sm font-bold text-white">{drivers}</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="inline-flex items-center gap-2">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isLive ? "animate-glow-pulse bg-emerald-400" : "bg-amber-400"}`} />
              <span className={`text-xs font-black uppercase tracking-[0.18em] ${isLive ? "text-emerald-400" : "text-amber-300"}`}>
                {statusLabel}
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
