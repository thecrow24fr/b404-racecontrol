import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { observeLastLapDeltas, withObservedLapDeltas } from "../legacy/live-timing-49349/app/_services/live-timing-observed-lap-delta.mjs";

const hookSource = readFileSync(new URL("../legacy/live-timing-49349/app/_services/use-live-timing.ts", import.meta.url), "utf8");
const row = (lastLap, laps, participantId = "p1234567") => ({ participantId, lastLap, laps });

test("compare deux tours terminés observés et conserve le delta jusqu'au tour suivant", () => {
  const initial = observeLastLapDeltas(null, [row("1:40.000", 2)], "s20_vm", "session-1");
  assert.equal(initial.deltas.get("p1234567"), null);
  const improved = observeLastLapDeltas(initial.state, [row("1:39.500", 3)], "s20_vm", "session-1");
  assert.equal(improved.deltas.get("p1234567"), -0.5);
  const unchanged = observeLastLapDeltas(improved.state, [row("1:39.500", 3)], "s20_vm", "session-1");
  assert.equal(unchanged.deltas.get("p1234567"), -0.5);
});

test("ne compare pas des tours entre deux sessions", () => {
  const previous = observeLastLapDeltas(null, [row("1:40.000", 2)], "s20_vm", "session-1");
  const current = observeLastLapDeltas(previous.state, [row("1:39.500", 1)], "s20_vm", "session-2");
  assert.equal(current.deltas.get("p1234567"), null);
});

test("un participant sans identifiant stable ne reçoit pas de delta calculé", () => {
  const previous = observeLastLapDeltas(null, [{ lastLap: "1:40.000", laps: 2 }], "s20_vm", "session-1");
  const current = observeLastLapDeltas(previous.state, [{ lastLap: "1:39.500", laps: 3 }], "s20_vm", "session-1");
  assert.equal(current.deltas.size, 0);
});

test("un tour identique donne zéro et un tour plus lent un delta positif", () => {
  const previous = observeLastLapDeltas(null, [row("1:39.500", 3)], "s20_vm", "session-1");
  const equal = observeLastLapDeltas(previous.state, [row("1:39.500", 4)], "s20_vm", "session-1");
  assert.equal(equal.deltas.get("p1234567"), 0);
  const slower = observeLastLapDeltas(equal.state, [row("1:40.200", 5)], "s20_vm", "session-1");
  assert.equal(slower.deltas.get("p1234567"), 0.7);
});

test("le delta observé complète un champ absent sans remplacer un delta natif valide", () => {
  const enriched = withObservedLapDeltas(
    [row("1:39.500", 3), { ...row("1:40.000", 3, "p7654321"), lastLapDeltaSeconds: 0.2 }],
    new Map([["p1234567", -0.5], ["p7654321", -0.4]]),
  );
  assert.equal(enriched[0].lastLapDeltaSeconds, -0.5);
  assert.equal(enriched[1].lastLapDeltaSeconds, 0.2);
});

test("le flux Live Timing enrichit chaque snapshot disponible avec les deltas observés", () => {
  assert.match(hookSource, /observeLastLapDeltas\(/);
  assert.match(hookSource, /withObservedLapDeltas\(normalizedData\.standings, observation\.deltas\)/);
});
