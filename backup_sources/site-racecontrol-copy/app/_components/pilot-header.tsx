/**
 * PilotHeader — Bannière du profil pilote avec ratings.
 */
"use client";

import type { PilotProfile } from "../_types/pilot";
import { StatusBadge } from "./status-badge";

interface Props {
  pilot: PilotProfile;
}

export function PilotHeader({ pilot }: Props) {
  return (
    <div className="w-full bg-[#0d1b2e] rounded-3xl p-8 mb-8 border border-white/10">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0 w-24 h-24 rounded-full bg-orange-500/20 flex items-center justify-center text-3xl font-black text-orange-500">
          {pilot.displayName.charAt(0).toUpperCase()}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black text-white mb-1">
            {pilot.displayName}
          </h1>
          {pilot.bio && (
            <p className="text-gray-400 text-sm mb-4">{pilot.bio}</p>
          )}

          <div className="flex flex-wrap gap-4">
            {/* BER */}
            <div className="bg-[#06101d] rounded-xl px-5 py-3 border border-white/5">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
                BER
              </div>
              <div className="text-2xl font-black text-orange-500 tabular-nums">
                {pilot.ber}
              </div>
            </div>

            {/* BSR */}
            <div className="bg-[#06101d] rounded-xl px-5 py-3 border border-white/5">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
                BSR
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-emerald-400">
                  {pilot.bsr}
                </span>
                <span className="text-sm text-gray-400">
                  {pilot.bsrLabel}
                </span>
              </div>
            </div>

            {/* Dernière course */}
            {pilot.lastRaceCircuit && (
              <div className="bg-[#06101d] rounded-xl px-5 py-3 border border-white/5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
                  Dernière course
                </div>
                <div className="text-sm text-white font-semibold">
                  {pilot.lastRaceCircuit}
                </div>
                <div className="text-xs text-gray-400">
                  P{pilot.lastRacePosition} · {pilot.lastRaceVehicle ?? "—"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
