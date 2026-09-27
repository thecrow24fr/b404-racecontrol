"use client";

import { Award, CircleGauge, ListOrdered, Radio, RefreshCw } from "lucide-react";

interface LiveTimingModuleNavProps {
  isLoading: boolean;
  onRefresh: () => void | Promise<void>;
}

const MODULE_LINKS = [
  { href: "#en-direct", label: "En direct", icon: Radio },
  { href: "#classement", label: "Classement", icon: ListOrdered },
  { href: "#records", label: "Records", icon: Award },
  { href: "#pneus", label: "Pneus", icon: CircleGauge },
] as const;

/** Navigation interne limitée aux blocs Live Timing réellement rendus. */
export function LiveTimingModuleNav({
  isLoading,
  onRefresh,
}: LiveTimingModuleNavProps) {
  return (
    <nav
      aria-label="Navigation Live Timing"
      className="border-b border-white/10 bg-[#0a1420]"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">
            Live Timing
          </span>
          {MODULE_LINKS.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-200"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </a>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/20 disabled:cursor-wait disabled:opacity-50"
          title={isLoading ? "Actualisation en cours" : "Rafraîchir les données Live Timing"}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          {isLoading ? "Actualisation…" : "Rafraîchir"}
        </button>
      </div>
    </nav>
  );
}
