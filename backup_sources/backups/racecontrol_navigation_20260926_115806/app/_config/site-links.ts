/**
 * Public cross-site navigation targets.
 *
 * Only public site origins are configurable here. No R2LA origin, endpoint,
 * port, or internal source is exposed to the browser.
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
  /** Public team/institutional site; same-app fallback keeps local preview usable. */
  siteVitrine: siteVitrineOrigin || "/",
  /** Native RaceControl Live Timing route; no definitive domain is assumed. */
  liveTiming: raceControlOrigin ? `${raceControlOrigin}/live-timing` : "/live-timing",
} as const;
