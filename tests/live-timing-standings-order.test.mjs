import test from "node:test";
import assert from "node:assert/strict";
import { bestLapEntry } from "../app/_services/live-timing-best-lap.mjs";
import { orderStandingsForPhase } from "../app/_services/live-timing-standings-order.mjs";

test("les essais libres sont triés par meilleur tour valide, y compris les deux NEO distincts", () => {
  const standings = [
    { participantId: "leader", position: 1, driverName: "Leader", car: "GT3 Leader", bestLap: "1:49.200" },
    { participantId: "neo-b", position: 3, driverName: "NEO", car: "BMW M6 GT3 #23", bestLap: "1:48.600" },
    { participantId: "none", position: 2, driverName: "Sans temps", car: "Audi R8", bestLap: "—" },
    { participantId: "neo-a", position: 5, driverName: "NEO", car: "Radical RXC Turbo GT3 #26", bestLap: "1:47.900" },
  ];

  const ordered = orderStandingsForPhase(standings, "practice");

  assert.deepEqual(ordered.map((entry) => entry.participantId), ["neo-a", "neo-b", "leader", "none"]);
  assert.equal(bestLapEntry(ordered)?.entry.participantId, "neo-a");
  assert.deepEqual(standings.map((entry) => entry.participantId), ["leader", "neo-b", "none", "neo-a"]);
});

test("la course conserve les positions officielles et l’étoile peut rester hors P1", () => {
  const standings = [
    { participantId: "fastest", position: 3, driverName: "Pilote rapide", car: "GT3 Rapide", bestLap: "1:45.900" },
    { participantId: "neo-b", position: 2, driverName: "NEO", car: "BMW M6 GT3 #23", bestLap: "1:46.200" },
    { participantId: "leader", position: 1, driverName: "Leader", car: "GT3 Leader", bestLap: "1:47.000" },
    { participantId: "neo-a", position: 4, driverName: "NEO", car: "Radical RXC Turbo GT3 #26", bestLap: "—" },
  ];

  const ordered = orderStandingsForPhase(standings, "race");

  assert.deepEqual(ordered.map((entry) => entry.position), [1, 2, 3, 4]);
  assert.equal(bestLapEntry(ordered)?.entry.participantId, "fastest");
  assert.equal(bestLapEntry(ordered)?.entry.position, 3);
});
