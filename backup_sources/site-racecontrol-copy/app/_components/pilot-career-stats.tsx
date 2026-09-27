/**
 * PilotCareerStats — Section des statistiques avancées.
 */
"use client";

import type { PilotCareerStats as Stats } from "../_types/pilot";

interface Props {
  stats: Stats;
}

export function PilotCareerStats({ stats }: Props) {
  return (
    <div className="w-full mb-8">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
        Statistiques avancées
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Taux */}
        <div className="bg-[#0d1b2e] rounded-2xl p-5 border border-white/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-3">
            Taux
          </h3>
          <div className="space-y-3">
            <StatBar label="Victoires" value={stats.winRate} />
            <StatBar label="Podiums" value={stats.podiumRate} />
            <StatBar label="Abandons" value={stats.dnfRate} color="red" />
          </div>
        </div>

        {/* Positions */}
        <div className="bg-[#0d1b2e] rounded-2xl p-5 border border-white/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-3">
            Positions
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Moyenne</span>
              <span className="text-white font-bold tabular-nums">
                P{stats.avgFinishPosition}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Meilleure</span>
              <span className="text-emerald-400 font-bold tabular-nums">
                P{stats.bestFinish}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Pire</span>
              <span className="text-red-400 font-bold tabular-nums">
                P{stats.worstFinish}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Série sans DNF</span>
              <span className="text-white font-bold tabular-nums">
                {stats.currentStreak}
              </span>
            </div>
          </div>
        </div>

        {/* Favoris */}
        <div className="bg-[#0d1b2e] rounded-2xl p-5 border border-white/10">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-3">
            Favoris
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-gray-500">Circuits</span>
              <ul className="text-sm text-white">
                {stats.topFavoriteCircuits.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">Véhicules</span>
              <ul className="text-sm text-white">
                {stats.topFavoriteVehicles.map((v) => (
                  <li key={v}>• {v}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  color = "orange",
}: {
  label: string;
  value: number;
  color?: "orange" | "red";
}) {
  const barColor =
    color === "red"
      ? "bg-red-500"
      : value > 30
        ? "bg-orange-500"
        : value > 10
          ? "bg-orange-500/70"
          : "bg-orange-500/40";

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span
          className={`font-bold tabular-nums ${
            color === "red" ? "text-red-400" : "text-orange-400"
          }`}
        >
          {value}%
        </span>
      </div>
      <div className="h-2 bg-[#06101d] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
