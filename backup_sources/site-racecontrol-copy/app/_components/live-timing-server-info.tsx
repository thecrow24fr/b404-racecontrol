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

interface ServerInfoPanelProps {
  server: ServerInfo;
}

/**
 * Panneau d'informations serveur — affiche toutes les données clés
 * du serveur de course sous forme de cartes organisées en grille.
 */
export function ServerInfoPanel({ server }: ServerInfoPanelProps) {
  const statusLabel: Record<string, string> = {
    online: "En ligne",
    offline: "Hors ligne",
    starting: "Démarrage…",
    paused: "En pause",
  };

  const statusColor: Record<string, string> = {
    online: "text-emerald-400",
    offline: "text-gray-400",
    starting: "text-yellow-400",
    paused: "text-yellow-300",
  };

  const statusDotColor: Record<string, string> = {
    online: "bg-emerald-400",
    offline: "bg-gray-500",
    starting: "bg-yellow-400",
    paused: "bg-yellow-300",
  };

  const trackConditionLabel: Record<string, string> = {
    dry: "Sèche",
    damp: "Humide",
    wet: "Mouillée",
  };

  const trackConditionColor: Record<string, string> = {
    dry: "text-orange-300",
    damp: "text-blue-300",
    wet: "text-blue-400",
  };

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* En-tête de section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              Serveur
            </p>
            <h2 className="mt-1 text-2xl font-black text-white">
              {server.name}
            </h2>
          </div>
          <div className={`flex items-center gap-2 ${statusColor[server.status]}`}>
            {server.status === "online" ? (
              <span className="inline-block h-2 w-2 animate-glow-pulse rounded-full bg-emerald-400" />
            ) : (
              <span className={`inline-block h-2 w-2 rounded-full ${statusDotColor[server.status]}`} />
            )}
            <span className="text-sm font-bold">
              {statusLabel[server.status]}
            </span>
          </div>
        </div>

        {/* Grille d'informations */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Circuit */}
          <InfoCard
            icon={<MapPin className="h-4 w-4 text-orange-400" />}
            label="Circuit"
            value={server.circuit}
          />

          {/* Session */}
          <InfoCard
            icon={<Timer className="h-4 w-4 text-orange-400" />}
            label="Session"
            value={server.currentSession}
            sub={`${server.timeRemaining} restant`}
          />

          {/* Pilotes */}
          <InfoCard
            icon={<Users className="h-4 w-4 text-orange-400" />}
            label="Pilotes"
            value={`${server.driversCount} / ${server.maxDrivers}`}
            sub="engagés"
          />

          {/* Catégorie */}
          <InfoCard
            icon={<Gauge className="h-4 w-4 text-orange-400" />}
            label="Catégorie"
            value={server.category}
          />

          {/* Météo */}
          <InfoCard
            icon={<CloudSun className="h-4 w-4 text-orange-400" />}
            label="Météo"
            value={server.weather.condition}
            sub={`${server.weather.temperature}°C`}
          />

          {/* État de la piste */}
          <InfoCard
            icon={<CircleDot className="h-4 w-4 text-orange-400" />}
            label="Piste"
            value={trackConditionLabel[server.weather.trackCondition]}
            className={trackConditionColor[server.weather.trackCondition]}
          />

          {/* Vent */}
          <InfoCard
            icon={<Wind className="h-4 w-4 text-orange-400" />}
            label="Vent"
            value={`${server.weather.windSpeed} km/h`}
          />

          {/* Pluie + Tours */}
          <InfoCard
            icon={<Thermometer className="h-4 w-4 text-orange-400" />}
            label="Pluie / Tours"
            value={`${server.weather.rainPercent}%`}
            sub={`${server.lapsCompleted} / ${server.totalLaps} tours`}
          />
        </div>
      </div>
    </section>
  );
}

// ─── Sous-composant : carte d'information ─────────────────────────────

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
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          {label}
        </p>
        <p className={`mt-0.5 truncate text-sm font-bold ${className}`}>
          {value}
        </p>
        {sub && (
          <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
        )}
      </div>
    </div>
  );
}
