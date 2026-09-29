import test from "node:test";
import assert from "node:assert/strict";

const {
  collectLiveTiming,
  createPublicLiveTimingHandler,
  formatRFactorDuration,
  LiveTimingStreamHub,
  parseWeatherClientTasklist,
} = await import(
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
  currentEventTime: 49.5,
  endEventTime: 80,
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
  s1_vm: { sourceId: "s1_vm", serverNumber: 1, baseUrl: "http://127.0.0.1:5414" },
};

const s20Registry = {
  s20_vm: {
    sourceId: "s20_vm",
    serverNumber: 20,
    baseUrl: "http://127.0.0.1:5354",
    managerDetailPath: "/api/view/servers/20",
    managerProfile: "Serveur 20",
  },
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

function s20Routes({ managerBody, sessionBody = sessionInfo } = {}) {
  return {
    "http://127.0.0.1:5354/rest/watch/sessionInfo": {
      body: sessionBody,
    },
    "http://127.0.0.1:5354/rest/race/selection": {
      body: { track: { name: sessionInfo.trackName } },
    },
    "http://127.0.0.1:5354/rest/watch/standings": {
      body: [standing],
    },
    "http://127.0.0.1:5354/rest/watch/standings/history": {
      body: history,
    },
    "http://127.0.0.1:4000/api/view/servers/20": {
      body: managerBody ?? {
        health: { pid: 12028, uptime_s: 3661.9 },
        card: { profile: "Serveur 20", status: "online" },
      },
    },
  };
}

function makeJsonResponse() {
  return {
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
  assert.equal(result.data.durationFormat, "rFactor2-seconds-v1");
  assert.equal(result.data.server.timeRemaining, "00:00:30");
  assert.equal(result.data.server.totalSessionTime, "00:01:20");
  assert.equal(result.data.session.sessionTimeRemaining, "00:00:30");
  assert.equal(result.data.session.elapsedTime, "00:00:30");
  assert.equal(result.data.session.serverTime, "00:00:49");
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

test("le DTO conserve uniquement les états jaunes explicitement confirmés", async () => {
  const sectorRoutes = routes({
    standings: [{ ...standing, underYellow: true }],
  });
  sectorRoutes["http://127.0.0.1:5414/rest/watch/sessionInfo"].body = {
    ...sessionInfo,
    sectorFlag: ["YELLOW", "UNKNOWN", "YELLOW"],
    yellowFlagState: "NONE",
  };

  const sectorResult = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(sectorRoutes),
    now: () => "2026-09-07T12:00:00.000Z",
  });

  assert.equal(sectorResult.ok, true);
  assert.deepEqual(sectorResult.data.session.flags, [
    { type: "yellow", sector: 1 },
    { type: "yellow", sector: 3 },
  ]);
  assert.equal(sectorResult.data.standings[0].underYellow, true);

  const globalRoutes = routes();
  globalRoutes["http://127.0.0.1:5414/rest/watch/sessionInfo"].body = {
    ...sessionInfo,
    sectorFlag: ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
    yellowFlagState: "PENDING",
  };
  const globalResult = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(globalRoutes),
    now: () => "2026-09-07T12:00:00.000Z",
  });

  assert.equal(globalResult.ok, true);
  assert.deepEqual(globalResult.data.session.flags, [{ type: "yellow", sector: 0 }]);
});

test("le DTO associe le gap numérique natif à la voiture suivante sans exposer slotID", async () => {
  const battleStandings = [
    {
      ...standing,
      slotID: 101,
      driverName: "Pilote Avant",
      carNumber: "1",
      position: 1,
      qualification: 1,
      lapsCompleted: 4,
      lapDistance: 1000,
      timeBehindNext: 0,
    },
    {
      ...standing,
      slotID: 102,
      driverName: "Pilote Suivant",
      carNumber: "2",
      position: 2,
      qualification: 2,
      lapsCompleted: 4,
      lapDistance: 980,
      timeBehindNext: 0.321,
    },
    {
      ...standing,
      slotID: 103,
      driverName: "Pilote Éloigné",
      carNumber: "3",
      position: 3,
      qualification: 3,
      lapsCompleted: 4,
      lapDistance: 800,
      timeBehindNext: 0.8,
    },
  ];
  const battleRoutes = routes({ standings: battleStandings });
  battleRoutes["http://127.0.0.1:5414/rest/watch/sessionInfo"].body = {
    ...sessionInfo,
    lapDistance: 5000,
  };

  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(battleRoutes),
    now: () => "2026-09-07T12:00:00.000Z",
  });
  const repeated = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(battleRoutes),
    now: () => "2026-09-07T12:00:00.500Z",
  });

  assert.equal(result.ok, true);
  const [front, next, distant] = result.data.standings;
  assert.match(front.participantId, /^p/);
  assert.equal(front.timeBehindNext, 0);
  assert.equal(front.nextParticipantId, null);
  assert.equal(next.timeBehindNext, 0.321);
  assert.equal(next.nextParticipantId, front.participantId);
  assert.equal(distant.timeBehindNext, 0.8);
  assert.equal(distant.nextParticipantId, next.participantId);
  assert.equal(repeated.data.standings[0].participantId, front.participantId);
  assert.equal(repeated.data.standings[1].nextParticipantId, front.participantId);
  assert.doesNotMatch(JSON.stringify(result.data), /slotID/);
});

test("le DTO s20_vm affiche l’uptime Manager sans utiliser le chrono de session", async () => {
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(s20Routes()),
    now: () => "2026-09-07T12:00:00.000Z",
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.session.serverUptime, "1h 1m 1s");
  assert.equal(result.data.session.serverTime, "00:00:49");
  assert.equal(result.data.session.sessionTimeRemaining, "00:00:30");
});

test("le DTO expose la longueur catalogue GDB sans remplacer la lapDistance runtime", async () => {
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(
      s20Routes({
        sessionBody: {
          ...sessionInfo,
          trackName: "Watkins Glen Boot",
          lapDistance: 5463.3037109375,
        },
        managerBody: {
          health: { pid: 12028, uptime_s: 3661.9 },
          card: {
            profile: "Serveur 20",
            circuit_length_km: 5.552,
            circuit_resolution: {
              length_km: 5.552,
              length_source: "GDB",
              status: "matched",
              candidate_count: 1,
              technical_id: "WATKINS_GLEN_BOOT",
            },
          },
        },
      }),
    ),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.server.lapDistance, 5463.3037109375);
  assert.equal(result.data.server.trackLength, 5552);
  assert.equal(result.data.server.trackLengthSource, "GDB");
  assert.equal(result.data.standings[0].lapProgress, null);
});

test("le DTO refuse une longueur catalogue ambiguë", async () => {
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(
      s20Routes({
        managerBody: {
          health: { pid: 12028, uptime_s: 3661.9 },
          card: {
            profile: "Serveur 20",
            circuit_length_km: 5.552,
            circuit_resolution: {
              length_km: 5.552,
              length_source: "GDB",
              status: "ambiguous",
              candidate_count: 4,
            },
          },
        },
      }),
    ),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.server.trackLength, null);
  assert.equal(result.data.server.trackLengthSource, null);
});

test("le DTO refuse l’uptime Manager sans PID de santé", async () => {
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(
      s20Routes({ managerBody: { health: { uptime_s: 3661.9 } } }),
    ),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.session.serverUptime, null);
});

test("le DTO expose uniquement le lancement local du client météo", async () => {
  const launched = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(s20Routes()),
    weatherClientProbe: async () => true,
  });
  const absent = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(s20Routes()),
    weatherClientProbe: async () => false,
  });
  const s1Launched = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(routes()),
    weatherClientProbe: async () => true,
  });

  assert.equal(launched.data.session.weatherClientStatus, "launched");
  assert.equal(absent.data.session.weatherClientStatus, null);
  assert.equal(s1Launched.data.session.weatherClientStatus, "launched");
});

test("le parseur météo ne reconnaît que le nom exact du processus", () => {
  assert.equal(
    parseWeatherClientTasklist('"rf2WeatherClient.exe","10644","Console","1","64,756 K"'),
    true,
  );
  assert.equal(
    parseWeatherClientTasklist('"otherWeatherClient.exe","10644","Console","1","64,756 K"'),
    false,
  );
});

test("le formateur rFactor 2 convertit les secondes natives en HH:MM:SS", () => {
  assert.equal(formatRFactorDuration(80), "00:01:20");
  assert.equal(formatRFactorDuration(49.5), "00:00:49");
  assert.equal(formatRFactorDuration(2040.4), "00:34:00");
  assert.equal(formatRFactorDuration(5189.6), "01:26:29");
  assert.equal(formatRFactorDuration(0), "00:00:00");
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

test("la liste des sources affiche le numéro et le circuit fournis par la source", async () => {
  const handler = createPublicLiveTimingHandler({
    registry,
    fetchImpl: fakeFetch(routes({ standings: [] })),
  });
  const response = makeJsonResponse();
  await handler({ method: "GET", url: "/api/public/live-timing/sources" }, response);

  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.deepEqual(payload.sources, [
    {
      sourceId: "s1_vm",
      serverNumber: "1",
      circuit: "Paul Ricard  HTTT",
      label: "Serveur 1 — Paul Ricard  HTTT",
      description: "Source Live Timing configurée",
    },
  ]);
});

test("le hub SSE reprend après standings_unavailable et publie le snapshot valide suivant", async () => {
  const writes = [];
  const response = {
    write(chunk) {
      writes.push(chunk);
    },
  };
  const results = [
    {
      ok: false,
      sourceId: "s20_vm",
      status: "error",
      error: "standings_unavailable",
    },
    {
      ok: true,
      data: {
        sourceId: "s20_vm",
        fetchedAt: "2026-09-28T12:00:01.000Z",
        server: { status: "online" },
        standings: [{ position: 1, driverName: "Nouveau snapshot" }],
      },
    },
  ];
  let calls = 0;
  const hub = new LiveTimingStreamHub({
    collect: async () => results[Math.min(calls++, results.length - 1)],
    intervalMs: 1,
  });
  const state = hub.stateFor("s20_vm");
  state.clients.add(response);

  await hub.pump(state);
  if (state.timer) clearTimeout(state.timer);
  await hub.pump(state);
  if (state.timer) clearTimeout(state.timer);

  assert.equal(calls, 2);
  assert.match(writes[0], /event: status/);
  assert.match(writes[0], /standings_unavailable/);
  assert.match(writes[1], /event: snapshot/);
  assert.match(writes[1], /Nouveau snapshot/);
  assert.equal(hub.stateFor("s20_vm").lastEvent.event, "snapshot");
  assert.equal(hub.stateFor("s20_vm").lastEvent.payload.data.server.status, "online");
});
