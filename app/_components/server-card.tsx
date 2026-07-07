import { StatusBadge, type StatusType } from "./status-badge";

export interface Server {
  id: string;
  name: string;
  circuit: string;
  session: string;
  drivers: number;
  status: StatusType;
}

export function ServerCard({ server }: { server: Server }) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d1b2e] shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1.5 hover:border-orange-400/45 hover:shadow-orange-500/10"
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        animation: "fade-up 0.6s ease-out forwards",
        animationDelay: "200ms",
      }}
    >
      {/* Glow effect au hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/70 to-transparent" />
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-orange-500/15 blur-3xl" />
      </div>

      <div className="relative flex flex-col p-6">
        {/* En-tête */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black text-white group-hover:text-orange-200 transition-colors">
              {server.name}
            </h3>
            <p className="mt-0.5 text-sm text-gray-400">{server.circuit}</p>
          </div>
          <StatusBadge status={server.status} />
        </div>

        {/* Informations */}
        <div className="mb-5 flex items-center gap-4 text-sm">
          {/* Icône horloge */}
          <div className="flex items-center gap-1.5 text-gray-400 transition group-hover:text-gray-300">
            <svg
              className="h-4 w-4 transition group-hover:rotate-12 group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span>{server.session}</span>
          </div>

          {/* Icône utilisateurs */}
          <div className="flex items-center gap-1.5 text-gray-400 transition group-hover:text-gray-300">
            <svg
              className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
            <span>{server.drivers} pilotes</span>
          </div>
        </div>

        {/* Bouton */}
        <button
          type="button"
          disabled={server.status !== "online"}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition ${
            server.status === "online"
              ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20 hover:-translate-y-0.5 hover:bg-orange-400 active:scale-[0.98]"
              : "pointer-events-none bg-white/10 text-gray-500"
          }`}
        >
          {server.status === "online" ? (
            <>
              {/* Icône play */}
              <svg
                className="h-4 w-4 transition group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                />
              </svg>
              Rejoindre la session
            </>
          ) : (
            "Indisponible"
          )}
        </button>
      </div>
    </div>
  );
}
