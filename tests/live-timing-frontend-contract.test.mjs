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
