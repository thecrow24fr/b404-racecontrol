/**
 * PilotStatsGrid — Grille des statistiques clés du pilote.
 */
"use client";

import type { PilotProfile } from "../_types/pilot";

interface Props {
  pilot: PilotProfile;
}

export function PilotStatsGrid({ pilot }: Props) {
  const stats = [
    { label: "Courses", value: pilot.totalRaces, icon: "🏁" },
    { label: "Victoires", value: pilot.totalWins, icon: "🏆" },
    { label: "Podiums", value: pilot.totalPodiums, icon: "🥉" },
    { label: "Poles", value: pilot.totalPoles, icon: "⚡" },
    { label: "Meilleurs tours", value: pilot.totalBestLaps, icon: "⏱" },
    { label: "DNF", value: pilot.totalDnf, icon: "💥" },
    { label: "Incidents", value: pilot.totalIncidents, icon: "⚠️" },
    { label: "Tours", value: pilot.totalLapsDriven.toLocaleString(), icon: "🔄" },
    { label: "Heures", value: `${pilot.totalRaceHours}h`, icon: "⏰" },
  ];

  return (
    <div className="w-full mb-8">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
        Statistiques
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-[#0d1b2e] rounded-2xl p-4 border border-white/10 text-center"
          >
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-xl font-black text-white tabular-nums">
              {s.value}
            </div>
            <div className="text-xs font-black uppercase tracking-[0.15em] text-gray-500 mt-1">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
