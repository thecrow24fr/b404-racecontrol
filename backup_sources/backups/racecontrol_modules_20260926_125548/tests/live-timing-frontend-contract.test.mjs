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

test("le client affiche les sections Records et Pneus", async () => {
  const client = await text("app/_components/live-timing-client.tsx");
  assert.match(client, /LiveTimingRecords/);
  assert.match(client, /LiveTimingTyres/);
  await access(new URL("app/_components/live-timing-records.tsx", root));
  await access(new URL("app/_components/live-timing-tyres.tsx", root));
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
