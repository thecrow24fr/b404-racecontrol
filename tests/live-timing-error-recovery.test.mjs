import test from "node:test";
import assert from "node:assert/strict";
import { preserveLastGoodSnapshot } from "../app/_services/live-timing-error-recovery.mjs";

const snapshot = {
  sourceId: "s20_vm",
  server: { status: "online", standingsSource: "standings" },
  standings: [{ participantId: "p1", tyreHistory: [{ lap: 1, wearFrontLeft: 98, wearFrontRight: 97, wearRearLeft: 96, wearRearRight: 95 }] }],
  session: { phase: "race" },
};

test("keeps the last good 3012 snapshot and tyre history while marking it degraded", () => {
  const recovered = preserveLastGoodSnapshot(snapshot, "s20_vm", true);
  assert.equal(recovered.server.status, "degraded");
  assert.equal(recovered.server.standingsSource, "standings");
  assert.equal(recovered.standings, snapshot.standings);
  assert.equal(recovered.standings[0].tyreHistory.length, 1);
  assert.equal(recovered.session, snapshot.session);
});

test("does not reuse empty data or a snapshot from another server", () => {
  assert.equal(preserveLastGoodSnapshot(snapshot, "s20_vm", false), null);
  assert.equal(preserveLastGoodSnapshot(snapshot, "s1_vm", true), null);
});
