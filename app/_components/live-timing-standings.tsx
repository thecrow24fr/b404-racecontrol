"use client";

import { ChevronDown, ChevronUp, Timer, TriangleAlert } from "lucide-react";
import type { ServerInfo, StandingEntry } from "../_types/live-timing";
import { bestLapDriver, raceProgress } from "../_services/live-timing-table-model.mjs";
import { StandingRow } from "./live-timing-standing-row";

interface StandingsTableProps {
  standings: StandingEntry[];
  server: ServerInfo;
  isLive: boolean;
}

export function StandingsTable({ standings, server, isLive }: StandingsTableProps) {
  const bestLap = bestLapDriver(standings);
  const sessionLabel = server.currentSession.trim() || "Session";
  const progress = raceProgress(server);

  if (standings.length === 0) {
    return (
      <section className="border-b border-white/10 bg-[#06101d]">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <Timer className="mx-auto h-12 w-12 text-orange-300" />
          <p className="mt-4 text-lg font-bold text-white">Classement en attente</p>
          <p className="mt-2 text-sm text-gray-400">
            Aucun classement public n’a encore été reçu pour cette session.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="w-full max-w-none px-3 py-8 sm:px-4 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Classement</p>
            <h2 className="mt-1 text-2xl font-black text-white">Classement — {sessionLabel}</h2>
            <p className="mt-2 inline-flex items-center rounded-full border border-orange-400/20 bg-orange-500/10 px-3 py-1 text-xs font-bold tabular-nums text-orange-200">
              {progress.label}{progress.remaining ? ` · ${progress.remaining}` : ""}
            </p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${isLive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-amber-300/30 bg-amber-500/10 text-amber-200"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "animate-glow-pulse bg-emerald-400" : "bg-amber-300"}`} />
            {isLive ? "Live" : "Flux en attente"}
          </span>
        </div>

        {bestLap && (
          <div className="mb-4 rounded-2xl border border-purple-400/20 bg-purple-500/5 px-4 py-2.5">
            <p className="text-xs text-purple-200">
              <span className="font-bold text-purple-300">Meilleur tour :</span>{" "}
              <span className="font-mono font-bold">{bestLap.bestLap}</span> — {bestLap.driverName}
            </p>
          </div>
        )}

        <div className="mb-3 flex items-center gap-4 text-[10px] text-gray-300">
          <span className="inline-flex items-center gap-1 text-emerald-300"><ChevronUp className="h-3 w-3" />Gain</span>
          <span className="inline-flex items-center gap-1 text-red-300"><ChevronDown className="h-3 w-3" />Perte</span>
          <span className="inline-flex items-center gap-1 text-amber-200"><TriangleAlert className="h-3 w-3" />Statuts selon le flux reçu</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[1640px] table-fixed">
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-white/10 bg-[#0b1728]">
                <Th>Pos.</Th>
                <Th>Évol.</Th>
                <Th>Pilote</Th>
                <Th>Classe</Th>
                <Th>Voiture</Th>
                <Th>Tours</Th>
                <Th>Arrêts</Th>
                <Th>Écart</Th>
                <Th><span className="block text-purple-300">Meilleur</span><span className="block text-blue-400">Dernier tour</span></Th>
                <Th><span className="block text-purple-300">S1</span><span className="block text-blue-400">S1</span></Th>
                <Th><span className="block text-purple-300">S2</span><span className="block text-blue-400">S2</span></Th>
                <Th><span className="block text-purple-300">S3</span><span className="block text-blue-400">S3</span></Th>
                <Th className="text-orange-300">Optimal</Th>
                <Th>Pneus AV/AR</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {standings.map((entry) => (
                <StandingRow
                  key={entry.participantId ?? `${entry.position}-${entry.driverName}`}
                  entry={entry}
                  isFastestLap={entry.participantId
                    ? entry.participantId === bestLap?.participantId
                    : entry === bestLap}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-gray-400 ${className}`}>
      {children}
    </th>
  );
}
