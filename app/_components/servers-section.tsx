import { ServerCard } from "./server-card";
import type { ServerOverview } from "../_types/server-overview";

const OFFLINE_SERVERS: ServerOverview[] = ["1", "2", "3", "4", "5", "6", "7"].map((id) => ({
  id,
  name: `S${id}`,
  circuit: "—",
  simulator: "rf2",
  status: "offline",
  session: {
    type: "—",
    timeRemaining: "--:--",
    totalTime: "--:--",
    lapsCompleted: 0,
    totalLaps: 0,
    bestLap: "--:--.---",
  },
  drivers: 0,
  maxDrivers: 0,
  weather: {
    temperature: 0,
    trackTemp: 0,
    condition: "clear",
    rainPercent: 0,
    windSpeed: 0,
  },
  flags: [],
  access: "public",
  hasPassword: false,
}));

const ALL_SERVERS: ServerOverview[] = [
  ...OFFLINE_SERVERS,
  {
    id: "8",
    name: "S8 — Laboratoire",
    circuit: "test-gd",
    simulator: "rf2",
    status: "offline",
    session: {
      type: "Laboratoire",
      timeRemaining: "--:--",
      totalTime: "--:--",
      lapsCompleted: 0,
      totalLaps: 0,
      bestLap: "--:--.---",
    },
    drivers: 0,
    maxDrivers: 0,
    weather: {
      temperature: 0,
      trackTemp: 0,
      condition: "clear",
      rainPercent: 0,
      windSpeed: 0,
    },
    flags: [],
    access: "public",
    hasPassword: false,
    championship: "Laboratoire / test-gd",
  },
  {
    id: "20",
    name: "S20 — Entraînement",
    circuit: "Watkins Glen Boot",
    simulator: "rf2",
    status: "online",
    session: {
      type: "Practice",
      timeRemaining: "--:--",
      totalTime: "--:--",
      lapsCompleted: 0,
      totalLaps: 0,
      bestLap: "--:--.---",
    },
    drivers: 0,
    maxDrivers: 52,
    weather: {
      temperature: 10,
      trackTemp: 44,
      condition: "clear",
      rainPercent: 0,
      windSpeed: 0,
    },
    flags: [],
    access: "public",
    hasPassword: false,
    championship: "Source Live Timing RaceControl",
  },
];

export function ServersSection() {
  const online = ALL_SERVERS.filter(s => s.status === "online").length;
  return (
    <section id="servers" className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(255,122,0,0.13),transparent_34%),linear-gradient(180deg,#09111d_0%,#06101d_100%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-orange-300">Serveurs</p>
            <h2 className="text-3xl font-black sm:text-4xl">Sources RaceControl</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
              S20 alimente le Live Timing du prototype ; S1 à S8 restent affichés comme périmètre réservé.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
            <p className="text-2xl font-black leading-none text-orange-300 tabular-nums">{online}</p>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-500">en ligne</p>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ALL_SERVERS.map(s => <ServerCard key={s.id} server={s} />)}
        </div>
      </div>
    </section>
  );
}
