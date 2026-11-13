"use client";

import {
  ChevronUp,
  ChevronDown,
  Flag as FlagIcon,
  Wrench,
  TriangleAlert,
  Plus,
} from "lucide-react";
import type { DriverStatus, SessionPhase, StandingEntry } from "../_types/live-timing";
import { getCarClassPalette } from "../_services/live-timing-visual-theme";
import { carStatusBadge } from "../_services/live-timing-race-progress.mjs";
import { qualificationEvolution } from "../_services/live-timing-qualification-evolution.mjs";
import { optimalLapDisplay } from "../_services/live-timing-optimal.mjs";
import { formatLastLapDelta } from "../_services/live-timing-lap-delta.mjs";

interface StandingRowProps {
  entry: StandingEntry;
  isFastestLap?: boolean;
  sessionPhase?: SessionPhase;
  speedMetric?: "max" | "average";
  pitTimerNow?: number;
  snapshotReceivedMonotonicAt?: number | null;
  onOpenLapHistory?: () => void;
}

function formatMaxSpeed(maxSpeedKmh: number | null | undefined): string {
  return typeof maxSpeedKmh === "number" && Number.isFinite(maxSpeedKmh) && maxSpeedKmh >= 0
    ? String(Math.round(maxSpeedKmh))
    : "—";
}

function formatPitStopDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "—";
  const totalSeconds = Math.floor(seconds + Number.EPSILON);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function statusPresentation(entry: StandingEntry): {
  key: DriverStatus;
  label: string;
  className: string;
} {
  const terminalStatus = entry.status === "dnf" || entry.status === "out";
  const key: DriverStatus = terminalStatus
    ? entry.status
    : entry.inPit
      ? "pit"
      : entry.status;
  switch (key) {
    case "pit":
      return {
        key,
        label: "Aux stands",
        className: "border-slate-300/60 bg-slate-500/20 text-slate-100",
      };
    case "finished":
      return {
        key,
        label: "Terminé",
        className: "border-blue-300/50 bg-blue-500/15 text-blue-200",
      };
    case "dnf":
      return {
        key,
        label: "DNF",
        className: "border-red-400/50 bg-red-500/15 text-red-200",
      };
    case "out":
      return {
        key,
        label: "Abandon",
        className: "border-red-400/50 bg-red-500/15 text-red-200",
      };
    case "running":
    default:
      return {
        key: "running",
        label: "En piste",
        className: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
      };
  }
}

function TelemetryUnavailable({ label }: { label: string }) {
  return (
    <span
      className="inline-flex rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-1 font-mono text-xs tabular-nums text-slate-500"
      title={`${label} indisponible via le contrat natif`}
    >
      N/D
    </span>
  );
}

function NativeTyreCompound({ value, axle }: { value: string | null | undefined; axle: "AV" | "AR" }) {
  const compound = typeof value === "string" && value.trim() ? value.trim() : null;
  return compound ? (
    <span
      className="inline-flex rounded-md border border-slate-600/60 bg-slate-700/30 px-1.5 py-1 font-mono text-xs tabular-nums text-slate-100"
      title={`Composé natif ${axle}`}
    >
      {compound}
    </span>
  ) : <TelemetryUnavailable label={`Composé pneu ${axle}`} />;
}

/**
 * Ligne du classement — affiche uniquement les données prouvées par le DTO
 * public et conserve les valeurs absentes sous la forme « — ».
 */
export function StandingRow({ entry, isFastestLap = false, sessionPhase, speedMetric = "max", pitTimerNow = 0, snapshotReceivedMonotonicAt, onOpenLapHistory }: StandingRowProps) {
  const isTerminalStatus = entry.status === "dnf" || entry.status === "out";
  const reportedPitDuration = entry.pitStopDurationSeconds;
  const pitDurationForDisplay = isTerminalStatus
    ? null
    : entry.inPit
      && typeof reportedPitDuration === "number"
      && Number.isFinite(reportedPitDuration)
      && reportedPitDuration >= 0
      && typeof snapshotReceivedMonotonicAt === "number"
      ? reportedPitDuration + Math.max(0, (pitTimerNow - snapshotReceivedMonotonicAt) / 1000)
      : reportedPitDuration;

  const evolution = qualificationEvolution({
    sessionPhase,
    startingPosition: entry.startingPosition,
    currentPosition: entry.position,
  });
  const status = statusPresentation(entry);
  const classPalette = getCarClassPalette(entry.carClass);
  const classLabel = entry.carClass?.trim() || "Inconnue";
  const carStatusLabel = carStatusBadge(entry.status);
  const vmax = formatMaxSpeed(entry.maxSpeedKmh);
  const averageSpeed = formatMaxSpeed(entry.averageSpeedKmh);
  const shownSpeed = speedMetric === "average" ? averageSpeed : vmax;
  const speedTitle = speedMetric === "average"
    ? averageSpeed === "—"
      ? "Vitesse moyenne indisponible : aucun tour complet chronométré exploitable"
      : `Vitesse moyenne sur ${entry.averageSpeedLapCount ?? "?"} tour(s) complet(s) chronométré(s) (km/h)`
    : vmax === "—" ? "Vitesse maximale indisponible" : "Vitesse maximale observée (km/h)";
  const optimalLap = optimalLapDisplay(entry.optimalLap, [entry.sector1, entry.sector2, entry.sector3]);
  const lastLapDelta = formatLastLapDelta(entry.lastLapDeltaSeconds);
  const evolutionAria =
    sessionPhase !== "race"
      ? "Évolution non affichée hors course"
      : entry.startingPosition === null || entry.startingPosition === undefined
        ? "Position de qualification indisponible"
        : `Position de qualification ${entry.startingPosition}, position actuelle ${entry.position}`;

  return (
    <tr className={`group border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isFastestLap ? "bg-orange-500/[0.03]" : ""}`}>
      {/* Position */}
      <td className="sticky left-0 z-10 bg-[#0d1b2e] px-2 py-2.5 align-middle group-hover:bg-[#0f1e32] sm:px-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLapHistory}
            aria-label={`Afficher l’historique des tours de ${entry.driverName}`}
            title="Historique des tours"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-black/70 text-white transition hover:bg-cyan-500/70 focus:outline-none focus:ring-1 focus:ring-cyan-300"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <span className="min-w-[1.5rem] text-right text-sm font-black tabular-nums text-white">
            {entry.position}
          </span>
          {isFastestLap && (
            <span className="text-xs leading-none text-purple-300" aria-label="Meilleur tour du classement">★</span>
          )}
          {status.key === "pit" && (
            <Wrench className="h-3 w-3 text-slate-300" aria-label="Aux stands" />
          )}
          {entry.underYellow === true && (
            <FlagIcon className="h-3 w-3 text-slate-500" aria-label="Sous drapeau, Safety Car non confirmé" />
          )}
          {(entry.status === "dnf" || entry.status === "out") && (
            <TriangleAlert className="h-3 w-3 text-red-400" aria-label="Abandon" />
          )}
        </div>
      </td>

      {/* Évolution par rapport à la qualification */}
      <td
        className="px-2 py-2.5 align-middle text-center sm:px-3"
        title={evolutionAria}
        aria-label={evolutionAria}
      >
        <div className="flex items-center justify-center gap-1 font-bold tabular-nums">
          {evolution.kind === "unavailable" ? (
            <span className="text-gray-500">—</span>
          ) : evolution.kind === "gain" ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 text-emerald-400" aria-label="Gain" />
              <span className="text-emerald-400">{evolution.label}</span>
            </>
          ) : evolution.kind === "loss" ? (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-red-400" aria-label="Perte" />
              <span className="text-red-400">{evolution.label}</span>
            </>
          ) : (
            <span className="text-gray-400">{evolution.label}</span>
          )}
        </div>
      </td>

      {/* Pilote + Équipe */}
      <td data-column="pilote" className="px-2 py-2.5 align-middle text-center sm:px-3">
        <div className="mx-auto min-w-[7.5rem] max-w-[12rem]">
          <p className="truncate text-center text-sm font-bold text-white">{entry.driverName}</p>
          <div className="flex min-w-0 items-center justify-center gap-1.5">
            {entry.driverType === "human" ? (
              <span aria-label="Pilote humain" className="shrink-0 rounded border border-emerald-400/30 bg-emerald-400/10 px-1 text-[9px] font-bold uppercase text-emerald-200">Humain</span>
            ) : entry.driverType === "ai" ? (
              <span aria-label="Pilote IA" className="shrink-0 rounded border border-violet-400/30 bg-violet-400/10 px-1 text-[9px] font-bold uppercase text-violet-200">IA</span>
            ) : null}
            <p className="truncate text-[11px] text-gray-500">{entry.team || "—"}</p>
          </div>
        </div>
      </td>

      {/* Classe — palette partagée avec la carte Progression Live */}
      <td data-column="classe" className="px-2 py-2.5 align-middle text-center">
        <span
          className="inline-flex max-w-[9rem] items-center rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]"
          style={{
            backgroundColor: classPalette.softBackground,
            borderColor: classPalette.stroke,
            color: classPalette.text,
          }}
          title={`Classe rFactor 2 : ${classLabel}`}
        >
          {classLabel}
        </span>
      </td>

      {/* Voiture */}
      <td data-column="voiture" className="px-2 py-2.5 align-middle text-center">
        <div className="mx-auto flex min-w-[8rem] max-w-[12rem] items-center justify-center gap-2">
          {entry.carNumber?.trim() ? (
            <>
              <span
                className="inline-flex h-6 min-w-7 items-center justify-center rounded border px-1.5 text-[10px] font-black tabular-nums"
                style={{
                  backgroundColor: classPalette.softBackground,
                  borderColor: classPalette.stroke,
                  color: classPalette.text,
                }}
              >
                #{entry.carNumber.trim()}
              </span>
              {carStatusLabel && (
                <span
                  aria-label={`Statut : ${carStatusLabel}`}
                  className="inline-flex h-6 items-center rounded border border-red-500/30 bg-red-500/10 px-1.5 text-[9px] font-black tracking-wide text-red-300"
                  title={`Statut : ${carStatusLabel}`}
                >
                  {carStatusLabel}
                </span>
              )}
            </>
          ) : null}
          <p className="truncate text-center text-sm text-gray-400">{entry.car || "-"}</p>
          {!entry.carNumber?.trim() && carStatusLabel && (
            <span
              aria-label={`Statut : ${carStatusLabel}`}
              className="inline-flex h-6 items-center rounded border border-red-500/30 bg-red-500/10 px-1.5 text-[9px] font-black tracking-wide text-red-300"
              title={`Statut : ${carStatusLabel}`}
            >
              {carStatusLabel}
            </span>
          )}
        </div>
      </td>

      {/* Tours */}
      <td className="px-2 py-2.5 align-middle text-center">
        <span className="text-sm font-bold tabular-nums text-white">{entry.laps}</span>
      </td>

      {/* Arrêts */}
      <td className="px-2 py-2.5 align-middle text-center">
        <span className="text-sm tabular-nums text-gray-300">{entry.pitStops}</span>
      </td>

      {/* Écart au leader */}
      <td data-column="ecart" className="px-2 py-2.5 align-middle text-center">
        <span
          className={`whitespace-nowrap text-sm tabular-nums ${
            entry.gapToLeader === "Leader" ? "font-black text-orange-300" : "text-gray-300"
          }`}
        >
          {entry.gapToLeader}
        </span>
      </td>

      {/* Meilleur tour réalisé au-dessus du dernier tour, distinct de l’optimal. */}
      <td data-column="best-last-lap" className="px-2 py-2.5 align-middle text-center">
        <span className="block whitespace-nowrap font-mono text-xs font-bold tabular-nums text-purple-300" title="Meilleur tour réalisé">{entry.bestLap || "—"}</span>
        <div className="flex items-center justify-center gap-2">
          <span className="whitespace-nowrap font-mono text-sm tabular-nums text-blue-400" title="Dernier tour terminé">{entry.lastLap || "—"}</span>
          {lastLapDelta ? (
            <span
              className={`inline-flex items-center gap-0.5 whitespace-nowrap font-mono text-xs font-bold tabular-nums ${
                lastLapDelta.kind === "gain"
                  ? "text-emerald-400"
                  : lastLapDelta.kind === "loss"
                    ? "text-red-400"
                    : "text-gray-400"
              }`}
              title={lastLapDelta.ariaLabel}
              aria-label={lastLapDelta.ariaLabel}
            >
              {lastLapDelta.kind === "gain" ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : null}
              {lastLapDelta.kind === "loss" ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : null}
              <span>{lastLapDelta.label}</span>
            </span>
          ) : null}
        </div>
      </td>
      <td data-column="sector-s1" className="px-2 py-2.5 align-middle text-center">
        <span className="block whitespace-nowrap font-mono text-xs font-bold tabular-nums text-purple-300" title="Meilleur S1 individuel">{entry.sector1 || "—"}</span>
        <span className="block whitespace-nowrap font-mono text-sm tabular-nums text-blue-400" title="S1 du tour en cours ou dernier tour terminé">{entry.progressiveSector1 ?? "—"}</span>
      </td>
      <td data-column="sector-s2" className="px-2 py-2.5 align-middle text-center">
        <span className="block whitespace-nowrap font-mono text-xs font-bold tabular-nums text-purple-300" title="Meilleur S2 individuel">{entry.sector2 || "—"}</span>
        <span className="block whitespace-nowrap font-mono text-sm tabular-nums text-blue-400" title="S2 du tour en cours ou dernier tour terminé">{entry.progressiveSector2 ?? "—"}</span>
      </td>
      <td data-column="sector-s3" className="px-2 py-2.5 align-middle text-center">
        <span className="block whitespace-nowrap font-mono text-xs font-bold tabular-nums text-purple-300" title="Meilleur S3 individuel">{entry.sector3 || "—"}</span>
        <span className="block whitespace-nowrap font-mono text-sm tabular-nums text-blue-400" title="S3 du dernier tour terminé">{entry.progressiveSector3 ?? "—"}</span>
      </td>
      <td data-column="temps-optimal" className="px-2 py-2.5 align-middle text-center">
        <span className="whitespace-nowrap font-mono text-sm font-bold tabular-nums text-orange-300" title="Somme théorique des meilleurs secteurs individuels, pas nécessairement un tour réalisé">{optimalLap ?? "—"}</span>
      </td>

      {/* Vitesse maximale observée : Vehicle.carVelocity native, m/s convertis en km/h. */}
      <td data-column="vmax" data-speed-metric={speedMetric} className="px-2 py-2.5 align-middle text-center">
        <span
          className={`font-mono text-xs tabular-nums ${shownSpeed === "—" ? "text-gray-500" : "text-cyan-200"}`}
          title={speedTitle}
        >
          {shownSpeed}
        </span>
      </td>

      {/* Pneus avant/arrière : deux emplacements séparés, N/D sans champ natif Swagger. */}
      <td data-column="pneus" className="px-2 py-2.5 align-middle text-center">
        <div className="flex min-w-[7rem] items-center justify-center gap-1">
          <NativeTyreCompound value={entry.frontTyreCompound} axle="AV" />
          <NativeTyreCompound value={entry.rearTyreCompound} axle="AR" />
        </div>
      </td>


      {/* Temps d’arrêt : visible uniquement en course. */}
      {sessionPhase === "race" && (
        <td data-column="temps-arret" className="px-2 py-2.5 align-middle text-center">
          <span
            className="whitespace-nowrap font-mono text-xs font-bold tabular-nums text-cyan-200"
            title={entry.inPit ? "Durée de l’arrêt en cours" : "Durée du dernier arrêt"}
          >
            {formatPitStopDuration(pitDurationForDisplay)}
          </span>
        </td>
      )}

      {/* Statut réel du pilote, distinct de l’écart Leader */}
      <td data-column="statut" className="px-2 py-2.5 align-middle text-right">
        <div className="flex min-w-[8rem] flex-wrap items-center justify-end gap-1">
          {entry.underYellow === true ? (
            <span className="inline-flex items-center rounded-full border border-slate-600/70 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Sous drapeau
            </span>
          ) : null}
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
            {status.label}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── Le statut détaillé reste porté par la ligne; aucune valeur n’est déduite du classement. ───
