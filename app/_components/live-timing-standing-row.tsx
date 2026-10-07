"use client";

import {
  ChevronUp,
  ChevronDown,
  Flag as FlagIcon,
  Wrench,
  TriangleAlert,
} from "lucide-react";
import type { DriverStatus, SessionPhase, StandingEntry } from "../_types/live-timing";
import { getCarClassPalette } from "../_services/live-timing-visual-theme";
import { qualificationEvolution } from "../_services/live-timing-qualification-evolution.mjs";
import { formatTyrePercent } from "../_services/live-tyre-display-percent.mjs";

interface StandingRowProps {
  entry: StandingEntry;
  isFastestLap?: boolean;
  sessionPhase?: SessionPhase;
  onOpenTyreHistory?: (entry: StandingEntry) => void;
}

function formatFuel(fuelFraction: number | null | undefined): string {
  if (
    fuelFraction === null ||
    fuelFraction === undefined ||
    !Number.isFinite(fuelFraction) ||
    fuelFraction < 0 ||
    fuelFraction > 1
  ) {
    return "—";
  }
  return `${Math.round(fuelFraction * 100)} %`;
}

function formatMaxSpeed(maxSpeedKmh: number | null | undefined): string {
  return typeof maxSpeedKmh === "number" && Number.isFinite(maxSpeedKmh) && maxSpeedKmh >= 0
    ? String(Math.round(maxSpeedKmh))
    : "—";
}

function statusPresentation(entry: StandingEntry): {
  key: DriverStatus;
  label: string;
  className: string;
} {
  const key: DriverStatus = entry.inPit ? "pit" : entry.status;
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

function formatFuelLiters(fuelLiters: number | null | undefined): string {
  return typeof fuelLiters === "number" && Number.isFinite(fuelLiters) && fuelLiters >= 0
    ? `${fuelLiters.toFixed(1)} L`
    : "N/D";
}

function FuelMeter({ fuelFraction, fuelLiters }: { fuelFraction?: number | null; fuelLiters?: number | null }) {
  const formatted = formatFuel(fuelFraction);
  const liters = formatFuelLiters(fuelLiters);
  if (formatted === "—") {
    return (
      <span
        className="inline-flex rounded-md border border-slate-700/70 bg-slate-800/60 px-2 py-1 font-mono text-xs tabular-nums text-slate-500"
        title={liters === "N/D" ? "Carburant indisponible via Shared Memory" : "Carburant natif en litres ; capacité native absente, jauge et pourcentage non calculés"}
      >
        {liters === "N/D" ? "N/D" : `${liters} · N/D %`}
      </span>
    );
  }

  const percentage = Math.round((fuelFraction ?? 0) * 100);
  return (
    <span
      className="inline-flex min-w-[7rem] items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/[0.06] px-2 py-1 font-mono text-xs tabular-nums text-cyan-100"
      aria-label={`Carburant ${liters}, ${formatted}`}
      title="mFuel / mFuelCapacity — mêmes mesures Shared Memory rFactor 2"
    >
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-700/80" aria-hidden="true">
        <span
          className="block h-full rounded-full bg-cyan-300"
          style={{ width: `${percentage}%` }}
        />
      </span>
      <span>{liters}</span>
      <span>{formatted}</span>
    </span>
  );
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

function NativeTyreWear({ value, corner }: { value: number | null | undefined; corner: string }) {
  const formatted = formatTyrePercent(value ?? Number.NaN);
  if (formatted === "N/D") return <TelemetryUnavailable label={`Usure ${corner}`} />;
  return (
    <span
      role="meter"
      aria-label={`Usure restante pneu ${corner} ${formatted}`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Number(value))}
      className="inline-flex min-w-[4.5rem] items-center justify-end gap-1.5 font-mono text-[11px] tabular-nums text-cyan-100"
      title={`Usure native ${corner} — ${formatted} restant`}
    >
      <span className="h-1.5 w-8 overflow-hidden rounded-full bg-slate-700/80" aria-hidden="true">
        <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${value}%` }} />
      </span>
      <span>{formatted}</span>
    </span>
  );
}

/**
 * Ligne du classement — affiche uniquement les données prouvées par le DTO
 * public et conserve les valeurs absentes sous la forme « — ».
 */
export function StandingRow({ entry, isFastestLap = false, sessionPhase, onOpenTyreHistory }: StandingRowProps) {
  const evolution = qualificationEvolution({
    sessionPhase,
    startingPosition: entry.startingPosition,
    currentPosition: entry.position,
  });
  const status = statusPresentation(entry);
  const classPalette = getCarClassPalette(entry.carClass);
  const classLabel = entry.carClass?.trim() || "Inconnue";
  const vmax = formatMaxSpeed(entry.maxSpeedKmh);
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
          <span className="min-w-[1.5rem] text-right text-sm font-black tabular-nums text-white">
            {entry.position}
          </span>
          {isFastestLap && (
            <span className="text-xs leading-none text-purple-300" aria-label="Meilleur tour du classement">★</span>
          )}
          {entry.inPit === true && (
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
      <td className="px-2 py-2.5 align-middle sm:px-3">
        <div className="min-w-[9rem]">
          <p className="truncate text-sm font-bold text-white">{entry.driverName}</p>
          <p className="truncate text-[11px] text-gray-500">{entry.team || "—"}</p>
        </div>
      </td>
      <td data-column="historique-pneus" className="px-2 py-2.5 text-center align-middle"><button type="button" onClick={() => onOpenTyreHistory?.(entry)} className="whitespace-nowrap rounded border border-cyan-400/50 bg-cyan-400/10 px-2 py-1 text-[10px] font-black text-cyan-100 hover:bg-cyan-400/20">Historique pneus</button></td>

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
      <td data-column="voiture" className="px-2 py-2.5 align-middle">
        <div className="flex min-w-[11rem] items-center gap-2">
          {entry.carNumber?.trim() ? (
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
          ) : null}
          <p className="truncate text-sm text-gray-400">{entry.car || "—"}</p>
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
      <td className="px-2 py-2.5 align-middle text-right">
        <span
          className={`whitespace-nowrap text-sm tabular-nums ${
            entry.gapToLeader === "Leader" ? "font-black text-orange-300" : "text-gray-300"
          }`}
        >
          {entry.gapToLeader}
        </span>
      </td>

      {/* Meilleur tour */}
      <td className="px-2 py-2.5 align-middle text-right">
        <span className="whitespace-nowrap font-mono text-sm tabular-nums text-purple-300">
          {entry.bestLap}
        </span>
      </td>

      {/* Dernier tour */}
      <td className="px-2 py-2.5 align-middle text-right">
        <span className="whitespace-nowrap font-mono text-sm tabular-nums text-gray-300">
          {entry.lastLap}
        </span>
      </td>

      {/* Secteurs du dernier tour terminé */}
      <td className="px-2 py-2.5 align-middle text-right">
        <span className="font-mono text-xs tabular-nums text-cyan-300">{entry.sector1}</span>
      </td>
      <td className="px-2 py-2.5 align-middle text-right">
        <span className="font-mono text-xs tabular-nums text-cyan-300">{entry.sector2}</span>
      </td>
      <td className="px-2 py-2.5 align-middle text-right">
        <span className="font-mono text-xs tabular-nums text-cyan-300">{entry.sector3 ?? "—"}</span>
      </td>

      {/* Vitesse maximale observée : Vehicle.carVelocity native, m/s convertis en km/h. */}
      <td className="px-2 py-2.5 align-middle text-right">
        <span
          className={`font-mono text-xs tabular-nums ${vmax === "—" ? "text-gray-500" : "text-cyan-200"}`}
          title={vmax === "—" ? "Vitesse maximale indisponible via carVelocity" : "Vitesse maximale observée via carVelocity (km/h)"}
        >
          {vmax}
        </span>
      </td>

      {/* Pneus avant/arrière : deux emplacements séparés, N/D sans champ natif Swagger. */}
      <td data-column="pneus" className="px-2 py-2.5 align-middle text-center">
        <div className="flex min-w-[7rem] items-center justify-center gap-1">
          <NativeTyreCompound value={entry.frontTyreCompound} axle="AV" />
          <NativeTyreCompound value={entry.rearTyreCompound} axle="AR" />
        </div>
      </td>

      {/* Carburant : jauge et texte emploient la même fraction native. */}
      <td data-column="carburant" className="px-2 py-2.5 align-middle text-right">
        <FuelMeter fuelFraction={entry.fuelFraction} fuelLiters={entry.fuelLiters} />
      </td>

      {/* Usure AVG / AVD / ARG / ARD : une mesure native par emplacement, jamais mêlée au composé. */}
      <td data-column="usure-AVG" className="px-2 py-2.5 align-middle text-right">
        <NativeTyreWear value={entry.wearFrontLeft} corner="AVG" />
      </td>
      <td data-column="usure-AVD" className="px-2 py-2.5 align-middle text-right">
        <NativeTyreWear value={entry.wearFrontRight} corner="AVD" />
      </td>
      <td data-column="usure-ARG" className="px-2 py-2.5 align-middle text-right">
        <NativeTyreWear value={entry.wearRearLeft} corner="ARG" />
      </td>
      <td data-column="usure-ARD" className="px-2 py-2.5 align-middle text-right">
        <NativeTyreWear value={entry.wearRearRight} corner="ARD" />
      </td>

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
