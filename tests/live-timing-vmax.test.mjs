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

function vehicle({ slotID, driverName, player, position, speedMs }) {
  return {
    slotID,
    driverName,
    player,
    vehicleName: "GT3 test",
    carClass: "GT3",
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
    ...(speedMs === undefined ? {} : { carVelocity: { velocity: speedMs } }),
  };
}

test("Vmax conserve le maximum natif par slot pour IA et humain, ignore l'absence et se réinitialise par session", async () => {
  const sessions = ["PRACTICE1", "PRACTICE1", "PRACTICE2"];
  const snapshots = [
    [
      vehicle({ slotID: 11, driverName: "IA", player: false, position: 1, speedMs: 50 }),
      vehicle({ slotID: 12, driverName: "Humain", player: true, position: 2, speedMs: 45 }),
      vehicle({ slotID: 13, driverName: "Sans mesure", player: false, position: 3 }),
    ],
    [
      vehicle({ slotID: 11, driverName: "IA", player: false, position: 2, speedMs: 55 }),
      vehicle({ slotID: 12, driverName: "Humain", player: true, position: 1, speedMs: 42 }),
      vehicle({ slotID: 13, driverName: "Sans mesure", player: false, position: 3 }),
    ],
    [
      vehicle({ slotID: 11, driverName: "IA", player: false, position: 1, speedMs: 30 }),
      vehicle({ slotID: 12, driverName: "Humain", player: true, position: 2, speedMs: 44 }),
      vehicle({ slotID: 13, driverName: "Sans mesure", player: false, position: 3 }),
    ],
  ];
  let call = 0;
  const fetchImpl = async (url) => {
    const index = Math.min(call, snapshots.length - 1);
    if (url.endsWith("/rest/watch/sessionInfo")) {
      return response(200, { session: sessions[index], trackName: "Test", maximumLaps: 99 });
    }
    if (url.endsWith("/rest/race/selection")) return response(200, { track: { name: "Test" } });
    if (url.endsWith("/rest/watch/standings")) return response(200, snapshots[call++]);
    throw new Error(`unexpected URL: ${url}`);
  };
  const options = {
    registry,
    fetchImpl,
    includeHistory: false,
    disableManagerContext: true,
    weatherClientProbe: async () => false,
    vmaxCache: new Map(),
  };

  const first = await collectLiveTiming("preview", options);
  const second = await collectLiveTiming("preview", options);
  const nextSession = await collectLiveTiming("preview", options);
  const byName = (result) => new Map(result.data.standings.map((entry) => [entry.driverName, entry]));

  assert.equal(byName(first).get("IA").maxSpeedKmh, 180);
  assert.equal(byName(first).get("Humain").maxSpeedKmh, 162);
  assert.equal(byName(first).get("Sans mesure").maxSpeedKmh, null);
  assert.equal(byName(second).get("IA").maxSpeedKmh, 198);
  assert.equal(byName(second).get("Humain").maxSpeedKmh, 162);
  assert.equal(byName(second).get("Sans mesure").maxSpeedKmh, null);
  assert.equal(byName(nextSession).get("IA").maxSpeedKmh, 108);
  assert.equal(byName(nextSession).get("Humain").maxSpeedKmh, 158.4);
});
