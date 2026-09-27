/**
 * PilotResultsTable — Tableau de l'historique des courses.
 */
"use client";

import type { PilotRaceResult } from "../_types/pilot";

interface Props {
  results: PilotRaceResult[];
}

export function PilotResultsTable({ results }: Props) {
  if (!results || results.length === 0) {
    return (
      <div className="w-full mb-8">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
          Historique des courses
        </h2>
        <div className="bg-[#0d1b2e] rounded-3xl p-8 border border-white/10 text-center">
          <p className="text-gray-500 text-sm">Aucune course enregistrée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mb-8">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
        Historique des courses ({results.length})
      </h2>
      <div className="bg-[#0d1b2e] rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#071426]">
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Pos
                </th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Circuit
                </th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hidden sm:table-cell">
                  Véhicule
                </th>
                <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hidden md:table-cell">
                  Tours
                </th>
                <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Incidents
                </th>
                <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hidden lg:table-cell">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-5 py-4">
                    <span
                      className={`font-black tabular-nums ${
                        r.position === 1
                          ? "text-yellow-400"
                          : r.position <= 3
                            ? "text-gray-300"
                            : r.dnf
                              ? "text-red-400"
                              : "text-gray-400"
                      }`}
                    >
                      {r.dnf ? "DNF" : `P${r.position}`}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white font-semibold">
                    {r.circuit}
                  </td>
                  <td className="px-5 py-4 text-gray-400 hidden sm:table-cell">
                    {r.vehicle}
                  </td>
                  <td className="px-5 py-4 text-right text-gray-400 tabular-nums hidden md:table-cell">
                    {r.totalLaps}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    <span
                      className={
                        r.incidents > 5
                          ? "text-red-400"
                          : r.incidents > 0
                            ? "text-yellow-400"
                            : "text-emerald-400"
                      }
                    >
                      {r.incidents}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-gray-500 text-xs hidden lg:table-cell">
                    {new Date(r.raceDate * 1000).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
