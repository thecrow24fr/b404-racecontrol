import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standings = readFileSync(new URL("../legacy/live-timing-49349/app/_components/live-timing-standings.tsx", import.meta.url), "utf8");
const row = readFileSync(new URL("../legacy/live-timing-49349/app/_components/live-timing-standing-row.tsx", import.meta.url), "utf8");

test("le tableau n'impose pas une largeur minimale fixe de 1980 px", () => {
  assert.doesNotMatch(standings, /min-w-\\[1980px\\]/);
  assert.match(standings, /<table className="w-full[^\"]*table-fixed"/);
});

test("les colonnes détaillées sont masquées sous les largeurs où elles restent lisibles", () => {
  assert.match(row, /data-column="classe" className="[^\"]*hidden[^\"]*lg:table-cell/);
  assert.match(row, /data-column="sector-s1" className="[^\"]*hidden[^\"]*2xl:table-cell/);
  assert.match(standings, /<col className="hidden 2xl:table-column"/);
});
