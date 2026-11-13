"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import type { LapHistoryEntry, StandingEntry } from "../_types/live-timing";
import { fetchLiveTimingLapHistory, type LiveTimingSourceId } from "../_services/public-live-timing-provider";

interface LapHistoryDialogProps {
  entry: StandingEntry;
  sourceId: LiveTimingSourceId;
  onClose: () => void;
}

function shown(value: string | null | undefined): string {
  return value?.trim() || "—";
}

type LapSectorKey = "sector1" | "sector2" | "sector3";

function sectorSeconds(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":").map(Number);
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  return parts[0] * 60 + parts[1];
}

function bestCompletedSector(laps: LapHistoryEntry[], sector: LapSectorKey): string | null {
  return laps
    .filter((lap) => lap.status === "completed" && sectorSeconds(lap[sector]) !== null)
    .reduce<string | null>((best, lap) => {
      if (best === null) return lap[sector];
      const currentSeconds = sectorSeconds(lap[sector]);
      const bestSeconds = sectorSeconds(best);
      return currentSeconds !== null && bestSeconds !== null && currentSeconds < bestSeconds ? lap[sector] : best;
    }, null);
}

export function LapHistoryDialog({ entry, sourceId, onClose }: LapHistoryDialogProps) {
  const [laps, setLaps] = useState<LapHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bestSectors = laps === null ? null : {
    sector1: bestCompletedSector(laps, "sector1"),
    sector2: bestCompletedSector(laps, "sector2"),
    sector3: bestCompletedSector(laps, "sector3"),
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetchLiveTimingLapHistory(sourceId, entry.participantId ?? "", controller.signal)
      .then((history) => setLaps(history))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Historique des tours indisponible");
      });
    return () => controller.abort();
  }, [entry.participantId, sourceId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="lap-history-title"
        className="flex max-h-[94vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080b10] text-white shadow-2xl shadow-black/60"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 bg-gradient-to-r from-white/20 via-white/[0.07] to-transparent px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="border-r border-white/25 pr-4 text-3xl font-light tabular-nums text-white/90 sm:text-5xl">
              {entry.position}
            </span>
            <div className="min-w-0">
              <h2 id="lap-history-title" className="truncate text-xl font-semibold sm:text-3xl">
                {entry.driverName}
              </h2>
              <p className="truncate text-sm text-white/80 sm:text-lg">
                {entry.car || "Voiture non renseignée"}
                {entry.carClass ? ` · ${entry.carClass}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l’historique des tours"
            className="shrink-0 rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            <X className="h-7 w-7 sm:h-9 sm:w-9" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 grid grid-cols-[1.25fr_repeat(4,minmax(0,1fr))] items-center gap-2 rounded-lg border border-purple-300/10 bg-white/[0.035] px-3 py-3 text-center">
              <span className="text-left text-[10px] font-black uppercase tracking-wide text-white/75 sm:text-xs">
                Tour optimal
              </span>
              <span className="font-mono text-xs text-purple-300 sm:text-sm">{shown(entry.sector1)}</span>
              <span className="font-mono text-xs text-purple-300 sm:text-sm">{shown(entry.sector2)}</span>
              <span className="font-mono text-xs text-purple-300 sm:text-sm">{shown(entry.sector3)}</span>
              <span className="font-mono text-sm font-bold text-purple-300 sm:text-base">{shown(entry.optimalLap)}</span>
            </div>

            <div className="min-h-[170px] flex-1 overflow-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[620px] table-fixed text-sm">
                <thead className="sticky top-0 z-10 bg-[#12151a] text-[10px] font-black uppercase tracking-wide text-white/55 sm:text-xs">
                  <tr>
                    <th className="w-[12%] px-2 py-3 text-left">Tour</th>
                    <th className="w-[10%] px-2 py-3 text-center">Pos.</th>
                    <th className="w-[14%] px-2 py-3 text-right">S1</th>
                    <th className="w-[14%] px-2 py-3 text-right">S2</th>
                    <th className="w-[14%] px-2 py-3 text-right">S3</th>
                    <th className="w-[24%] px-2 py-3 text-right">Temps du tour</th>
                    <th className="w-[12%] px-2 py-3 text-center">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08]">
                  {laps?.map((lap) => (
                    <tr key={lap.lap} className={lap.status === "completed" ? "text-white/75" : "text-white/35"}>
                      <td className="px-2 py-3 font-semibold">Tour {lap.lap}</td>
                      <td className="px-2 py-3 text-center tabular-nums">{lap.position ?? "—"}</td>
                      <td className={`px-2 py-3 text-right font-mono tabular-nums ${lap.status === "completed" && bestSectors?.sector1 === lap.sector1 ? "text-purple-300 font-semibold" : ""}`}>{shown(lap.sector1)}</td>
                      <td className={`px-2 py-3 text-right font-mono tabular-nums ${lap.status === "completed" && bestSectors?.sector2 === lap.sector2 ? "text-purple-300 font-semibold" : ""}`}>{shown(lap.sector2)}</td>
                      <td className={`px-2 py-3 text-right font-mono tabular-nums ${lap.status === "completed" && bestSectors?.sector3 === lap.sector3 ? "text-purple-300 font-semibold" : ""}`}>{shown(lap.sector3)}</td>
                      <td className={`px-2 py-3 text-right font-mono font-semibold tabular-nums ${lap.status === "completed" ? "text-purple-300" : ""}`}>
                        {shown(lap.lapTime)}
                      </td>
                      <td className="px-2 py-3 text-center text-[10px] uppercase tracking-wide">
                        {lap.status === "completed" ? "Terminé" : "—"}
                      </td>
                    </tr>
                  ))}
                  {laps?.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-white/45">Aucun tour enregistré pour cette session.</td></tr>
                  )}
                  {laps === null && !error && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-white/50"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Chargement des tours…</td></tr>
                  )}
                  {error && (
                    <tr><td colSpan={7} role="alert" className="px-3 py-10 text-center text-sm text-red-300">{error}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
