import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const viewerFiles = await Promise.all([
  readFile(new URL("../legacy/live-timing-49349/app/_components/live-timing-standing-row.tsx", import.meta.url), "utf8"),
  readFile(new URL("../legacy/live-timing-49349/app/_components/live-timing-standings.tsx", import.meta.url), "utf8"),
  readFile(new URL("../legacy/live-timing-49349/app/_types/live-timing.ts", import.meta.url), "utf8"),
]);
const viewerSource = viewerFiles.join("\n");

test("le Viewer public ne réserve ni n’affiche une durée d’arrêt aux stands", () => {
  assert.doesNotMatch(viewerSource, /pitStopDurationSeconds|formatPitStopDuration|temps-arret|Temps d’arrêt/);
});
