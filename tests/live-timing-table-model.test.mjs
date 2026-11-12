import assert from "node:assert/strict";
import test from "node:test";
import {
  bestLapDriver,
  raceProgress,
  carNumberStatusBadge,
  positionDelta,
} from "../app/_services/live-timing-table-model.mjs";

test("le meilleur tour est le temps valide numériquement le plus petit, pas la P1", () => {
  const standings = [
    { position: 1, driverName: "Leader", bestLap: "1:42.100" },
    { position: 2, driverName: "Rapide", bestLap: "1:39.900" },
    { position: 3, driverName: "Sans temps", bestLap: "—" },
  ];
  assert.equal(bestLapDriver(standings)?.driverName, "Rapide");
});

test("les tours invalides ne deviennent pas un meilleur tour", () => {
  assert.equal(bestLapDriver([{ position: 1, driverName: "A", bestLap: "—" }]), null);
});

test("le delta de position distingue gain, perte et absence de référence", () => {
  assert.deepEqual(positionDelta(5, 2), { direction: "gain", amount: 3 });
  assert.deepEqual(positionDelta(2, 5), { direction: "loss", amount: 3 });
  assert.deepEqual(positionDelta(0, 5), { direction: "none", amount: 0 });
});

test("une course configurée en tours affiche la progression au lieu du faux zéro temps", () => {
  assert.deepEqual(raceProgress({ currentSession: "Course", lapsCompleted: 5, totalLaps: 25, timeRemaining: "00:00:00" }), {
    mode: "laps",
    label: "5 / 25 tours",
    remaining: "20 tours restantes",
  });
});

test("une qualification reste au temps même si le flux fournit un nombre maximal de tours", () => {
  assert.deepEqual(raceProgress({ currentSession: "Qualifications 1", lapsCompleted: 0, totalLaps: 3, timeRemaining: "00:09:35" }), {
    mode: "time",
    label: "00:09:35 restant",
    remaining: null,
  });
});

test("une course au temps affiche le compte à rebours sans limite de tours", () => {
  assert.deepEqual(raceProgress({ lapsCompleted: 5, totalLaps: 0, timeRemaining: "00:08:31" }), {
    mode: "time",
    label: "00:08:31 restant",
    remaining: null,
  });
});

test("la progression reste indisponible si aucune limite fiable n'est fournie", () => {
  assert.deepEqual(raceProgress({ lapsCompleted: null, totalLaps: null, timeRemaining: "00:00:00" }), {
    mode: "unknown",
    label: "Progression indisponible",
    remaining: null,
  });
});

test("le badge près du numéro signale DNF sans requalifier les autres statuts", () => {
  assert.equal(carNumberStatusBadge("dnf"), "DNF");
  assert.equal(carNumberStatusBadge("out"), null);
  assert.equal(carNumberStatusBadge("running"), null);
});
