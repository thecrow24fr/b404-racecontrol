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
import { useState } from "react";
import type { Flag, ServerInfo, SessionPhase, StandingEntry } from "../_types/live-timing";
import type { LiveTimingSourceId } from "../_services/public-live-timing-provider";
import { formatSessionDisplayLabel } from "../_services/live-timing-session-labels";
import { bestLapEntry } from "../_services/live-timing-best-lap.mjs";
import { orderStandingsForPhase } from "../_services/live-timing-standings-order.mjs";
import { raceProgress } from "../_services/live-timing-race-progress.mjs";
import { StandingRow } from "./live-timing-standing-row";
import { SectorHeading } from "./live-timing-sector-heading";
import { LapHistoryDialog } from "./live-timing-lap-history-dialog";

interface StandingsTableProps {
  sourceId: LiveTimingSourceId;
  server: ServerInfo;
  standings: StandingEntry[];
  flags: Flag[];
  sessionName?: string;
  sessionPhase?: SessionPhase;
  pitTimerNow: number;
  snapshotReceivedMonotonicAt: number | null;
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
  sourceId,
  server,
  standings,
  flags,
  sessionName,
  sessionPhase,
  pitTimerNow,
  snapshotReceivedMonotonicAt,
}: StandingsTableProps) {
  const [lapHistoryEntry, setLapHistoryEntry] = useState<StandingEntry | null>(null);
  const [speedMetric, setSpeedMetric] = useState<"max" | "average">("max");
  if (standings.length === 0) {
    return (
      <section className="border-b border-white/10 bg-[#06101d]">
        <div role="status" aria-live="polite" className="mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center">
          <Timer className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-4 text-lg font-bold text-gray-400">
            Aucune donnée de classement disponible
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-gray-400">
            <span>Chargement du classement</span>
            <span aria-hidden="true" className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-300" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-300 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-300 [animation-delay:300ms]" />
            </span>
          </p>
          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Le classement apparaîtra automatiquement lorsque la session sera active.
          </p>
        </div>
      </section>
    );
  }

  const bestLap = bestLapEntry(standings);
  const orderedStandings = orderStandingsForPhase(standings, sessionPhase);
  const progress = raceProgress(server);

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
            {progress.mode !== "unknown" && (
              <p
                aria-live="polite"
                className="mt-2 inline-flex items-center rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs font-bold tabular-nums text-orange-200"
              >
                {progress.label}{progress.remaining ? ` · ${progress.remaining}` : ""}
              </p>
            )}
          </div>

          {/* Contrôles conservés dans le style B404 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={speedMetric === "average"}
              title="Basculer entre VMax et vitesse moyenne des tours complets"
              onClick={() => setSpeedMetric((current) => current === "max" ? "average" : "max")}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/10"
            >
              {speedMetric === "max" ? "VMax" : "Moyenne"}
            </button>
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
          <table className="w-full min-w-[1980px] table-fixed">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "4%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: "4%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: "3%" }} />
              <col style={{ width: "3%" }} />
              <col style={{ width: "4%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "4%" }} />
              <col style={{ width: "8%" }} />
              {sessionPhase === "race" && <col style={{ width: "5%" }} />}
              <col style={{ width: sessionPhase === "race" ? "9%" : "14%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1728]">
                <Th rowSpan={2} className="sticky left-0 z-10 w-16 bg-[#0b1728] text-left">Pos.</Th>
                <Th rowSpan={2} className="w-24 text-center">Évol.<span className="block text-[9px] tracking-normal">vs qualif.</span></Th>
                <Th rowSpan={2} className="text-center">Pilote</Th>
                <Th rowSpan={2} className="text-center">Classe</Th>
                <Th rowSpan={2} className="text-center">Voiture</Th>
                <Th rowSpan={2} className="text-center">Tours</Th>
                <Th rowSpan={2} className="text-center">Arrêts</Th>
                <Th rowSpan={2} className="text-center">Écart</Th>
                <Th rowSpan={2} className="text-center"><span className="block text-purple-300">Meilleur tour</span><span className="block text-blue-400">Dernier tour</span></Th>
                <th colSpan={3} className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.15em]">
                  <span className="text-purple-300">Meilleur</span><span className="text-gray-500"> / </span><span className="text-blue-400">Dernier</span>
                </th>
                <Th rowSpan={2} className="text-center text-orange-300">Optimal</Th>
                <Th rowSpan={2} className="text-center">{speedMetric === "max" ? "VMax" : "Moyenne"}<span className="block text-[9px] tracking-normal">km/h</span></Th>
                <Th rowSpan={2} className="text-center">Pneus<span className="block text-[9px] tracking-normal">AV/AR</span></Th>
                {sessionPhase === "race" && (
                  <Th rowSpan={2} className="text-center text-cyan-200">Temps d’arrêt</Th>
                )}

                <Th rowSpan={2} className="text-right">Statut</Th>
              </tr>
              <tr className="border-b border-white/10 bg-[#0b1728]">
                <Th className="text-center"><SectorHeading sector={1} flags={flags} /></Th>
                <Th className="text-center"><SectorHeading sector={2} flags={flags} /></Th>
                <Th className="text-center"><SectorHeading sector={3} flags={flags} /></Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {orderedStandings.map((entry) => (
                <StandingRow
                  key={`${entry.position}-${entry.driverName}`}
                  entry={entry}
                  isFastestLap={entry.participantId === bestLap?.entry.participantId}
                  sessionPhase={sessionPhase}
                  speedMetric={speedMetric}
                  pitTimerNow={pitTimerNow}
                  snapshotReceivedMonotonicAt={snapshotReceivedMonotonicAt}
                  onOpenLapHistory={() => setLapHistoryEntry(entry)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {lapHistoryEntry && (
          <LapHistoryDialog
            entry={lapHistoryEntry}
            sourceId={sourceId}
            onClose={() => setLapHistoryEntry(null)}
          />
        )}

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
