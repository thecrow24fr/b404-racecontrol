"use client";

import { Timer, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Hero dédié à la page Live Timing.
 * Affiche un titre, un sous-titre et un retour vers l'accueil.
 */
export function LiveTimingHero() {
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
        <div className="max-w-3xl">
          {/* Retour */}
          <Link
            href="/"
            className="animate-fade-up mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-orange-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l&rsquo;accueil
          </Link>

          {/* Badge */}
          <p className="animate-fade-up animate-delay-100 mb-4 inline-flex rounded-full border border-orange-400/25 bg-orange-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-orange-200">
            Temps réel
          </p>

          {/* Titre */}
          <h1 className="animate-fade-up animate-delay-200 text-4xl font-black leading-none sm:text-5xl lg:text-6xl">
            Live Timing
            <span className="mt-2 block text-orange-400">Premium</span>
          </h1>

          {/* Sous-titre */}
          <p className="animate-fade-up animate-delay-300 mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-300">
            Suivez les sessions B404 en direct avec les classements, les temps
            au tour et les informations serveur actualisées en temps réel.
          </p>
        </div>

        {/* Stats rapides */}
        <div className="animate-fade-up animate-delay-400 mt-10 inline-flex flex-wrap gap-3">
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Session</span>
            <span className="ml-2 text-sm font-bold text-white">Course</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-300">Pilotes</span>
            <span className="ml-2 text-sm font-bold text-white">26</span>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">Live</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
