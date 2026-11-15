import test from "node:test";
import assert from "node:assert/strict";
import { emptyStandingsPresentation } from "../legacy/live-timing-49349/app/_services/live-timing-empty-state.mjs";

test("un serveur en ligne sans classement affiche une attente neutre", () => {
  assert.deepEqual(emptyStandingsPresentation("online"), {
    mode: "waiting",
    title: "En attente du classement",
    description: "Le serveur est en ligne; le classement apparaîtra dès que des participants rejoindront la session.",
  });
});

test("une vraie erreur conserve un état sans classement non ambigu", () => {
  assert.deepEqual(emptyStandingsPresentation("degraded"), {
    mode: "unavailable",
    title: "Aucune donnée de classement disponible",
    description: "Le classement apparaîtra automatiquement lorsque la session sera active.",
  });
});
