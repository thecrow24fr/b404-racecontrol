import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { access } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("la page Live Timing n’utilise plus de snapshot mock comme donnée initiale", async () => {
  const page = await text("app/live-timing/page.tsx");
  assert.match(page, /emptyLiveTimingData/);
  assert.doesNotMatch(page, /mockLiveTimingData/);
});

test("le client Live affiche la progression et garde Records/Pneus indépendants", async () => {
  const client = await text("app/_components/live-timing-client.tsx");
  assert.match(client, /LiveTimingTrackLine/);
  assert.doesNotMatch(client, /LiveTimingRecords/);
  assert.doesNotMatch(client, /LiveTimingTyres/);
  await access(new URL("app/_components/live-timing-track-line.tsx", root));
  await access(new URL("app/_components/live-timing-records.tsx", root));
  await access(new URL("app/_components/live-timing-tyres.tsx", root));
});

test("Progression Live affiche la position de classement et conserve le runtime pour la progression", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const client = await text("app/_components/live-timing-client.tsx");
  const types = await text("app/_types/live-timing.ts");

  assert.match(track, /const markers = standings[\s\S]*?sort\(\(a, b\) => \(a\.lapProgress/);
  assert.match(track, /const marker = String\(entry\.position\)/);
  assert.doesNotMatch(track, /const marker = entry\.carNumber/);
  assert.match(track, /Marqueur : position actuelle au classement/);
  assert.match(track, /trackLengthSource/);
  assert.match(client, /trackLength=\{data\.server\.trackLength \?\? null\}/);
  assert.match(types, /trackLength\?: number \| null/);
  assert.match(types, /trackLengthSource\?: string \| null/);
  assert.match(types, /carNumber\?: string/);
});

test("Progression Live affiche le titre Positions en piste", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(track, /Positions en piste/);
  assert.doesNotMatch(track, /Position des voitures sur le tour/);
});

test("le classement reprend la session active et la position de qualification", async () => {
  const standings = await text("app/_components/live-timing-standings.tsx");
  const row = await text("app/_components/live-timing-standing-row.tsx");
  const info = await text("app/_components/live-timing-server-info.tsx");
  assert.match(standings, /Classement — \{rankingSessionLabel\(sessionName, sessionPhase\)\}/);
  assert.match(standings, /case "practice"/);
  assert.match(standings, /case "qualifying"/);
  assert.match(standings, /case "race"/);
  assert.match(row, /startingPosition/);
  assert.match(row, /Position de qualification/);
  assert.match(info, /tours parcourus/);
  assert.doesNotMatch(info, /Pluie \/ Tours/);
});
test("la tuile Météo affiche le badge de démarrage du système météo réelle sans état de connexion", async () => {
  const info = await text("app/_components/live-timing-server-info.tsx");
  const client = await text("app/_components/live-timing-client.tsx");
  const types = await text("app/_types/live-timing.ts");

  assert.match(types, /weatherClientStatus\?: WeatherClientStatus \| null/);
  assert.match(info, /weatherClientStatus\?: WeatherClientStatus \| null/);
  assert.match(info, /label="Météo"/);
  assert.match(info, /Météo réelle démarrée/);
  assert.doesNotMatch(info, /Système de météo réelle démarré/);
  assert.match(info, /detailClassName="[^"]*border-cyan-200\/70/);
  assert.match(info, /detailClassName="[^"]*bg-cyan-300\/20/);
  assert.match(info, /detailClassName="[^"]*text-cyan-50/);
  assert.doesNotMatch(info, /(?:Météo réelle|Client météo)[^\n"]*(?:active|actif|connectée|connecté|en direct)/i);
  assert.doesNotMatch(info, /inRealtime/);
  assert.match(info, /label="Piste"[\s\S]*?sub=\{numberLabel\(trackTemperature, "°C"\)\}/);
  assert.match(info, /label="Piste"[\s\S]*?detail=\{lapsLabel\(server\.lapsCompleted, server\.totalLaps\)\}/);
  assert.match(info, /label="Pluie"[\s\S]*?value=\{numberLabel\(server\.weather\.rainPercent, "%"\)\}/);
  assert.doesNotMatch(info, /label="Pluie"[\s\S]*?lapsLabel\(server\.lapsCompleted/);
  assert.match(client, /<ServerInfoPanel[\s\S]*?server=\{data\.server\}[\s\S]*?trackTemperature=\{data\.session\.trackTemp\}[\s\S]*?weatherClientStatus=\{data\.session\.weatherClientStatus\}[\s\S]*?\/>/);
  assert.doesNotMatch(client, /realWeatherActive|inRealtime/);
});

test("la barre conserve l’uptime séparé et refuse le chrono de session comme substitut", async () => {
  const banner = await text("app/_components/live-timing-session-banner.tsx");
  const types = await text("app/_types/live-timing.ts");
  assert.match(types, /serverUptime\?: string \| null/);
  assert.match(banner, /const serverUptimeLabel = session\.serverUptime \?\? "Non disponible"/);
  assert.match(banner, /Uptime serveur : \{serverUptimeLabel\}/);
  assert.doesNotMatch(banner, /Uptime serveur : \{formatRFactorDuration\(session\.serverTime\)\}/);
});

test("le hook utilise la source publique explicite sans fallback mock", async () => {
  const hook = await text("app/_services/use-live-timing.ts");
  assert.match(hook, /PublicLiveTimingProvider/);
  assert.doesNotMatch(hook, /MockDataProvider/);
  assert.doesNotMatch(hook, /MergeEngineProvider/);
});

test("la section Pneus prévoit explicitement l’absence de données API", async () => {
  const tyres = await text("app/_components/live-timing-tyres.tsx");
  assert.match(tyres, /Données pneus non disponibles/);
  assert.match(tyres, /évolution/i);
});

test("les bulles Live restent proches du tracé, lisibles jusqu’au rang 35 et les PIT ne sont pas jaunes", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const row = await text("app/_components/live-timing-standing-row.tsx");
  const theme = await text("app/_services/live-timing-visual-theme.ts");
  const types = await text("app/_types/live-timing.ts");

  assert.match(track, /const MARKER_LABEL_RADIUS = 8/);
  assert.match(track, /r=\{MARKER_LABEL_RADIUS\}/);
  assert.match(track, /fontSize=\{MARKER_LABEL_FONT_SIZE\}/);
  assert.match(track, /const markerPalette = getMarkerPalette/);
  assert.match(theme, /PIT_MARKER_PALETTE/);
  assert.match(theme, /#64748b/);
  assert.match(theme, /#cbd5e1/);
  assert.doesNotMatch(track, /entry\.underYellow === true/);
  assert.doesNotMatch(track, /entry\.inPit \? "#06b6d4"/);
  assert.doesNotMatch(track, /data-sector-flag-overlay/);
  assert.match(row, /border-slate-300\/60/);
  assert.match(row, /text-slate-100/);
  assert.doesNotMatch(row, /bg-yellow-500\/15[\s\S]*?PIT/);
  assert.match(types, /underYellow\?: boolean \| null/);
});

test("la géométrie AIW utilise un cache précis source/layout avec stale-while-revalidate", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const client = await text("app/_components/live-timing-client.tsx");

  assert.match(track, /geometryCacheStorageKey/);
  assert.match(track, /localStorage/);
  assert.match(track, /sourceId.*technicalId/);
  assert.match(track, /cache: "no-store"/);
  assert.match(track, /setGeometryState\(\{[\s\S]*?geometry: cachedGeometry/);
  assert.match(track, /void refreshTrackGeometry\(/);
  assert.match(client, /flags=\{data\.session\.flags\}/);
});

test("les drapeaux jaunes restent non localisés quand les bornes AIW manquent", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const banner = await text("app/_components/live-timing-session-banner.tsx");
  const types = await text("app/_types/live-timing.ts");

  assert.match(track, /yellowSectors/);
  assert.match(track, /data-sector-flag-notice/);
  assert.match(track, /Drapeau jaune/);
  assert.match(track, /bornes sectorielles AIW non fournies/);
  assert.match(track, /portion du tracé non colorée/);
  assert.doesNotMatch(track, /data-sector-flag-overlay/);
  assert.doesNotMatch(track, /lapLength\s*\/\s*3/);
  assert.match(banner, /flag\.sector > 0/);
  assert.match(banner, /Général/);
  assert.match(types, /flags: Flag\[\]/);
});

test("les pastilles animent seulement les petits déplacements et se recalent sur un changement de contexte", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(track, /retargetMarkerMotion/);
  assert.match(track, /requestAnimationFrame/);
  assert.match(track, /VISUAL_MARKER_ANIMATION_DURATION_MS/);
  assert.match(track, /MAX_MARKER_ANIMATION_DISTANCE/);
  assert.match(track, /getAnimatedLapDistance/);
  assert.match(track, /data-marker-motion/);
  assert.match(track, /entry\.inPit === true/);
  assert.match(track, /participantId/);
  assert.doesNotMatch(track, /key=\{`\$\{entry\.position\}-\$\{entry\.driverName\}`\}/);
});

test("la retargetisation repart de la position affichée pendant le cycle SSE", async () => {
  const motion = await text("app/_services/live-timing-track-motion.ts");
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(motion, /VISUAL_MARKER_ANIMATION_DURATION_MS = 760/);
  assert.match(motion, /retargetMarkerMotion/);
  assert.match(motion, /getAnimatedLapDistance\(active\.plan, elapsedMs\)/);
  assert.match(motion, /getAnimatedLapVelocity\(active\.plan, elapsedMs\)/);
  assert.match(motion, /initialVelocity/);
  assert.match(motion, /progressCubed/);
  assert.match(track, /retargetMarkerMotion/);
  assert.match(track, /sessionKey/);
});

test("l’animation SVG ne réconcilie pas React à chaque frame", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(track, /useLayoutEffect/);
  assert.match(track, /markerElementsRef/);
  assert.match(track, /setAttribute\("transform"/);
  assert.doesNotMatch(track, /setVisualMarkerState/);
});

test("le badge jaune est externe et le trait de liaison dépend de bornes AIW explicites", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(track, /sectorBounds/);
  assert.match(track, /deriveSector3Bounds/);
  assert.match(track, /startDistance: sector2\.endDistance/);
  assert.match(track, /data-sector-flag-track/);
  assert.match(track, /getSectorPath/);
  assert.match(track, /data-sector-flag-badge/);
  assert.match(track, /data-sector-flag-leader/);
  assert.match(track, /getSectorAnchor/);
  assert.match(track, /bornes sectorielles AIW non fournies/);
  assert.match(track, /pointer-events-none/);
  assert.doesNotMatch(track, /data-sector-flag-overlay/);
  assert.doesNotMatch(track, /lapLength\s*\/\s*3/);
});

test("les vignettes numérotées restent directement sur leurs ancres AIW sans offset visuel", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(track, /transform=\{`translate\(\$\{point\.x\} \$\{point\.y\}\)`\}/);
  assert.match(track, /markerElementsRef\.current\.set\(identity, element\)/);
  assert.match(track, /getMarkerPalette\(entry\.carClass, entry\.inPit === true\)/);
  assert.doesNotMatch(track, /entry\.underYellow === true/);
  assert.doesNotMatch(track, /entry\.inPit \? "#06b6d4"/);
  assert.doesNotMatch(track, /labelOffset/);
  assert.doesNotMatch(track, /BATTLE_BUBBLE_DISTANCE/);
  assert.doesNotMatch(track, /BATTLE_BUBBLE_OUTWARD_OFFSET/);
  assert.doesNotMatch(track, /compactBattleGroup/);
  assert.doesNotMatch(track, /data-marker-anchor/);
  assert.doesNotMatch(track, /x2=\{labelOffset\.x\}/);
});

test("le hook efface le classement périmé pendant une erreur SSE puis accepte la reprise", async () => {
  const hook = await text("app/_services/use-live-timing.ts");

  assert.match(hook, /const recoveryData = emptyDataForSource\(sourceId\)/);
  assert.match(hook, /setData\(recoveryData\)/);
  assert.match(hook, /setIsLive\(false\)/);
  assert.match(hook, /applyResult\(result\)/);
});

test("le classement affiche les colonnes de la maquette sans Au suivant ni Départ", async () => {
  const standings = await text("app/_components/live-timing-standings.tsx");
  const row = await text("app/_components/live-timing-standing-row.tsx");

  assert.match(standings, /Évol\./);
  assert.match(standings, /Secteurs du dernier tour/i);
  assert.match(standings, /Usure des 4 pneus/i);
  assert.doesNotMatch(standings, /Au suivant/);
  assert.doesNotMatch(standings, />Départ</);
  assert.match(standings, /Meilleur tour/);
  assert.match(row, /sessionPhase/);
  assert.match(row, /entry\.carClass/);
  assert.match(row, /entry\.pitStops/);
  assert.match(row, /entry\.lastLap/);
  assert.match(row, /entry\.sector1/);
  assert.match(row, /entry\.sector2/);
  assert.match(row, /entry\.sector3/);
  assert.match(standings, /VMax/);
  assert.match(standings, /Pneus[\s\S]*AV\/AR/);
  assert.match(row, /AVG/);
  assert.match(row, /AVD/);
  assert.match(row, /ARG/);
  assert.match(row, /ARD/);
  assert.match(row, /En piste/);
  assert.match(row, /fuelFraction/);
});

test("l’évolution du classement reste réservée à la course et gère la qualification absente", async () => {
  const row = await text("app/_components/live-timing-standing-row.tsx");

  assert.match(row, /sessionPhase !== "race"/);
  assert.match(row, /startingPosition === null/);
  assert.match(row, /Position inchangée/);
  assert.match(row, /Gain/);
  assert.match(row, /Perte/);
  assert.match(row, /−/);
});

test("le classement distingue visiblement les participants humains et IA du fallback vérifié", async () => {
  const row = await text("app/_components/live-timing-standing-row.tsx");
  const types = await text("app/_types/live-timing.ts");
  assert.match(row, /entry\.driverType === "human"/);
  assert.match(row, /entry\.driverType === "ai"/);
  assert.match(row, />Humain</);
  assert.match(row, />IA</);
  assert.match(types, /driverType\?: "human" \| "ai"/);
});

test("un classement vide affiche la cause précise du refus de Shared Memory", async () => {
  const table = await text("app/_components/live-timing-standings.tsx");
  const client = await text("app/_components/live-timing-client.tsx");
  const types = await text("app/_types/live-timing.ts");
  assert.match(table, /unavailableReason/);
  assert.match(client, /unavailableReason=\{data\.server\.standingsUnavailableReason\}/);
  assert.match(types, /standingsUnavailableReason\?: string \| null/);
});

test("le classement applique une palette B404 cohérente jusqu’aux télémétries et n’isole pas de jaune", async () => {
  const row = await text("app/_components/live-timing-standing-row.tsx");
  const theme = await text("app/_services/live-timing-visual-theme.ts");

  assert.match(row, /getCarClassPalette/);
  assert.match(row, /data-column="classe"/);
  assert.match(row, /data-column="pneus"/);
  assert.match(row, /data-column="carburant"/);
  assert.match(row, /data-column=\{`usure-\$\{corner\}`\}/);
  assert.match(row, /data-column="statut"/);
  assert.match(row, /fuelFraction/);
  assert.match(row, /Fuel/);
  assert.match(row, /inPit \? "pit"/);
  assert.match(row, /border-slate/);
  assert.doesNotMatch(row, /text-yellow-|bg-yellow-|border-yellow-/);
  assert.match(row, /Sous drapeau/);
  assert.match(theme, /GT3: Object\.freeze\(\{[\s\S]*fill: "#f97316"/);
  assert.match(theme, /GT4: Object\.freeze\(\{[\s\S]*fill: "#2563eb"/);
  assert.match(theme, /LMP2: Object\.freeze\(\{[\s\S]*fill: "#9333ea"/);
  assert.match(theme, /FALLBACK_CAR_CLASS_PALETTE/);
  assert.doesNotMatch(theme, /yellow/i);
});

test("la géométrie AIW utilise la même base publique que le flux Live Timing", async () => {
  const provider = await text("app/_services/public-live-timing-provider.ts");
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(provider, /export function publicLiveTimingApiUrl/);
  assert.match(track, /publicLiveTimingApiUrl\(/);
  assert.doesNotMatch(track, /fetch\(`\/api\/public\/live-timing/);
});

test("le classement occupe toute la largeur desktop sans supprimer de colonnes", async () => {
  const standings = await text("app/_components/live-timing-standings.tsx");

  assert.match(standings, /w-full max-w-none px-3 py-8 sm:px-4 lg:px-6/);
  assert.doesNotMatch(standings, /max-w-7xl px-6 py-8/);
  assert.match(standings, /<table className=\"w-full min-w-\[1800px\]\"/);
  assert.match(standings, /overflow-x-auto/);
  assert.match(standings, /Usure des 4 pneus/);
  assert.match(standings, />Statut</);
});
