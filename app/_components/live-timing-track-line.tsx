import { Gauge, Map } from "lucide-react";
import type { StandingEntry } from "../_types/live-timing";

interface LiveTimingTrackLineProps {
  lapDistance: number | null;
  standings: StandingEntry[];
}

function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Non disponible";
  return `${(value / 1000).toFixed(3)} km`;
}

/** Vue prioritaire Live : progression linéaire issue de lapDistance natif. */
export function LiveTimingTrackLine({
  lapDistance,
  standings,
}: LiveTimingTrackLineProps) {
  const markers = standings
    .filter((entry) => entry.lapProgress !== null && entry.lapProgress !== undefined)
    .sort((a, b) => (a.lapProgress ?? 0) - (b.lapProgress ?? 0));
  const hasTrackPosition = lapDistance !== null && markers.length > 0;

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Map className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Progression Live
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Position des voitures sur le tour
              </h2>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            Longueur source : {formatDistance(lapDistance)}
          </span>
        </div>

        {!hasTrackPosition ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] px-5 py-6 text-sm text-gray-400">
            <Gauge className="mb-3 h-5 w-5 text-gray-500" aria-hidden="true" />
            <p>Position sur le tour indisponible.</p>
            <p className="mt-2 text-xs text-gray-500">
              Aucun couple lapDistance / longueur de progression exploitable n’est
              fourni par la source à cette observation.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
            <div className="relative h-24 px-3 sm:h-28 sm:px-6">
              <div className="absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500/60 via-orange-400/70 to-red-500/60 sm:left-6 sm:right-6" />
              <div className="absolute left-3 right-3 top-[calc(50%+18px)] flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:left-6 sm:right-6">
                <span>Départ</span>
                <span>Arrivée</span>
              </div>
              {markers.map((entry) => {
                const left = `${(entry.lapProgress ?? 0) * 100}%`;
                const marker = entry.carNumber?.trim() || String(entry.position);
                return (
                  <div
                    key={`${entry.position}-${entry.driverName}`}
                    className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left }}
                    title={`${marker} — ${entry.driverName}`}
                  >
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 border-orange-200 bg-orange-500 px-2 text-xs font-black text-[#06101d] shadow-lg shadow-orange-500/25 transition group-hover:scale-110">
                      {marker}
                    </span>
                    <span className="pointer-events-none absolute left-1/2 top-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#06101d] px-2 py-1 text-[10px] text-white shadow-xl group-hover:block">
                      {entry.driverName}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-gray-500">
              <span>Marqueur : numéro de voiture, sinon position</span>
              <span>Source : lapDistance rFactor 2</span>
              <span>Vue circuit non affichée sans tracé validé</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
