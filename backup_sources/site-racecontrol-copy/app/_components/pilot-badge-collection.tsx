/**
 * PilotBadgeCollection — Affichage des badges d'un pilote.
 */
"use client";

import type { PilotBadge } from "../_types/pilot";

interface Props {
  badges: PilotBadge[];
}

const CATEGORY_LABELS: Record<string, string> = {
  career: "Carrière",
  performance: "Performance",
  endurance: "Endurance",
  community: "Communauté",
  special: "Spécial",
};

const CATEGORY_COLORS: Record<string, string> = {
  career: "border-orange-500/30 bg-orange-500/5",
  performance: "border-emerald-500/30 bg-emerald-500/5",
  endurance: "border-blue-500/30 bg-blue-500/5",
  community: "border-purple-500/30 bg-purple-500/5",
  special: "border-yellow-500/30 bg-yellow-500/5",
};

export function PilotBadgeCollection({ badges }: Props) {
  if (!badges || badges.length === 0) {
    return (
      <div className="w-full mb-8">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
          Badges
        </h2>
        <div className="bg-[#0d1b2e] rounded-3xl p-8 border border-white/10 text-center">
          <p className="text-gray-500 text-sm">
            Aucun badge débloqué pour le moment.
          </p>
        </div>
      </div>
    );
  }

  // Grouper par catégorie
  const grouped: Record<string, PilotBadge[]> = {};
  for (const b of badges) {
    const cat = b.category || "career";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(b);
  }

  return (
    <div className="w-full mb-8">
      <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
        Badges ({badges.length})
      </h2>

      {Object.entries(grouped).map(([category, catBadges]) => (
        <div key={category} className="mb-6">
          <h3 className="text-sm font-bold text-gray-400 mb-3">
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className="flex flex-wrap gap-3">
            {catBadges.map((badge) => (
              <div
                key={badge.type}
                className={`rounded-xl px-4 py-3 border ${CATEGORY_COLORS[category] ?? "border-white/10 bg-[#0d1b2e]"}`}
                title={badge.description}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getBadgeIcon(badge.icon)}</span>
                  <div>
                    <div className="text-sm font-bold text-white">
                      {badge.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {badge.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function getBadgeIcon(icon?: string): string {
  const icons: Record<string, string> = {
    Flag: "🏁",
    Trophy: "🏆",
    Medal: "🥇",
    Zap: "⚡",
    Clock: "⏱",
    Award: "🎖",
    TrendingUp: "📈",
    Shield: "🛡",
    Moon: "🌙",
    Star: "⭐",
    Heart: "❤️",
    Users: "👥",
    BarChart3: "📊",
    TriangleRight: "▶️",
  };
  return icons[icon ?? ""] ?? "🎯";
}
