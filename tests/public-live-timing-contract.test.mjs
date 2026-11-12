import assert from "node:assert/strict";
import test from "node:test";
import {
  assertViewerSafeSnapshot,
  isPublicLiveTimingSourceId,
} from "../app/_services/public-live-timing-contract.mjs";

const validSnapshot = {
  success: true,
  data: {
    sourceId: "s20_vm",
    fetchedAt: "2026-11-11T16:00:00.000Z",
    server: { status: "online" },
    session: { phase: "Race" },
    standings: [{ participantId: "p1234567", position: 1, pitStops: 0 }],
  },
};

test("le contrat Viewer autorise uniquement la source S20 publique", () => {
  assert.equal(isPublicLiveTimingSourceId("s20_vm"), true);
  assert.equal(isPublicLiveTimingSourceId("s1_vm"), false);
  assert.equal(isPublicLiveTimingSourceId("s8_vm"), false);
  assert.equal(isPublicLiveTimingSourceId("s21_vm"), false);
});

test("le contrat Viewer accepte un snapshot S20 expurgé", () => {
  assert.equal(assertViewerSafeSnapshot(validSnapshot), validSnapshot.data);
});

test("le contrat Viewer rejette toute durée d’arrêt réservée au streamer", () => {
  const unsafe = structuredClone(validSnapshot);
  unsafe.data.standings[0].pitStopDurationSeconds = 0;
  assert.throws(
    () => assertViewerSafeSnapshot(unsafe),
    /champ privé.*pitStopDurationSeconds/i,
  );
});

test("le contrat Viewer refuse un payload provenant d’une autre source", () => {
  const wrongSource = structuredClone(validSnapshot);
  wrongSource.data.sourceId = "s1_vm";
  assert.throws(() => assertViewerSafeSnapshot(wrongSource), /source publique/i);
});
