"use client";

import {
  ChevronUp,
  ChevronDown,
  Minus,
  Flag as FlagIcon,
  Wrench,
  TriangleAlert,
} from "lucide-react";
import type { StandingEntry } from "../_types/live-timing";

interface StandingRowProps {
  entry: StandingEntry;
  isPole?: boolean;
}

/**
 * Ligne du classement — affiche la position, les écarts, les secteurs
 * et le statut d'un pilote.
 *
 * Ce composant est conçu pour être réutilisable :
 * - Dans le tableau complet (StandingsTable)
 * - Dans des vues réduites (top 3, vue mobile)
 * - Plus tard avec des données réelles sans modification
 */
export function StandingRow({ entry, isPole = false }: StandingRowProps) {
  const startingPosition = entry.startingPosition ?? entry.prevPosition;
  const isGain = startingPosition > entry.position;

  return (
    <tr className={`group border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isPole ? "bg-orange-500/[0.03]" : ""}`}>
      {/* Position */}
      <td className="sticky left-0 z-10 bg-[#0d1b2e] px-3 py-2.5 align-middle group-hover:bg-[#0f1e32] sm:px-4">
        <div className="flex items-center gap-2">
          <span className="min-w-[1.5rem] text-right text-sm font-black tabular-nums text-white">
            {entry.position}
          </span>
          {entry.position === 1 && (
            <span className="text-xs leading-none text-orange-400">★</span>
          )}
          {entry.status === "pit" && (
            <Wrench className="h-3 w-3 text-cyan-300" />
          )}
          {entry.underYellow === true && (
            <FlagIcon className="h-3 w-3 text-yellow-300" aria-label="Sous drapeau jaune" />
          )}
          {entry.status === "dnf" && (
            <TriangleAlert className="h-3 w-3 text-red-400" />
          )}
        </div>
      </td>

      {/* Changement de position */}
      <td
        className="px-0 py-2.5 align-middle"
        title={`Position de départ ${startingPosition}, position actuelle ${entry.position}`}
        aria-label={`Position de départ ${startingPosition}, position actuelle ${entry.position}`}
      >
        <div className="flex items-center justify-center gap-1">
          {startingPosition > 0 && startingPosition !== entry.position ? (
            isGain ? (
              <ChevronUp className="h-3.5 w-3.5 text-emerald-400" aria-label="Gain" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-red-400" aria-label="Perte" />
            )
          ) : startingPosition > 0 ? (
            <Minus className="h-3 w-3 text-gray-600" aria-label="Position inchangée" />
          ) : null}
          <span className="sr-only">Départ {startingPosition}</span>
        </div>
      </td>

      {/* Pilote + Équipe */}
      <td className="px-2 py-2.5 align-middle sm:px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">
            {entry.driverName}
          </p>
          <p className="truncate text-[11px] text-gray-500">
            {entry.team}
          </p>
        </div>
      </td>

      {/* Voiture (caché sur mobile) */}
      <td className="hidden px-3 py-2.5 align-middle lg:table-cell">
        <p className="text-sm text-gray-400">{entry.car}</p>
      </td>

      {/* Tours */}
      <td className="px-2 py-2.5 align-middle text-center sm:px-3">
        <span className="text-sm font-bold tabular-nums text-white">
          {entry.laps}
        </span>
      </td>

      {/* Écart au leader */}
      <td className="px-2 py-2.5 align-middle text-right sm:px-3">
        <span
          className={`text-sm tabular-nums ${
            entry.gapToLeader === "Leader"
              ? "font-black text-orange-300"
              : "text-gray-300"
          }`}
        >
          {entry.gapToLeader}
        </span>
      </td>

      {/* Écart au suivant (caché sur mobile) */}
      <td className="hidden px-3 py-2.5 align-middle text-right md:table-cell">
        <span className="text-sm tabular-nums text-gray-400">
          {entry.gapToNext}
        </span>
      </td>

      {/* Best Lap (caché sur tablette) */}
      <td className="hidden px-3 py-2.5 align-middle text-right lg:table-cell">
        <span className="font-mono text-sm tabular-nums text-purple-400">
          {entry.bestLap}
        </span>
      </td>

      {/* Secteurs (caché sauf large écran) */}
      <td className="hidden px-3 py-2.5 align-middle text-right xl:table-cell">
        <div className="flex items-center justify-end gap-2 font-mono text-xs tabular-nums text-gray-400">
          <span>{entry.sector1}</span>
          <span className="text-white/30">|</span>
          <span>{entry.sector2}</span>
          <span className="text-white/30">|</span>
          <span>{entry.sector3}</span>
        </div>
      </td>

      {/* Carburant : valeur native, sans conversion d’unité */}
      <td className="hidden px-3 py-2.5 align-middle text-right 2xl:table-cell">
        <span className="font-mono text-xs tabular-nums text-gray-400">
          {entry.fuelFraction === null || entry.fuelFraction === undefined
            ? "—"
            : entry.fuelFraction.toFixed(3)}
        </span>
      </td>

      {/* Statut */}
      <td className="px-2 py-2.5 align-middle text-right sm:px-3">
        <div className="flex flex-wrap items-center justify-end gap-1">
          {entry.underYellow === true ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
              JAUNE
            </span>
          ) : null}
          {entry.inPit ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              PIT
            </span>
          ) : entry.status === "dnf" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
              DNF
            </span>
          ) : entry.status === "finished" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
              FIN
            </span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

// ─── Statut de session (badge arrêts au stand) ────────────────────────
