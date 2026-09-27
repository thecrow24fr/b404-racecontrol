/**
 * Destinations publiques RaceControl.
 *
 * B404 est le site public officiel ; les modules RaceControl restent des
 * routes indépendantes du portail local. Les origines internes ne sortent
 * jamais de cette configuration frontend.
 */
function normalizePublicOrigin(value: string | undefined): string {
  return value?.trim().replace(/\/+$/, "") ?? "";
}

const raceControlOrigin = normalizePublicOrigin(
  process.env.NEXT_PUBLIC_RACECONTROL_URL,
);

function raceControlRoute(path: string): string {
  return raceControlOrigin ? `${raceControlOrigin}${path}` : path;
}

export const siteLinks = {
  /** Site public officiel B404. */
  siteVitrine: "https://b404ldc.fr",
  /** Accueil du portail RaceControl. */
  raceControlHome: raceControlOrigin || "/",
  /** Modules indépendants du portail. */
  results: raceControlRoute("/resultats"),
  records: raceControlRoute("/records"),
  championship: raceControlRoute("/championnat"),
  competitions: raceControlRoute("/competitions"),
  liveTiming: raceControlRoute("/live-timing"),
  about: raceControlRoute("/a-propos"),
  servers: raceControlRoute("/serveurs"),
} as const;
