import test from "node:test";
import assert from "node:assert/strict";
import { qualificationEvolution } from "../app/_services/live-timing-qualification-evolution.mjs";

test("qualificationEvolution exprime gain, perte, égalité et référence indisponible", () => {
  assert.deepEqual(qualificationEvolution({ sessionPhase: "race", startingPosition: 7, currentPosition: 2 }), {
    kind: "gain",
    label: "+5",
    delta: 5,
  });
  assert.deepEqual(qualificationEvolution({ sessionPhase: "race", startingPosition: 2, currentPosition: 5 }), {
    kind: "loss",
    label: "-3",
    delta: -3,
  });
  assert.deepEqual(qualificationEvolution({ sessionPhase: "race", startingPosition: 4, currentPosition: 4 }), {
    kind: "neutral",
    label: "0",
    delta: 0,
  });
  assert.deepEqual(qualificationEvolution({ sessionPhase: "race", startingPosition: null, currentPosition: 3 }), {
    kind: "unavailable",
    label: "—",
    delta: null,
  });
});

test("qualificationEvolution ne publie aucune évolution hors course", () => {
  assert.deepEqual(qualificationEvolution({ sessionPhase: "practice", startingPosition: 5, currentPosition: 1 }), {
    kind: "unavailable",
    label: "—",
    delta: null,
  });
  assert.deepEqual(qualificationEvolution({ sessionPhase: "qualifying", startingPosition: 5, currentPosition: 1 }), {
    kind: "unavailable",
    label: "—",
    delta: null,
  });
});
