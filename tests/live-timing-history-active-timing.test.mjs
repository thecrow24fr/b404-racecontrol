import test from "node:test";
import assert from "node:assert/strict";

const { collectLiveTiming } = await import("../server/live-timing-api.mjs");

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

function primaryVehicle(bestLapTime) {
  return {
    slotID: 2,
    driverName: "Bartholomeus Jeroen",
    vehicleName: "GT3 test",
    carClass: "GT3",
    position: 5,
    qualification: 5,
    lapsCompleted: 4,
    bestLapTime,
    lastLapTime: -1,
    lastSectorTime1: 25,
    lastSectorTime2: 67,
    timeBehindLeader: 0,
    timeBehindNext: 0,
    lapsBehindLeader: 0,
    lapsBehindNext: 0,
    pitstops: 1,
    penalties: 0,
    pitting: true,
    pitState: "STOPPED",
    finishStatus: "FSTAT_NONE",
  };
}

function lap(totalLaps, lapTime, sectorTime1, sectorTime2) {
  return { slotID: 2, driverName: "Bartholomeus Jeroen", vehicleName: "GT3 test", carClass: "GT3", totalLaps, lapTime, sectorTime1, sectorTime2 };
}

async function collect(primary, series) {
  const fetchImpl = async (url) => {
    if (url.endsWith("/rest/watch/sessionInfo")) return response(200, { session: "PRACTICE1", trackName: "Test", maximumLaps: 99 });
    if (url.endsWith("/rest/race/selection")) return response(200, { track: { name: "Test" } });
    if (url.endsWith("/rest/watch/standings")) return response(200, [primary]);
    if (url.endsWith("/rest/watch/standings/history")) return response(200, { 2: series });
    throw new Error(`unexpected URL: ${url}`);
  };
  return collectLiveTiming("preview", { registry, fetchImpl, disableManagerContext: true, weatherClientProbe: async () => false });
}

test("history enrichit le dernier tour complet actif sans confondre un meilleur tour antérieur", async () => {
  const result = await collect(primaryVehicle(100), [
    lap(1, 100, 25, 65),
    lap(2, 102, 26, 67),
    lap(3, -1, 27, 68),
  ]);
  const [entry] = result.data.standings;

  assert.equal(entry.bestLap, "1:40.000");
  assert.equal(entry.lastLap, "1:42.000");
  assert.equal(entry.sector1, "0:26.000");
  assert.equal(entry.sector2, "0:41.000");
  assert.equal(entry.sector3, "0:35.000");
});

test("history utilise les secteurs du meilleur tour lorsqu’il est le dernier tour complet", async () => {
  const result = await collect(primaryVehicle(99), [
    lap(1, 101, 25, 66),
    lap(2, 99, 24, 64),
    lap(3, -1, -1, -1),
  ]);
  const [entry] = result.data.standings;

  assert.equal(entry.bestLap, "1:39.000");
  assert.equal(entry.lastLap, "1:39.000");
  assert.equal(entry.sector1, "0:24.000");
  assert.equal(entry.sector2, "0:40.000");
  assert.equal(entry.sector3, "0:35.000");
});

test("le flux SSE conserve l’enrichissement history du roster actif", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../server/live-timing-api.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /collect:\s*\(sourceId\)\s*=>\s*collect\(sourceId,\s*\{\s*includeHistory:\s*false\s*}\s*\)/);
});
