import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { collectLiveTiming, LiveTimingStreamHub } = await import("../server/live-timing-api.mjs");

const registry = {
  preview: { sourceId: "preview", serverNumber: 20, baseUrl: "http://rf2.test" },
};

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Map([["content-type", "application/json"]]),
    async json() { return body; },
  };
}

function nativeVehicle({ slotID, driverName, player, position, fuelFraction, vehicleName = "GT3 test", carClass = "GT3" }) {
  return {
    slotID,
    driverName,
    player,
    vehicleName,
    carClass,
    position,
    qualification: position,
    lapsCompleted: 2,
    bestLapTime: 120,
    lastLapTime: 121,
    timeBehindLeader: 0,
    timeBehindNext: 0,
    lapsBehindLeader: 0,
    lapsBehindNext: 0,
    pitstops: 0,
    penalties: 0,
    pitting: false,
    pitState: "NONE",
    finishStatus: "FSTAT_NONE",
    ...(fuelFraction === undefined ? {} : { fuelFraction }),
  };
}

function sharedMemoryVehicle({ slotID, driverName, fuelLiters, fuelCapacityLiters, player = false, vehicleName = "GT3 test", carClass = "GT3", control }) {
  return {
    slotID,
    driverName,
    vehicleName,
    carClass,
    player,
    ...(control === undefined ? {} : { control }),
    fuelLiters,
    fuelCapacityLiters,
    frontTyreCompound: "Medium",
    rearTyreCompound: "Soft",
    // rFactor 2 native wheel order: FL, FR, RL, RR. Values are native fractions.
    wheelWearFractions: [0.856, 0.877, 0.871, 0.884],
  };
}

async function collectNativeVehicles({ sharedMemoryReader } = {}) {
  const vehicles = [
    nativeVehicle({ slotID: 41, driverName: "IA native", player: false, position: 1, fuelFraction: 0 }),
    nativeVehicle({ slotID: 42, driverName: "Humain natif", player: true, position: 2, fuelFraction: 0 }),
    nativeVehicle({ slotID: 43, driverName: "Mesure absente", player: false, position: 3, fuelFraction: 0 }),
    nativeVehicle({ slotID: 44, driverName: "Identité discordante", player: false, position: 4, fuelFraction: 0 }),
  ];
  const fetchImpl = async (url) => {
    if (url.endsWith("/rest/watch/sessionInfo")) return response(200, { session: "PRACTICE1", trackName: "Test", maximumLaps: 99 });
    if (url.endsWith("/rest/race/selection")) return response(200, { track: { name: "Test" } });
    if (url.endsWith("/rest/watch/standings")) return response(200, vehicles);
    throw new Error(`unexpected URL: ${url}`);
  };
  return collectLiveTiming("preview", {
    registry,
    fetchImpl,
    includeHistory: false,
    disableManagerContext: true,
    weatherClientProbe: async () => false,
    sharedMemoryReader,
  });
}

function telemetry(entry) {
  return {
    participantId: entry.participantId,
    driverType: entry.driverType,
    fuelLiters: entry.fuelLiters,
    fuelCapacityLiters: entry.fuelCapacityLiters,
    fuelFraction: entry.fuelFraction,
    frontTyreCompound: entry.frontTyreCompound,
    rearTyreCompound: entry.rearTyreCompound,
    wearFrontLeft: entry.wearFrontLeft,
    wearFrontRight: entry.wearFrontRight,
    wearRearLeft: entry.wearRearLeft,
    wearRearRight: entry.wearRearRight,
  };
}

const directSharedMemory = async () => ({
  stable: true,
  vehicles: [
    sharedMemoryVehicle({ slotID: 41, driverName: "IA native", fuelLiters: 50, fuelCapacityLiters: 100, control: 1 }),
    sharedMemoryVehicle({ slotID: 42, driverName: "Humain natif", player: true, fuelLiters: 25, fuelCapacityLiters: 50, control: 2 }),
    // Same slot but independent identity mismatch: must never be attributed.
    sharedMemoryVehicle({ slotID: 44, driverName: "Autre pilote", fuelLiters: 10, fuelCapacityLiters: 40 }),
  ],
});

test("la Shared Memory native raccorde IA/humain au roster standings par slot, pilote, voiture et classe", async () => {
  const result = await collectNativeVehicles({ sharedMemoryReader: directSharedMemory });
  const byDriver = new Map(result.data.standings.map((entry) => [entry.driverName, telemetry(entry)]));

  const ai = byDriver.get("IA native");
  const human = byDriver.get("Humain natif");
  const absent = byDriver.get("Mesure absente");
  const mismatch = byDriver.get("Identité discordante");
  assert.ok(ai && human && absent && mismatch);
  assert.notEqual(ai.participantId, human.participantId);
  assert.equal(ai.driverType, "ai");
  assert.equal(human.driverType, "human");
  assert.equal(ai.fuelLiters, 50);
  assert.equal(ai.fuelCapacityLiters, 100);
  assert.equal(ai.fuelFraction, 0.5);
  assert.equal(human.fuelLiters, 25);
  assert.equal(human.fuelCapacityLiters, 50);
  assert.equal(human.fuelFraction, 0.5);
  for (const entry of [ai, human]) {
    assert.equal(entry.frontTyreCompound, "Medium");
    assert.equal(entry.rearTyreCompound, "Soft");
    assert.equal(entry.wearFrontLeft, 85.6);
    assert.equal(entry.wearFrontRight, 87.7);
    assert.equal(entry.wearRearLeft, 87.1);
    assert.equal(entry.wearRearRight, 88.4);
  }
  for (const entry of [absent, mismatch]) {
    assert.equal(entry.fuelLiters, null);
    assert.equal(entry.fuelCapacityLiters, null);
    assert.equal(entry.fuelFraction, null, "le fuelFraction Watch contradictoire ne sert jamais de repli");
    assert.equal(entry.frontTyreCompound, null);
    assert.equal(entry.rearTyreCompound, null);
    assert.equal(entry.wearFrontLeft, null);
    assert.equal(entry.wearFrontRight, null);
    assert.equal(entry.wearRearLeft, null);
    assert.equal(entry.wearRearRight, null);
  }
});

test("une trame Shared Memory instable ne publie aucune mesure véhicule", async () => {
  const result = await collectNativeVehicles({
    sharedMemoryReader: async () => ({ stable: false, vehicles: [sharedMemoryVehicle({ slotID: 41, driverName: "IA native", fuelLiters: 50, fuelCapacityLiters: 100 })] }),
  });
  for (const entry of result.data.standings) {
    assert.equal(entry.fuelFraction, null);
    assert.equal(entry.frontTyreCompound, null);
    assert.equal(entry.wearFrontLeft, null);
  }
});

test("le SSE publie les mêmes mesures Shared Memory par participant", async () => {
  const result = await collectNativeVehicles({ sharedMemoryReader: directSharedMemory });
  const writes = [];
  const hub = new LiveTimingStreamHub({ registry, intervalMs: 60_000, collect: async () => result });
  const unsubscribe = hub.subscribe("preview", { write: (value) => writes.push(String(value)) });
  await new Promise((resolve) => setTimeout(resolve, 20));
  unsubscribe();

  const snapshot = writes.find((value) => value.includes("event: snapshot"));
  assert.ok(snapshot, "un snapshot SSE doit être publié");
  const payload = JSON.parse(snapshot.match(/^data: (.+)$/m)?.[1] ?? "null");
  const ai = payload.data.standings.find((entry) => entry.driverName === "IA native");
  assert.equal(ai.fuelLiters, 50);
  assert.equal(ai.fuelCapacityLiters, 100);
  assert.equal(ai.fuelFraction, 0.5);
  assert.equal(ai.wearRearRight, 88.4);
});

test("le rendu sépare pneus, usure et carburant litres/pourcentage issus de la même fraction", async () => {
  const [types, row] = await Promise.all([
    readFile(new URL("../app/_types/live-timing.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/_components/live-timing-standing-row.tsx", import.meta.url), "utf8"),
  ]);
  for (const field of ["fuelLiters", "fuelCapacityLiters", "frontTyreCompound", "rearTyreCompound", "wearFrontLeft", "wearFrontRight", "wearRearLeft", "wearRearRight"]) {
    assert.match(types, new RegExp(`${field}\\??:\\s*(?:string|number)\\s*\\|\\s*null`));
  }
  for (const field of ["fuelLiters", "frontTyreCompound", "rearTyreCompound", "wearFrontLeft", "wearFrontRight", "wearRearLeft", "wearRearRight"]) {
    assert.match(row, new RegExp(`entry\\.${field}`));
  }
  assert.match(row, /formatFuel\(fuelFraction\)/);
  assert.match(row, /width: `\$\{percentage\}%`/);
  assert.match(row, /fuelLiters/);
});
