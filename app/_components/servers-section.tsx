import { ServerCard, type Server } from "./server-card";
import { AnimatedSection } from "./animated-section";

// TODO: Remplacer par un fetch API une fois le backend en place
const servers: Server[] = [
  {
    id: "gt3",
    name: "Serveur GT3",
    circuit: "Spa-Francorchamps",
    session: "Practice",
    drivers: 18,
    status: "online",
  },
  {
    id: "hypercar",
    name: "Serveur Hypercar",
    circuit: "Le Mans",
    session: "Qualifications",
    drivers: 12,
    status: "online",
  },
  {
    id: "lmp2",
    name: "Serveur LMP2",
    circuit: "—",
    session: "—",
    drivers: 0,
    status: "offline",
  },
];

export function ServersSection() {
  const onlineCount = servers.filter((s) => s.status === "online").length;

  return (
    <section
      id="servers"
      className="relative overflow-hidden border-b border-white/10"
    >
      {/* Dégradé de fond */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_12%,rgba(255,122,0,0.13),transparent_34%),linear-gradient(180deg,#09111d_0%,#06101d_100%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <AnimatedSection>
          {/* En-tête de section */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-orange-300">
                Serveurs
              </p>
              <h2 className="text-4xl font-black sm:text-5xl">
                Sessions en direct
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-gray-400">
                Les serveurs de course B404 accessibles &agrave; tout moment.
                Rejoignez les sessions et suivez l&rsquo;action en temps
                r&eacute;el.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-right">
              <p className="text-2xl font-black leading-none text-orange-300">
                {onlineCount}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
                en ligne
              </p>
            </div>
          </div>
        </AnimatedSection>

        {/* Grille de cartes */}
        <div className="grid gap-6 md:grid-cols-3">
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      </div>
    </section>
  );
}
