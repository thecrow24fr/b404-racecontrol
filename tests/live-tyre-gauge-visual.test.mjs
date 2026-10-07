import test from "node:test";
import assert from "node:assert/strict";
import { tyreGaugeVisual } from "../app/_services/live-tyre-gauge-visual.mjs";

test("jauge : la couleur diminue avec le restant et le texte reste lisible sur noir", () => {
  const full = tyreGaugeVisual(100);
  const medium = tyreGaugeVisual(68.6);
  const low = tyreGaugeVisual(18);
  assert.deepEqual([full.fillY, full.fillHeight, full.textColor], [12, 196, "#06101d"]);
  assert.ok(Math.abs(medium.fillHeight - 134.456) < 1e-9);
  assert.equal(medium.textColor, "#06101d");
  assert.ok(Math.abs(low.fillY - 172.72) < 1e-9);
  assert.ok(Math.abs(low.fillHeight - 35.28) < 1e-9);
  assert.equal(low.textColor, "#f8fafc");
});
