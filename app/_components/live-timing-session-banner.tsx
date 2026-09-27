"use client";

import { Clock, Thermometer, Flag } from "lucide-react";
import type { SessionInfo } from "../_types/live-timing";
import { formatRFactorDuration } from "../_services/live-timing-formatters";
import { formatSessionDisplayLabel } from "../_services/live-timing-session-labels";

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

  const sessionCodeLabels: Record<string, string> = {
    TESTDAY: "Test Day",
    PRACTICE1: "Essais libres",
    PRACTICE2: "Essais libres 2",
    PRACTICE3: "Essais libres 3",
    PRACTICE4: "Essais libres 4",
    QUALIFY1: "Qualifications 1",
    QUALIFY2: "Qualifications 2",
    QUALIFY3: "Qualifications 3",
    QUALIFY4: "Qualifications 4",
    WARMUP: "Warmup",
    RACE1: "Course 1",
    RACE2: "Course 2",
    RACE3: "Course 3",
    RACE4: "Course 4",
  };
  const currentSessionLabel =
    (session.sessionCode && sessionCodeLabels[session.sessionCode]) ||
    phaseLabel[session.phase];
  const displaySessionLabel = formatSessionDisplayLabel(currentSessionLabel);
  const sessionTimeRemaining = formatRFactorDuration(
    session.sessionTimeRemaining ?? session.elapsedTime,
  );
  const hasActiveFlags = session.flags.length > 0;

  const temperatureLabel = (value: number | null) =>
    value === null ? "Non disponible" : `${value.toFixed(1)} °C`;

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
                {displaySessionLabel}
              </span>
            </span>
            <span
              className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-xs font-bold tabular-nums text-gray-300"
              title="Temps restant de la session"
            >
              <span className="mr-2 text-[10px] uppercase tracking-wide text-gray-500">
                Temps restant
              </span>
              {sessionTimeRemaining}
            </span>
          </div>

          {/* Températures */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Thermometer className="h-3.5 w-3.5 text-orange-400" />
              Piste <span className="font-bold text-white">{temperatureLabel(session.trackTemp)}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Thermometer className="h-3.5 w-3.5 text-blue-400" />
              Air <span className="font-bold text-white">{temperatureLabel(session.airTemp)}</span>
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
                <Flag className="h-3.5 w-3.5 text-gray-500" />
                Drapeaux indisponibles
              </span>
            )}
          </div>

          {/* Heure serveur */}
          <span className="text-xs font-mono text-gray-500" title="Compteur source conservé à titre indicatif">
            Uptime serveur : {formatRFactorDuration(session.serverTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
