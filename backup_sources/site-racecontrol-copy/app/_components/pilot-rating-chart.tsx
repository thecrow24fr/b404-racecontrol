/**
 * PilotRatingChart — Graphique d'évolution BER/BSR (tableau simple, V1).
 *
 * V1 : tableau chronologique.
 * V2 : graphique SVG (à intégrer avec une lib de chart).
 */
"use client";

import type { RatingPoint } from "../_types/pilot";

interface Props {
  history: RatingPoint[];
  currentBER: number;
  currentBSR: string;
}

export function PilotRatingChart({
  history,
  currentBER,
  currentBSR,
}: Props) {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
        Évolution BER/BSR
      </h2>
      <div className="bg-[#0d1b2e] rounded-3xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#071426]">
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Date
                </th>
                <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  BER
                </th>
                <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Δ
                </th>
                <th className="text-center px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  BSR
                </th>
                <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-500 hidden md:table-cell">
                  Course
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((point, i) => (
                <tr
                  key={`${point.date}-${i}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {point.date}
                  </td>
                  <td className="px-5 py-3 text-right text-white font-bold tabular-nums">
                    {point.ber}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {point.berDelta !== null ? (
                      <span
                        className={
                          point.berDelta > 0
                            ? "text-emerald-400"
                            : point.berDelta < 0
                              ? "text-red-400"
                              : "text-gray-500"
                        }
                      >
                        {point.berDelta > 0 ? "+" : ""}
                        {point.berDelta}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-xs font-bold text-emerald-400">
                      {point.bsr}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {point.label ?? "—"}
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
