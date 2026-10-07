"use client";

import { useState } from "react";
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
import type { SessionPhase, StandingEntry } from "../_types/live-timing";
import { formatSessionDisplayLabel } from "../_services/live-timing-session-labels";
import { bestLapEntry } from "../_services/live-timing-best-lap.mjs";
import { orderStandingsForPhase } from "../_services/live-timing-standings-order.mjs";
import { StandingRow } from "./live-timing-standing-row";
import { TyreHistoryDialog } from "./live-tyre-history-dialog";

interface StandingsTableProps {
  standings: StandingEntry[];
  sessionName?: string;
  sessionPhase?: SessionPhase;
}

function rankingSessionLabel(sessionName?: string, sessionPhase?: SessionPhase): string {
  const normalized = sessionName?.trim();
  if (normalized && !/^non disponible|^—$/i.test(normalized)) {
    return formatSessionDisplayLabel(normalized);
  }
  switch (sessionPhase) {
    case "practice":
      return "Essais libres";
    case "qualifying":
      return "Qualifications";
    case "race":
      return "Course";
    case "finished":
      return "Session terminée";
    case "paused":
      return "Session en pause";
    default:
      return "Session";
  }
}

/**
 * Tableau de classement complet — les informations absentes du DTO restent
 * visibles comme « — » afin de ne jamais fabriquer une télémétrie.
 */
export function StandingsTable({
  standings,
  sessionName,
  sessionPhase,
}: StandingsTableProps) {
  const [historyEntry, setHistoryEntry] = useState<StandingEntry | null>(null);
  if (standings.length === 0) {
    return (
      <section className="border-b border-white/10 bg-[#06101d]">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <Timer className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-4 text-lg font-bold text-gray-400">
            Aucune donnée de classement disponible
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Le classement apparaîtra automatiquement lorsque la session sera active.
          </p>
        </div>
      </section>
    );
  }

  const bestLap = bestLapEntry(standings);
  const orderedStandings = orderStandingsForPhase(standings, sessionPhase);

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="w-full max-w-none px-3 py-8 sm:px-4 lg:px-6">
        {/* En-tête */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Classement
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Classement — {rankingSessionLabel(sessionName, sessionPhase)}
            </h2>
          </div>

          {/* Contrôles conservés dans le style B404 */}
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

        {/* Meilleur tour — indépendant de Dernier tour */}
        {bestLap && (
          <div className="mb-4 rounded-2xl border border-purple-400/15 bg-purple-500/5 px-4 py-2.5">
            <p className="text-xs text-purple-300">
              <span className="font-bold">Meilleur tour :</span>{" "}
              <span className="font-mono font-bold">{bestLap.entry.bestLap}</span> —{" "}
              {bestLap.entry.driverName}
            </p>
          </div>
        )}

        {/* Tableau responsive : la largeur permet de consulter toutes les colonnes par défilement horizontal. */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1800px]">
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1728]">
                <Th rowSpan={2} className="sticky left-0 z-10 w-16 bg-[#0b1728] text-left">Pos.</Th>
                <Th rowSpan={2} className="w-24 text-center">Évol.<span className="block text-[9px] tracking-normal">vs qualif.</span></Th>
                <Th rowSpan={2} className="text-left">Pilote</Th>
                <Th rowSpan={2} className="text-center">Pneus</Th>
                <Th rowSpan={2} className="text-center">Classe</Th>
                <Th rowSpan={2} className="text-left">Voiture</Th>
                <Th rowSpan={2} className="text-center">Tours</Th>
                <Th rowSpan={2} className="text-center">Arrêts</Th>
                <Th rowSpan={2} className="text-right">Écart</Th>
                <Th rowSpan={2} className="text-right">Meilleur<span className="block">tour</span></Th>
                <Th rowSpan={2} className="text-right">Dernier<span className="block">tour</span></Th>
                <th colSpan={3} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                  Secteurs du dernier tour
                </th>
                <Th rowSpan={2} className="text-right">VMax<span className="block text-[9px] tracking-normal">km/h</span></Th>
                <Th rowSpan={2} className="text-center">Pneus<span className="block text-[9px] tracking-normal">AV/AR</span></Th>
                <Th rowSpan={2} className="text-right">Carburant</Th>
                <th colSpan={4} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">
                  Usure des 4 pneus
                </th>
                <Th rowSpan={2} className="text-right">Statut</Th>
              </tr>
              <tr className="border-b border-white/10 bg-[#0b1728]">
                <Th className="text-right">S1</Th>
                <Th className="text-right">S2</Th>
                <Th className="text-right">S3</Th>
                <Th className="text-right">AVG</Th>
                <Th className="text-right">AVD</Th>
                <Th className="text-right">ARG</Th>
                <Th className="text-right">ARD</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {orderedStandings.map((entry) => (
                <StandingRow
                  key={`${entry.position}-${entry.driverName}`}
                  entry={entry}
                  isFastestLap={entry.participantId === bestLap?.entry.participantId}
                  sessionPhase={sessionPhase}
                  onOpenTyreHistory={setHistoryEntry}
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
            <Wrench className="h-3 w-3 text-cyan-300" /> Aux stands
          </span>
          <span className="flex items-center gap-1">
            <TriangleAlert className="h-3 w-3 text-red-400" /> Abandon
          </span>
        </div>
        {historyEntry ? <TyreHistoryDialog entry={historyEntry} onClose={() => setHistoryEntry(null)} /> : null}
      </div>
    </section>
  );
}

function Th({
  children,
  className,
  rowSpan,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
}) {
  return (
    <th
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`px-1.5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 sm:px-2 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
