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

test("le classement reprend la session active et la position de départ", async () => {
  const standings = await text("app/_components/live-timing-standings.tsx");
  const row = await text("app/_components/live-timing-standing-row.tsx");
  const info = await text("app/_components/live-timing-server-info.tsx");
  assert.match(standings, /Classement — \{rankingSessionLabel\(sessionName, sessionPhase\)\}/);
  assert.match(standings, /case "practice"/);
  assert.match(standings, /case "qualifying"/);
  assert.match(standings, /case "race"/);
  assert.match(row, /startingPosition/);
  assert.match(row, /Position de départ/);
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
  const types = await text("app/_types/live-timing.ts");

  assert.match(track, /const MARKER_LABEL_RADIUS = 8/);
  assert.match(track, /r=\{MARKER_LABEL_RADIUS\}/);
  assert.match(track, /fontSize=\{MARKER_LABEL_FONT_SIZE\}/);
  assert.match(track, /entry\.underYellow === true/);
  assert.match(track, /entry\.inPit \? "#06b6d4"/);
  assert.match(track, /data-sector-flag-overlay/);
  assert.match(row, /bg-cyan-500\/15/);
  assert.match(row, /text-cyan-300/);
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

test("les secteurs jaunes sont rendus uniquement quand le contrat les confirme", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const banner = await text("app/_components/live-timing-session-banner.tsx");
  const types = await text("app/_types/live-timing.ts");

  assert.match(track, /yellowSectors/);
  assert.match(track, /data-sector-flag-marker/);
  assert.match(track, /S\$\{sector\}/);
  assert.match(track, /Drapeau jaune/);
  assert.match(banner, /flag\.sector > 0/);
  assert.match(banner, /Général/);
  assert.match(types, /flags: Flag\[\]/);
});

test("les vignettes numérotées restent directement sur leurs ancres AIW sans offset visuel", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");

  assert.match(track, /transform=\{`translate\(\$\{point\.x\} \$\{point\.y\}\)`\}/);
  assert.match(track, /interpolateGeometryPoint\(geometry, entry\.lapDistance/);
  assert.match(track, /entry\.inPit \? "#06b6d4"/);
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
