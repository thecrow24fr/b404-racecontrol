"use client";

import { CheckCircle, Clock, Thermometer, Flag } from "lucide-react";
import type { SessionInfo } from "../_types/live-timing";

interface SessionBannerProps {
  session: SessionInfo;
}

/**
 * Bandeau d'état de session — affiche en un coup d'œil :
 * - La phase en cours (Course, Qualif, Practice...)
 * - Le temps écoulé / restant
 * - Les températures piste et air
 * - Les drapeaux actifs (avec raison)
 */
export function SessionBanner({ session }: SessionBannerProps) {
  const phaseLabel: Record<string, string> = {
    waiting: "En attente",
    practice: "Essais libres",
    qualifying: "Qualifications",
    race: "Course",
    finished: "Terminée",
    paused: "Pause",
  };

  const phaseColor: Record<string, string> = {
    waiting: "text-yellow-400",
    practice: "text-blue-400",
    qualifying: "text-purple-400",
    race: "text-orange-400",
    finished: "text-gray-400",
    paused: "text-yellow-300",
  };

  const hasActiveFlags = session.flags.length > 0;
  const activeYellow = session.flags.find((f) => f.type === "yellow");
  const activeRed = session.flags.find((f) => f.type === "red");

  return (
    <div className="border-y border-white/10 bg-[#0b1728]">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          {/* Phase de session */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-300">
              Session :{" "}
              <span className={`${phaseColor[session.phase]}`}>
                {phaseLabel[session.phase]}
              </span>
            </span>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-bold tabular-nums text-gray-300">
              {session.elapsedTime}
            </span>
          </div>

          {/* Températures */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Thermometer className="h-3.5 w-3.5 text-orange-400" />
              Piste <span className="font-bold text-white">{session.trackTemp}°C</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Thermometer className="h-3.5 w-3.5 text-blue-400" />
              Air <span className="font-bold text-white">{session.airTemp}°C</span>
            </span>
          </div>

          {/* Drapeaux actifs */}
          <div className="flex items-center gap-3">
            {hasActiveFlags ? (
              session.flags.map((flag, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    flag.type === "yellow"
                      ? "bg-yellow-500/20 text-yellow-300"
                      : flag.type === "red"
                        ? "bg-red-500/20 text-red-300"
                        : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  <Flag className="h-3 w-3" />
                  {flag.type === "yellow" && "Drapeau jaune"}
                  {flag.type === "red" && "Drapeau rouge"}
                  {flag.type === "green" && "Drapeau vert"}
                  {flag.type === "chequered" && "Drapeau à damiers"}
                  <span className="opacity-60">S{flag.sector}</span>
                  {flag.reason && (
                    <span className="hidden italic opacity-60 sm:inline">
                      — {flag.reason}
                    </span>
                  )}
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                Aucun drapeau
              </span>
            )}
          </div>

          {/* Heure serveur */}
          <span className="text-xs font-mono text-gray-500">
            {session.serverTime}
          </span>
        </div>
      </div>
    </div>
  );
}
