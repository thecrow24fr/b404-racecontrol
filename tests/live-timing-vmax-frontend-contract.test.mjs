import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("la colonne Vmax affiche exclusivement maxSpeedKmh du contrat natif", async () => {
  const [types, row] = await Promise.all([
    source("app/_types/live-timing.ts"),
    source("app/_components/live-timing-standing-row.tsx"),
  ]);

  assert.match(types, /maxSpeedKmh\??:\s*number\s*\|\s*null/);
  assert.match(row, /entry\.maxSpeedKmh/);
  assert.match(row, /Vitesse maximale observée via carVelocity/);
  assert.doesNotMatch(row, /Vitesse maximale indisponible via le contrat natif/);
});
