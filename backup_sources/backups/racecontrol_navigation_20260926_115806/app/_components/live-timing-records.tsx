"use client";

import { Award, Timer } from "lucide-react";
import type { RecordsData } from "../_types/live-timing";

interface LiveTimingRecordsProps {
  records?: RecordsData;
}

export function LiveTimingRecords({ records }: LiveTimingRecordsProps) {
  const data = records ?? {
    available: false,
    message: "Records non disponibles via l’API rFactor 2.",
    entries: [],
  };

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center gap-3">
          <Award className="h-5 w-5 text-orange-400" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Records
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              Meilleurs temps observés par session
            </h2>
          </div>
        </div>

        {!data.available || data.entries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] px-5 py-6 text-sm text-gray-400">
            <Timer className="mb-3 h-5 w-5 text-gray-500" />
            {data.message}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[520px]">
              <thead className="bg-[#0b1728]">
                <tr className="border-b border-white/10">
                  <Th>Session</Th>
                  <Th>Pilote</Th>
                  <Th>Voiture</Th>
                  <Th className="text-right">Meilleur tour</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {data.entries.map((entry) => (
                  <tr key={`${entry.session}-${entry.driverName}-${entry.bestLap}`}>
                    <td className="px-3 py-3 text-sm font-bold text-orange-200">{entry.session}</td>
                    <td className="px-3 py-3 text-sm text-white">{entry.driverName}</td>
                    <td className="px-3 py-3 text-sm text-gray-400">{entry.car ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-purple-300">{entry.bestLap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 ${className}`}>
      {children}
    </th>
  );
}
