import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const sourceUrl = new URL("../app/_services/live-timing-track-motion.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const motion = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const running = (lapDistance) => ({
  lapDistance,
  inPit: false,
  status: "running",
});

test("un retarget SSE conserve la vitesse visuelle instantanée", () => {
  const lapLength = 6000;
  const first = motion.planMarkerMotion(running(100), running(200), lapLength);
  const active = {
    input: running(200),
    plan: first,
    startedAt: 0,
  };
  const retargetAt = 380;
  const expectedDistance = motion.getAnimatedLapDistance(first, retargetAt);
  const expectedVelocity = motion.getAnimatedLapVelocity(first, retargetAt);

  const retargeted = motion.retargetMarkerMotion(
    active,
    running(280),
    lapLength,
    retargetAt,
  );

  assert.ok(Math.abs(retargeted.fromDistance - expectedDistance) < 1e-9);
  assert.ok(Math.abs(retargeted.initialVelocity - expectedVelocity) < 1e-9);
  assert.ok(Math.abs(motion.getAnimatedLapVelocity(retargeted, 0) - expectedVelocity) < 1e-9);
});

test("un changement de rang n’entraîne pas de recadrage", () => {
  const lapLength = 6000;
  const first = motion.planMarkerMotion(running(100), running(200), lapLength);
  const active = {
    input: { ...running(200), rank: 2 },
    plan: first,
    startedAt: 0,
  };

  const retargeted = motion.retargetMarkerMotion(
    active,
    { ...running(280), rank: 1 },
    lapLength,
    380,
  );

  assert.equal(retargeted.mode, "smooth");
});

test("un changement de statut normal n’entraîne pas de recadrage", () => {
  const lapLength = 6000;
  const retargeted = motion.planMarkerMotion(
    { ...running(200), status: "running" },
    { ...running(280), status: "finishing" },
    lapLength,
  );

  assert.equal(retargeted.mode, "smooth");
});
