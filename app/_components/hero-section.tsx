"use client";

import { Timer } from "lucide-react";
import { HeroVideo } from "./hero-video";
import { useS20Summary } from "../_services/use-s20-summary";

export function HeroSection() {
  const { summary } = useS20Summary();

  return (
    <section className="relative h-dvh overflow-hidden border-b border-white/10">
      <HeroVideo />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,122,0,0.22),transparent_34%),linear-gradient(180deg,rgba(6,16,29,0.60)_0%,rgba(8,20,36,0.75)_100%)]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-breathe absolute -left-32 -top-32 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="animate-breathe absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-orange-500/15 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="animate-breathe absolute left-1/2 top-1/3 h-32 w-32 rounded-full bg-orange-400/10 blur-3xl" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <p className="animate-fade-up mb-5 inline-flex rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-orange-200">
            Portail officiel
          </p>
          <h1 className="animate-fade-up text-5xl font-black leading-none sm:text-7xl lg:text-8xl">
            B404
            <span className="mt-3 block text-orange-400">RaceControl</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-7 max-w-2xl text-lg leading-8 text-gray-300">
            Centre de contr&ocirc;le officiel des championnats B404.
            Suivez les sessions en direct, consultez les classements et
            acc&eacute;dez au Live Timing.
          </p>

          <div className="animate-fade-up mx-auto mt-10 max-w-md">
            <a
              href="/live-timing/"
              className="group relative inline-flex w-full items-center justify-center gap-3 rounded-full bg-orange-500 px-8 py-4 text-base font-bold shadow-2xl shadow-orange-500/30 transition-all duration-300 hover:scale-[1.04] hover:bg-orange-400 hover:shadow-orange-400/50 active:scale-95 sm:px-10 sm:py-4 sm:text-lg"
            >
              <Timer className="h-5 w-5 transition group-hover:rotate-[8deg]" />
              <span>Live Timing</span>
              <span className="absolute inset-0 rounded-full bg-white/10 opacity-0 transition group-hover:opacity-100" />
            </a>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              Accès central aux Live Timing des serveurs activés. Les données apparaîtront ici une fois leur flux public raccordé.
            </p>
          </div>

          <div className="animate-fade-up mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="#about"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 hover:border-orange-300 hover:bg-white/10 hover:text-orange-200"
            >
              Calendrier
            </a>
          </div>

          <div className="animate-fade-up mx-auto mt-16 grid max-w-lg grid-cols-3 overflow-hidden rounded-3xl border border-white/10 bg-[#071426]/70 backdrop-blur-xl">
            <div className="border-r border-white/10 px-4 py-4">
              <p className="text-3xl font-black text-white">S20</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                Serveur
              </p>
            </div>
            <div className="border-r border-white/10 px-4 py-4">
              <p className="text-3xl font-black text-white">{summary?.driversCount ?? "—"}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                Pilotes
              </p>
            </div>
            <div className="px-4 py-4">
              <p className="truncate text-xl font-black text-white">{summary?.currentSession ?? "—"}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-400">
                Session
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
