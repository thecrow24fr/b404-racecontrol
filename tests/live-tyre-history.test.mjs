import test from "node:test";
import assert from "node:assert/strict";

const { createTyreHistoryStore } = await import("../server/live-tyre-history.mjs");

const measure = (overrides = {}) => ({
  participantId: "p1", driverName: "Pilote", lap: 4, sessionSeconds: 120,
  frontTyreCompound: "Medium", rearTyreCompound: "Medium",
  wearFrontLeft: 90, wearFrontRight: 91, wearRearLeft: 92, wearRearRight: 93,
  inPit: false, ...overrides,
});

test("conserve le relevé post-arrêt du même tour avec tour, temps et quatre roues", () => {
  const store = createTyreHistoryStore();
  store.record("practice:alpha", measure());
  store.record("practice:alpha", measure({ sessionSeconds: 125, inPit: true, frontTyreCompound: "Soft", rearTyreCompound: "Soft", wearFrontLeft: 100, wearFrontRight: 100, wearRearLeft: 100, wearRearRight: 100 }));
  const [row] = store.history("practice:alpha", "p1");
  assert.deepEqual([row.lap, row.sessionSeconds, row.wearFrontLeft, row.wearFrontRight, row.wearRearLeft, row.wearRearRight, row.frontTyreCompound, row.relay, row.pitOrTyreChange], [4, 125, 100, 100, 100, 100, "Soft", 2, true]);
});

test("ouvre un relais si les pneus sont remis à niveau même à composé identique", () => {
  const store = createTyreHistoryStore();
  store.record("race:alpha", measure({ lap: 5, sessionSeconds: 200, wearFrontLeft: 70, wearFrontRight: 71, wearRearLeft: 72, wearRearRight: 73 }));
  store.record("race:alpha", measure({ lap: 6, sessionSeconds: 300, wearFrontLeft: 99, wearFrontRight: 99, wearRearLeft: 99, wearRearRight: 99 }));
  const history = store.history("race:alpha", "p1");
  assert.deepEqual(history.map(({ lap, relay, pitOrTyreChange }) => [lap, relay, pitOrTyreChange]), [[5, 1, false], [6, 2, true]]);
});

test("ne démarre pas de relais sur un simple arrêt sans changement de train observé", () => {
  const store = createTyreHistoryStore();
  store.record("race:pit", measure({ lap: 5, sessionSeconds: 200 }));
  store.record("race:pit", measure({ lap: 6, sessionSeconds: 300, inPit: true, wearFrontLeft: 89, wearFrontRight: 90, wearRearLeft: 91, wearRearRight: 92 }));
  const history = store.history("race:pit", "p1");
  assert.deepEqual(history.map(({ lap, relay, pitOrTyreChange }) => [lap, relay, pitOrTyreChange]), [[5, 1, false], [6, 1, false]]);
});

test("isole strictement participant et session et refuse une mesure incomplète", () => {
  const store = createTyreHistoryStore();
  store.record("race:A", measure({ participantId: "p1", lap: 1 }));
  store.record("race:B", measure({ participantId: "p1", lap: 2 }));
  store.record("race:A", measure({ participantId: "p2", lap: 3 }));
  store.record("race:A", measure({ participantId: "bad", lap: 4, wearFrontLeft: null }));
  assert.equal(store.history("race:A", "p1").length, 1);
  assert.equal(store.history("race:B", "p1").length, 1);
  assert.equal(store.history("race:A", "p2").length, 1);
  assert.equal(store.history("race:A", "bad").length, 0);
});
