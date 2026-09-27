/**
 * Public navigation targets.
 *
 * The vitrine has a stable public destination. RaceControl keeps a same-origin
 * fallback for local previews, while an explicit public origin can still be
 * supplied for a deployed build.
 */
function normalizePublicOrigin(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

const siteVitrineOrigin = normalizePublicOrigin(
  process.env.NEXT_PUBLIC_SITE_VITRINE_URL,
);
const raceControlOrigin = normalizePublicOrigin(
  process.env.NEXT_PUBLIC_RACECONTROL_URL,
);

export const siteLinks = {
  /** Official public vitrine; local previews still point to b404.fr by default. */
  siteVitrine: siteVitrineOrigin || "https://b404.fr",
  /** RaceControl home, kept separate from the official vitrine. */
  raceControlHome: raceControlOrigin || "/",
  /** Native RaceControl Live Timing route. */
  liveTiming: raceControlOrigin ? `${raceControlOrigin}/live-timing` : "/live-timing",
} as const;
