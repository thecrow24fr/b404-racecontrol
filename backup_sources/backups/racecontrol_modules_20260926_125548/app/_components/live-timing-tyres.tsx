"use client";

import { CircleGauge, Thermometer } from "lucide-react";
import type { TyreCorner, TyreEntry, TyresData } from "../_types/live-timing";

interface LiveTimingTyresProps {
  tyres?: TyresData;
}

const CORNERS: Array<[keyof TyreEntry["corners"], string]> = [
  ["frontLeft", "Avant gauche"],
  ["frontRight", "Avant droit"],
  ["rearLeft", "Arrière gauche"],
  ["rearRight", "Arrière droit"],
];

export function LiveTimingTyres({ tyres }: LiveTimingTyresProps) {
  const data = tyres ?? {
    available: false,
    message: "Données pneus non disponibles via l’API rFactor 2.",
    evolutionAvailable: false,
    entries: [],
  };

  return (
    <section id="pneus" className="scroll-mt-28 border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center gap-3">
          <CircleGauge className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Pneus</p>
            <h2 className="mt-1 text-2xl font-black text-white">État des pneumatiques</h2>
          </div>
        </div>

        {!data.available || data.entries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] px-5 py-6 text-sm text-gray-400">
            <Thermometer className="mb-3 h-5 w-5 text-gray-500" />
            <p>{data.message}</p>
            <p className="mt-2 text-xs text-gray-500">
              Aucun composé, usure, température, pression ou évolution par tour n’est déduit.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.entries.map((entry) => (
              <div key={entry.driverName} className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold text-white">{entry.driverName}</h3>
                  <span className="text-xs text-orange-200">Composé : {entry.compound ?? "—"}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {CORNERS.map(([corner, label]) => (
                    <CornerCard key={corner} label={label} corner={entry.corners[corner]} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {data.evolutionAvailable && entry.evolution.length > 0
                    ? `Évolution fournie sur ${entry.evolution.length} point(s) de tour.`
                    : "Évolution au fil des tours non disponible via cette réponse API."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CornerCard({ label, corner }: { label: string; corner: TyreCorner }) {
  const value = (number: number | null) => (number === null ? "—" : String(number));
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs">
      <p className="mb-2 font-bold text-gray-300">{label}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-500">
        <dt>Usure API</dt><dd className="text-right text-gray-300">{value(corner.wear)}</dd>
        <dt>Température</dt><dd className="text-right text-gray-300">{value(corner.temperature)}</dd>
        <dt>Pression</dt><dd className="text-right text-gray-300">{value(corner.pressure)}</dd>
      </dl>
    </div>
  );
}
