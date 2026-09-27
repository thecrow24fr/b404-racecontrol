"use client";

import {
  MapPin,
  Users,
  Timer,
  CloudSun,
  Thermometer,
  Wind,
  Gauge,
  CircleDot,
} from "lucide-react";
import type { ServerInfo } from "../_types/live-timing";
import { formatRFactorDuration } from "../_services/live-timing-formatters";
import { formatSessionDisplayLabel } from "../_services/live-timing-session-labels";

interface ServerInfoPanelProps {
  server: ServerInfo;
}

function numberLabel(value: number | null, suffix = ""): string {
  if (value === null) return "Non disponible";
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (suffix === "%") return `${formatted} %`;
  if (suffix === "°C") return `${formatted} °C`;
  return `${formatted}${suffix}`;
}

function countLabel(value: number | null, max: number | null): string {
  return value === null || max === null ? "Non disponible" : `${value} / ${max}`;
}

function lapsLabel(value: number | null, total: number | null): string {
  if (value === null) return "Non disponible";
  if (total === null || total <= 0) return `${value} tours parcourus`;
  return `${value} / ${total} tours`;
}

export function ServerInfoPanel({ server }: ServerInfoPanelProps) {
  const statusLabel: Record<string, string> = {
    online: "Source accessible",
    offline: "Hors ligne",
    starting: "Démarrage…",
    paused: "En pause",
    stale: "Donnée périmée",
    degraded: "Données dégradées",
  };

  const statusColor: Record<string, string> = {
    online: "text-emerald-400",
    offline: "text-gray-400",
    starting: "text-yellow-400",
    paused: "text-yellow-300",
    stale: "text-yellow-300",
    degraded: "text-orange-300",
  };

  const statusDotColor: Record<string, string> = {
    online: "bg-emerald-400",
    offline: "bg-gray-500",
    starting: "bg-yellow-400",
    paused: "bg-yellow-300",
    stale: "bg-yellow-300",
    degraded: "bg-orange-300",
  };

  const trackConditionLabel: Record<string, string> = {
    dry: "Sèche",
    damp: "Humide",
    wet: "Mouillée",
    unknown: "Non disponible",
  };

  const trackConditionColor: Record<string, string> = {
    dry: "text-orange-300",
    damp: "text-blue-300",
    wet: "text-blue-400",
    unknown: "text-gray-400",
  };

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Session et circuit
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">{server.name}</h2>
          </div>
          <div className={`flex items-center gap-2 ${statusColor[server.status]}`}>
            <span
              className={`inline-block h-2 w-2 rounded-full ${statusDotColor[server.status]} ${
                server.status === "online" ? "animate-glow-pulse" : ""
              }`}
            />
            <span className="text-sm font-bold">{statusLabel[server.status]}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard icon={<MapPin className="h-4 w-4 text-orange-400" />} label="Circuit" value={server.circuit} />
          <InfoCard
            icon={<Timer className="h-4 w-4 text-orange-400" />}
            label="Session"
            value={formatSessionDisplayLabel(server.currentSession)}
            sub={`${formatRFactorDuration(server.timeRemaining)} restant`}
          />
          <InfoCard
            icon={<Users className="h-4 w-4 text-orange-400" />}
            label="Pilotes"
            value={countLabel(server.driversCount, server.maxDrivers)}
            sub="source standings"
          />
          <InfoCard icon={<Gauge className="h-4 w-4 text-orange-400" />} label="Catégorie" value={server.category} />
          <InfoCard
            icon={<CloudSun className="h-4 w-4 text-orange-400" />}
            label="Météo"
            value={server.weather.condition}
            sub={numberLabel(server.weather.temperature, "°C")}
          />
          <InfoCard
            icon={<CircleDot className="h-4 w-4 text-orange-400" />}
            label="Piste"
            value={trackConditionLabel[server.weather.trackCondition] ?? "Non disponible"}
            className={trackConditionColor[server.weather.trackCondition] ?? "text-gray-400"}
          />
          <InfoCard
            icon={<Wind className="h-4 w-4 text-orange-400" />}
            label="Vent"
            value={numberLabel(server.weather.windSpeed, " km/h")}
          />
          <InfoCard
            icon={<Thermometer className="h-4 w-4 text-orange-400" />}
            label="Pluie"
            value={numberLabel(server.weather.rainPercent, "%")}
            sub={lapsLabel(server.lapsCompleted, server.totalLaps)}
          />
        </div>
      </div>
    </section>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  className?: string;
}

function InfoCard({ icon, label, value, sub, className = "text-white" }: InfoCardProps) {
  return (
    <div className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0d1b2e] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-orange-400/30 hover:shadow-lg hover:shadow-orange-500/5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-bold ${className}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      </div>
    </div>
  );
}
