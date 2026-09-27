import test from "node:test";
import assert from "node:assert/strict";

const { collectLiveTiming, createPublicLiveTimingHandler } = await import(
  "../server/live-timing-api.mjs"
);

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Map([["content-type", "application/json"]]),
    async json() {
      return body;
    },
  };
}

function fakeFetch(routes) {
  return async (url) => {
    const route = routes[url];
    if (!route) throw new Error(`unexpected URL: ${url}`);
    return response(route.status ?? 200, route.body);
  };
}

const sessionInfo = {
  trackName: "Paul Ricard  HTTT",
  serverName: "!B404",
  session: "PRACTICE1",
  currentEventTime: 2968.6,
  endEventTime: 4830,
  maximumLaps: 2147483647,
  numberOfVehicles: 1,
  gamePhase: 1,
  yellowFlagState: "NONE",
  sectorFlag: ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
  playerName: "must-not-leak",
  playerFileName: "Serveur 1",
  ambientTemp: 21.85,
  trackTemp: 45.66,
  raining: 0,
  darkCloud: 0,
  averagePathWetness: 0,
  minPathWetness: 0,
  maxPathWetness: 0,
  windSpeed: { velocity: 1 },
  gameMode: "SERVER_AND_CLIENT",
  passwordProtected: true,
  serverPort: 33297,
  maxPlayers: 66,
};

const standing = {
  slotID: 40,
  driverName: "Pilote Public",
  vehicleName: "GT3 publique",
  fullTeamName: "Équipe publique",
  carNumber: "7",
  carClass: "GT3",
  position: 1,
  qualification: 1,
  lapsCompleted: 3,
  bestLapTime: 125.123,
  bestSectorTime1: 40.1,
  bestSectorTime2: 42.2,
  lastLapTime: 126.456,
  timeBehindLeader: 0,
  lapsBehindLeader: 0,
  timeBehindNext: 0,
  lapsBehindNext: 0,
  pitstops: 1,
  penalties: 0,
  pitting: false,
  pitState: "NONE",
  finishStatus: "FSTAT_NONE",
  fuelFraction: 0.5,
  drsActive: false,
  steamID: 90071996842377246,
  carId: "technical-id",
  carPosition: { x: 1, y: 2, z: 3 },
};

const history = {
  "40": [
    {
      slotID: 40,
      driverName: "Pilote Public",
      vehicleName: "GT3 publique",
      session: "PRACTICE1",
      lapTime: 125.123,
      totalLaps: 3,
    },
    {
      slotID: 40,
      driverName: "Pilote Public",
      vehicleName: "GT3 publique",
      session: "PRACTICE1",
      lapTime: 124.987,
      totalLaps: 4,
    },
  ],
};

const registry = {
  s1_vm: { sourceId: "s1_vm", baseUrl: "http://127.0.0.1:5414" },
};

function routes({ standings = [standing], historyBody = history } = {}) {
  return {
    "http://127.0.0.1:5414/rest/watch/sessionInfo": {
      body: sessionInfo,
    },
    "http://127.0.0.1:5414/rest/watch/standings": {
      body: standings,
    },
    "http://127.0.0.1:5414/rest/watch/standings/history": {
      body: historyBody,
    },
  };
}

test("collecte s1_vm et retourne un DTO public filtré avec Records", async () => {
  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(routes()),
    now: () => "2026-09-07T12:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.sourceId, "s1_vm");
  assert.equal(result.data.server.circuit, "Paul Ricard  HTTT");
  assert.equal(result.data.server.currentSession, "Essais libres 1");
  assert.equal(result.data.server.timeRemaining, "31:01");
  assert.equal(result.data.server.totalSessionTime, "80:30");
  assert.equal(result.data.session.sessionTimeRemaining, "31:01.4");
  assert.equal(result.data.session.elapsedTime, "31:01.4");
  assert.equal(result.data.session.serverTime, "49:28.6");
  assert.equal(result.data.standings.length, 1);
  assert.equal(result.data.standings[0].driverName, "Pilote Public");
  assert.equal(result.data.standings[0].bestLap, "2:05.123");
  assert.equal(result.data.standings[0].pitStops, 1);
  assert.equal(result.data.records.available, true);
  assert.equal(result.data.records.entries[0].bestLap, "2:04.987");
  assert.equal(result.data.tyres.available, false);

  const serialized = JSON.stringify(result.data);
  assert.doesNotMatch(serialized, /steamID|serverPort|carId|carPosition|playerName|playerFileName/);
});

test("un classement HTTP 500 bloque la réponse publique sans devenir un tableau vide", async () => {
  const badRoutes = routes();
  badRoutes["http://127.0.0.1:5414/rest/watch/standings"] = {
    status: 500,
    body: { internal: "must-not-leak" },
  };

  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(badRoutes),
  });

  assert.deepEqual(result, {
    ok: false,
    sourceId: "s1_vm",
    status: "error",
    error: "standings_unavailable",
  });
});

test("un identifiant de source inconnu est refusé sans URL arbitraire", async () => {
  await assert.rejects(
    collectLiveTiming("arbitrary", {
      registry,
      fetchImpl: fakeFetch(routes()),
    }),
    /unknown_source/,
  );
});

test("les pneus restent indisponibles sans bloc explicite fourni par l’API", async () => {
  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(routes({ standings: [{ ...standing, tyreWear: 0.42 }] })),
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.tyres.available, false);
  assert.match(result.data.tyres.message, /non disponible/i);
});

test("la route publique n’accepte que GET et le source_id allowlisté", async () => {
  const handler = createPublicLiveTimingHandler({
    registry,
    fetchImpl: fakeFetch(routes({ standings: [] })),
  });
  const calls = [];
  const makeResponse = () => ({
    statusCode: 0,
    headers: {},
    body: "",
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = "") {
      this.body = body;
    },
  });

  const okRes = makeResponse();
  await handler({ method: "GET", url: "/api/public/live-timing/s1_vm" }, okRes);
  calls.push(JSON.parse(okRes.body));
  assert.equal(okRes.statusCode, 200);
  assert.equal(calls[0].success, true);
  assert.equal(calls[0].data.sourceId, "s1_vm");

  const badRes = makeResponse();
  await handler({ method: "POST", url: "/api/public/live-timing/s1_vm" }, badRes);
  assert.equal(badRes.statusCode, 405);

  const unknownRes = makeResponse();
  await handler({ method: "GET", url: "/api/public/live-timing/unknown" }, unknownRes);
  assert.equal(unknownRes.statusCode, 404);
});
