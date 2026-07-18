/**
 * ServerCard V2 — Carte serveur cliquable pour la Vue d ensemble
 *
 * B404 RaceControl
 *
 * Concu pour etre extensible : les champs futurs (championnat,
 * simulateur, progression, incidents, etc.) sont deja prevus
 * et apparaissent automatiquement dans l'UI quand renseignes.
 *
 * @module server-card
 */

"use client";

import Link from "next/link";
import type { ServerOverview, FlagType, WeatherCondition } from "../_types/server-overview";

// ─── Helpers ─────────────────────────────────────────────────────────

const SIMULATOR_LABELS: Record<string, string> = {
  rf2: "rFactor 2",
  lmu: "Le Mans Ultimate",
  ac: "Assetto Corsa",
  acc: "Assetto Corsa Competizione",
  iracing: "iRacing",
};

const WEATHER_ICONS: Record<WeatherCondition, string> = {
  clear: "☀️",
  cloudy: "⛅",
  overcast: "☁️",
  rain: "☔",
  fog: "🌫️",
};

const FLAG_COLORS: Record<FlagType, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  blue: "bg-blue-400",
  chequered: "bg-white",
  white: "bg-white",
  fcy: "bg-yellow-400",
  sc: "bg-orange-400",
};

function statusColor(status: string): string {
  switch (status) {
    case "online": return "bg-emerald-500";
    case "starting": return "bg-amber-400";
    case "paused": return "bg-gray-400";
    default: return "bg-gray-600";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "online": return "En ligne";
    case "offline": return "Hors ligne";
    case "starting": return "Demarrage";
    case "paused": return "Pause";
    default: return status;
  }
}

// ─── Props ───────────────────────────────────────────────────────────

interface ServerCardProps {
  server: ServerOverview;
}

// ─── Composant ───────────────────────────────────────────────────────

export function ServerCard({ server }: ServerCardProps) {
  const s = server;
  const isOnline = s.status === "online";

  return (
    <Link
      href={`/serveurs/${s.id}/live-timing`}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border transition duration-300 ${
        isOnline
          ? "border-white/10 bg-[#0d1b2e] hover:-translate-y-1.5 hover:border-orange-400/45 hover:shadow-orange-500/10"
          : "border-white/5 bg-[#0a1420] opacity-60 hover:opacity-80"
      }`}
    >
      {/* Glow effect au hover */}
      {isOnline && (
        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-orange-500/15 blur-3xl" />
        </div>
      )}

      <div className="relative flex flex-col p-5">
        {/* ── En-tete : badge statut + simulateur ── */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="truncate text-lg font-black text-white group-hover:text-orange-200 transition-colors">
              {s.name}
            </h3>
            <p className="mt-0.5 truncate text-sm text-gray-400">{s.circuit}</p>
          </div>

          {/* Badge statut */}
          <div className="flex items-center gap-2 ml-3 shrink-0">
            {/* Icône simulateur (future) — invisible si non renseigne */}
            {s.simulator && s.simulator !== "rf2" && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                {SIMULATOR_LABELS[s.simulator] ?? s.simulator}
              </span>
            )}

            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
              isOnline
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-gray-500/15 text-gray-400"
            }`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor(s.status)} ${isOnline ? "animate-glow-pulse" : ""}`} />
              {statusLabel(s.status)}
            </span>
          </div>
        </div>

        {/* ── Ligne 1 : Session + Pilotes ── */}
        <div className="mb-2 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="font-bold text-white/80">{s.session.type}</span>
            {s.session.timeRemaining !== "--:--" && (
              <span className="text-gray-500">({s.session.timeRemaining})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span className="tabular-nums">{s.drivers}/{s.maxDrivers}</span>
          </div>
        </div>

        {/* ── Ligne 2 : Meteo + Meilleur tour ── */}
        <div className="mb-3 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <span>{WEATHER_ICONS[s.weather.condition] ?? "+2600"}</span>
            <span className="tabular-nums">{s.weather.temperature}°C</span>
            {s.weather.condition === "rain" && (
              <span className="text-blue-300">{s.weather.rainPercent}%</span>
            )}
          </div>
          {s.session.bestLap !== "--:--.---" && (
            <div className="flex items-center gap-1">
              <svg className="h-3 w-3 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
              <span className="font-mono tabular-nums text-orange-200">{s.session.bestLap}</span>
            </div>
          )}
        </div>

        {/* ── Ligne 3 : Flags (si presents) ── */}
        {s.flags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {s.flags.map((f, i) => (
              <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${FLAG_COLORS[f.type]} bg-opacity-20 text-${f.type === "yellow" ? "yellow" : f.type === "red" ? "red" : "white"}-200`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${FLAG_COLORS[f.type]}`} />
                {f.type === "fcy" ? "FCY" : f.type === "sc" ? "SC" : f.type} {f.sector ? `S${f.sector}` : ""}
              </span>
            ))}
          </div>
        )}

        {/* ── Ligne 4 : Donnees futures (championnat, progression, etc.) ── */}
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
          {/* Championnat (futur) */}
          {s.championship && (
            <span className="truncate max-w-[200px]">{s.championship}</span>
          )}
          {/* Progression (futur) */}
          {s.progressPercent !== undefined && s.progressPercent > 0 && (
            <span>{s.progressPercent}%</span>
          )}
          {/* Spectateurs (futur) */}
          {s.spectators !== undefined && s.spectators > 0 && (
            <span>{s.spectators} spectateurs</span>
          )}
          {/* Acces (futur) */}
          {s.access === "password" && (
            <span className="text-amber-400">+ Mot de passe</span>
          )}
        </div>

        {/* ── Barre de progression (futur) ── */}
        {s.progressPercent !== undefined && s.progressPercent > 0 && (
          <div className="mb-3 h-0.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${Math.min(s.progressPercent, 100)}%` }}
            />
          </div>
        )}

        {/* ── Bouton CTA ── */}
        <div className="mt-auto">
          {isOnline ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition group-hover:bg-orange-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              Live Timing
            </div>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-sm font-bold text-gray-500">
              Indisponible
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
