import test from "node:test";
import assert from "node:assert/strict";
import { bestLapEntry } from "../app/_services/live-timing-best-lap.mjs";

test("bestLapEntry garde le temps et le pilote de la même ligne, même hors position 1", () => {
  const leader = { participantId: "leader", position: 1, driverName: "Leader", bestLap: "2:02.000" };
  const fastest = { participantId: "fastest", position: 2, driverName: "Rapide", bestLap: "1:59.500" };
  const unavailable = { participantId: "none", position: 3, driverName: "Sans temps", bestLap: "—" };

  const result = bestLapEntry([leader, fastest, unavailable]);

  assert.equal(result?.entry.participantId, "fastest");
  assert.equal(result?.entry.position, 2);
  assert.equal(result?.entry.driverName, "Rapide");
  assert.equal(result?.entry.bestLap, "1:59.500");
});

test("bestLapEntry retourne null sans temps de tour valide", () => {
  assert.equal(bestLapEntry([{ bestLap: "—" }, { bestLap: "invalide" }]), null);
});
