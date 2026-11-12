"use client";

import { ChevronDown, ChevronUp, Minus, TriangleAlert, Wrench } from "lucide-react";
import type { StandingEntry } from "../_types/live-timing";
import { carNumberStatusBadge, positionDelta } from "../_services/live-timing-table-model.mjs";

interface StandingRowProps {
  entry: StandingEntry;
  isFastestLap: boolean;
}

const missing = "—";

export function StandingRow({ entry, isFastestLap }: StandingRowProps) {
  const delta = positionDelta(entry.prevPosition, entry.position);
  const numberStatusBadge = carNumberStatusBadge(entry.status);
  const tyreLabel = [entry.frontTyreCompound, entry.rearTyreCompound]
    .filter((compound): compound is string => Boolean(compound?.trim()))
    .join(" / ") || missing;
  const statusLabel = entry.inPit || entry.status === "pit"
    ? "PIT"
    : entry.status === "dnf" || entry.status === "out"
      ? entry.status.toUpperCase()
      : entry.status === "finished"
        ? "FIN"
        : "EN PISTE";
  const statusColor = entry.inPit || entry.status === "pit"
    ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-200"
    : entry.status === "dnf" || entry.status === "out"
      ? "border-red-400/30 bg-red-500/10 text-red-300"
      : entry.status === "finished"
        ? "border-blue-400/30 bg-blue-500/10 text-blue-300"
        : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";

  return (
    <tr className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isFastestLap ? "bg-purple-500/[0.035]" : ""}`}>
      <td className="sticky left-0 z-10 bg-[#0d1b2e] px-3 py-2.5 text-left group-hover:bg-[#0f1e32]">
        <span className="font-black tabular-nums text-white">{entry.position}</span>
      </td>
      <td className="px-2 py-2.5 text-center">
        {delta.direction === "gain" ? (
          <span className="inline-flex items-center gap-0.5 font-bold text-emerald-300"><ChevronUp className="h-3.5 w-3.5" />{delta.amount}</span>
        ) : delta.direction === "loss" ? (
          <span className="inline-flex items-center gap-0.5 font-bold text-red-300"><ChevronDown className="h-3.5 w-3.5" />{delta.amount}</span>
        ) : entry.prevPosition > 0 ? (
          <Minus className="mx-auto h-3.5 w-3.5 text-blue-300" aria-label="Position inchangée" />
        ) : (
          <span className="text-blue-300">{missing}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-left">
        <p className="truncate font-bold text-white">{entry.driverName || missing}</p>
        <p className="truncate text-[11px] text-gray-400">{entry.team || missing}</p>
      </td>
      <td className="px-2 py-2.5 text-center text-sm font-semibold text-white">{entry.carClass || missing}</td>
      <td className="px-3 py-2.5 text-center text-sm text-white">
        <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
          <span>{entry.car || missing}</span>
          {numberStatusBadge && (
            <span className="rounded border border-red-400/40 bg-red-500/15 px-1.5 py-0.5 text-[9px] font-black leading-none tracking-wide text-red-300">
              {numberStatusBadge}
            </span>
          )}
        </span>
      </td>
      <td className="px-2 py-2.5 text-center font-bold tabular-nums text-white">{entry.laps}</td>
      <td className="px-2 py-2.5 text-center font-bold tabular-nums text-white">{entry.pitStops}</td>
      <td className="px-3 py-2.5 text-center font-mono text-sm tabular-nums text-white">{entry.gapToLeader || missing}</td>
      <td className="px-3 py-2.5 text-center font-mono tabular-nums">
        <span className="block font-bold text-purple-300">{entry.bestLap || missing}</span>
        <span className="block text-blue-400">{entry.lastLap || missing}</span>
      </td>
      <td className="px-2 py-2.5 text-center font-mono text-xs tabular-nums">
        <span className="block text-purple-300">{entry.sector1 || missing}</span>
        <span className="block text-blue-400">{entry.lastLapSector1 || missing}</span>
      </td>
      <td className="px-2 py-2.5 text-center font-mono text-xs tabular-nums">
        <span className="block text-purple-300">{entry.sector2 || missing}</span>
        <span className="block text-blue-400">{entry.lastLapSector2 || missing}</span>
      </td>
      <td className="px-2 py-2.5 text-center font-mono text-xs tabular-nums">
        <span className="block text-purple-300">{entry.sector3 || missing}</span>
        <span className="block text-blue-400">{entry.lastLapSector3 || missing}</span>
      </td>
      <td className="px-3 py-2.5 text-center font-mono text-sm tabular-nums text-orange-300">{entry.optimalLap || missing}</td>
      <td className="px-3 py-2.5 text-center text-xs font-bold text-white">{tyreLabel}</td>
      <td className="px-3 py-2.5 text-right">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}>
          {statusLabel === "PIT" ? <Wrench className="h-3 w-3" /> : null}
          {statusLabel === "DNF" || statusLabel === "OUT" ? <TriangleAlert className="h-3 w-3" /> : null}
          {statusLabel}
        </span>
      </td>
    </tr>
  );
}
