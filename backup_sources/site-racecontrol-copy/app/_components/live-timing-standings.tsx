"use client";

import {
  Timer,
  Filter,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Wrench,
  TriangleAlert,
} from "lucide-react";
import type { StandingEntry } from "../_types/live-timing";
import { StandingRow } from "./live-timing-standing-row";

interface StandingsTableProps {
  standings: StandingEntry[];
}

/**
 * Tableau de classement complet — affiche la liste des pilotes
 * avec leurs temps, écarts et secteurs.
 *
 * Features préparées pour les prochains sprints :
 * - 🔄 Rafraîchissement automatique (placeholder)
 * - 📊 Filtres / Tris (placeholder)
 * - 📥 Export (placeholder)
 */
export function StandingsTable({ standings }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <section className="border-b border-white/10 bg-[#06101d]">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <Timer className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-4 text-lg font-bold text-gray-400">
            Aucune donnée de classement disponible
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Le classement apparaîtra automatiquement lorsque la session
            sera active.
          </p>
        </div>
      </section>
    );
  }

  const poleTime = standings.find((e) => e.position === 1)?.bestLap;

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* En-tête */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Classement
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Course
            </h2>
          </div>

          {/* Actions (placeholders pour futurs sprints) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200"
              title="Filtrer (à venir)"
            >
              <Filter className="h-3 w-3" />
              <span className="hidden sm:inline">Filtrer</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200"
              title="Exporter (à venir)"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-300 transition hover:bg-orange-500/20"
              title="Rafraîchir"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Live</span>
              <span className="inline-block h-1.5 w-1.5 animate-glow-pulse rounded-full bg-emerald-400" />
            </button>
          </div>
        </div>

        {/* Meilleur tour */}
        {poleTime && (
          <div className="mb-4 rounded-2xl border border-purple-400/15 bg-purple-500/5 px-4 py-2.5">
            <p className="text-xs text-purple-300">
              <span className="font-bold">Meilleur tour :</span>{" "}
              <span className="font-mono font-bold">{poleTime}</span> —{" "}
              {standings.find((e) => e.position === 1)?.driverName}
            </p>
          </div>
        )}

        {/* Tableau responsive */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px]">
            {/* En-têtes de colonnes */}
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1728]">
                <Th className="sticky left-0 z-10 w-12 bg-[#0b1728] text-left">#</Th>
                <Th className="w-8 text-center"></Th>
                <Th className="text-left">Pilote</Th>
                <Th className="hidden text-left lg:table-cell">Voiture</Th>
                <Th className="w-14 text-center">Tours</Th>
                <Th className="text-right">Écart</Th>
                <Th className="hidden text-right md:table-cell">Au suivant</Th>
                <Th className="hidden text-right lg:table-cell">Meilleur tour</Th>
                <Th className="hidden text-right xl:table-cell">Secteurs</Th>
                <Th className="w-16 text-right">Statut</Th>
              </tr>
            </thead>

            {/* Corps */}
            <tbody className="divide-y divide-white/[0.04]">
              {standings.map((entry) => (
                <StandingRow
                  key={`${entry.position}-${entry.driverName}`}
                  entry={entry}
                  isPole={entry.bestLap === poleTime}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <ChevronUp className="h-3 w-3 text-emerald-400" /> Gain
          </span>
          <span className="flex items-center gap-1">
            <ChevronDown className="h-3 w-3 text-red-400" /> Perte
          </span>
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3 text-yellow-400" /> Aux stands
          </span>
          <span className="flex items-center gap-1">
            <TriangleAlert className="h-3 w-3 text-red-400" /> Abandon
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-2 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 sm:px-3 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
