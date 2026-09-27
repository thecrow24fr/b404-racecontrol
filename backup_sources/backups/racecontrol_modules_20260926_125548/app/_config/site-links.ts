/**
 * Public navigation targets.
 *
 * The official B404 vitrine has a fixed public destination. RaceControl keeps
 * a same-origin fallback for local previews, while an explicit public origin
 * can still be supplied for a deployed build.
 */
function normalizePublicOrigin(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

const raceControlOrigin = normalizePublicOrigin(
  process.env.NEXT_PUBLIC_RACECONTROL_URL,
);

export const siteLinks = {
  /** Official B404 vitrine. */
  siteVitrine: "https://b404ldc.fr",
  /** RaceControl home, kept separate from the official vitrine. */
  raceControlHome: raceControlOrigin || "/",
  /** Native RaceControl Live Timing route. */
  liveTiming: raceControlOrigin ? `${raceControlOrigin}/live-timing` : "/live-timing",
} as const;
