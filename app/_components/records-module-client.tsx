"use client";

import { RefreshCw } from "lucide-react";
import { emptyLiveTimingData } from "../_data/empty-live-timing-data";
import { useLiveTiming } from "../_services/use-live-timing";
import { LiveTimingRecords } from "./live-timing-records";

export function RecordsModuleClient() {
  const { data, isLoading, error, refresh } = useLiveTiming(
    emptyLiveTimingData,
    "s20_vm",
  );

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a1420] px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              Source
            </p>
            <p className="mt-1 text-sm text-gray-300">
              S20 / <span className="font-mono text-orange-200">s20_vm</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && <span className="text-xs text-gray-500">Actualisation…</span>}
            {error && <span className="text-xs text-red-400">{error}</span>}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 px-3 py-2 text-xs font-bold text-orange-200 transition hover:bg-orange-500/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Rafraîchir
            </button>
          </div>
        </div>

        <LiveTimingRecords records={data.records} />
        <p className="mt-4 text-xs leading-5 text-gray-500">
          Cette page affiche uniquement les meilleurs tours réellement présents
          dans l’historique courant fourni par RaceControl. Elle ne constitue pas
          encore une archive officielle de championnat.
        </p>
      </div>
    </section>
  );
}
