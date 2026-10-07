import test from "node:test";
import assert from "node:assert/strict";

const {
  collectLiveTiming,
  collectR2laLiveTiming,
  createPublicLiveTimingHandler,
  formatRFactorDuration,
  LiveTimingStreamHub,
  parseWeatherClientTasklist,
} = await import(
  "../server/live-timing-api.mjs"
);

function response(status, body, { parseError = false } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Map([["content-type", "application/json"]]),
    async json() {
      if (parseError) throw new SyntaxError("invalid json");
      return body;
    },
  };
}

function fakeFetch(routes) {
  return async (url) => {
    const route = routes[url];
    if (!route) throw new Error(`unexpected URL: ${url}`);
    return response(route.status ?? 200, route.body, route);
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
  lastSectorTime1: 41.111,
  lastSectorTime2: 43.222,
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

const r2laRegistry = {
  s20_vm: {
    sourceId: "s20_vm",
    serverNumber: 20,
    r2laBaseUrl: "http://r2la.test",
  },
};

const r2laPayload = {
  mScoringInfo: {
    mServerName: "!B404",
    mTrackName: "Paul Ricard HTTT",
    mSession: "PRACTICE1",
    mCurrentET: 49.5,
    mEndET: 80,
    mMaxLaps: 2147483647,
    mLapDist: 5000,
    mAmbientTemp: 21.85,
    mTrackTemp: 45.66,
    mRaining: 0,
    mMaxPathWetness: 0,
    mYellowFlagState: "NONE",
    mSectorFlag: ["UNKNOWN", "UNKNOWN", "UNKNOWN"],
  },
  mVehicles: [
    {
      mID: 41,
      mDriverName: "Pilote Deux",
      mVehicleName: "GT3 publique",
      mTeamName: "Équipe publique",
      mCarNumber: "8",
      mVehicleClass: "GT3",
      mPlace: 2,
      mTotalLaps: 3,
      mBestLapTime: 126.123,
      mLastLapTime: 127.456,
      mTimeBehindLeader: 1.25,
      mTimeBehindNext: 1.25,
      mLapsBehindLeader: 0,
      mInPits: 0,
      mNumPitstops: 1,
      mLapDist: 2500,
    },
    {
      mID: 40,
      mDriverName: "Pilote Un",
      mVehicleName: "GT3 publique",
      mTeamName: "Équipe publique",
      mCarNumber: "7",
      mVehicleClass: "GT3",
      mPlace: 1,
      mTotalLaps: 3,
      mBestLapTime: 125.123,
      mLastLapTime: 126.456,
      mTimeBehindLeader: 0,
      mTimeBehindNext: 0,
      mLapsBehindLeader: 0,
      mInPits: 1,
      mNumPitstops: 2,
      mLapDist: 1250,
    },
  ],
};

test("normalise le snapshot R2LA vers le DTO B404 pour classement et carte", async () => {
  const result = await collectR2laLiveTiming("s20_vm", {
    registry: r2laRegistry,
    fetchImpl: fakeFetch({ "http://r2la.test/live/get_data": { body: r2laPayload } }),
    now: () => "2026-09-30T18:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.sourceId, "s20_vm");
  assert.equal(result.data.server.circuit, "Paul Ricard HTTT");
  assert.equal(result.data.server.trackTechnicalId, null);
  assert.equal(result.data.server.driversCount, 2);
  assert.equal(result.data.standings.length, 2);
  assert.deepEqual(result.data.standings.map((entry) => entry.position), [1, 2]);
  assert.deepEqual(result.data.standings.map((entry) => entry.lapDistance), [1250, 2500]);
  assert.deepEqual(result.data.standings.map((entry) => entry.lapProgress), [0.25, 0.5]);
  assert.equal(result.data.standings[0].inPit, true);
  assert.equal(result.data.standings[0].sector1, "—");
  assert.equal(result.data.standings[0].sector2, "—");
  assert.equal(result.data.standings[0].sector3, null);
  assert.equal(result.data.records.available, false);
  assert.equal(result.data.tyres.available, false);
});

test("R2LA publie un technicalId seulement lorsqu’il est explicitement confirmé", async () => {
  const result = await collectR2laLiveTiming("s20_vm", {
    registry: r2laRegistry,
    fetchImpl: fakeFetch({ "http://r2la.test/live/get_data": { body: r2laPayload } }),
    trackTechnicalId: "WATKINS_GLEN_BOOT",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.server.trackTechnicalId, "WATKINS_GLEN_BOOT");
});

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

test("le DTO expose les secteurs du dernier tour et laisse la qualification absente à null", async () => {
  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(
      routes({
        standings: [{
          ...standing,
          qualification: 0,
          carClass: undefined,
          bestSectorTime1: 40.1,
          bestSectorTime2: 42.2,
          lastSectorTime1: 41.111,
          lastSectorTime2: 43.222,
        }],
      }),
    ),
    now: () => "2026-09-07T12:00:00.000Z",
  });

  assert.equal(result.ok, true);
  const [entry] = result.data.standings;
  assert.equal(entry.sector1, "0:41.111");
  assert.equal(entry.sector2, "0:02.111");
  assert.equal(entry.sector3, "1:23.234");
  assert.equal(entry.startingPosition, null);
  assert.equal(entry.carClass, null);
  assert.equal(entry.fuelFraction, 0.5);
});

test("les temps sectoriels cumulés sont convertis en durées de secteurs", async () => {
  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(
      routes({
        standings: [{
          ...standing,
          lapsCompleted: 1,
          lastLapTime: 110.379,
          lastSectorTime1: 25.641,
          lastSectorTime2: 67.767,
        }],
      }),
    ),
  });

  assert.equal(result.ok, true);
  const [entry] = result.data.standings;
  assert.equal(entry.sector1, "0:25.641");
  assert.equal(entry.sector2, "0:42.126");
  assert.equal(entry.sector3, "0:42.612");
});

test("les bornes incohérentes mettent en tiret les secteurs impossibles", async () => {
  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(
      routes({
        standings: [{
          ...standing,
          lapsCompleted: 1,
          lastLapTime: 100,
          lastSectorTime1: 60,
          lastSectorTime2: 50,
        }],
      }),
    ),
  });

  assert.equal(result.ok, true);
  const [entry] = result.data.standings;
  assert.equal(entry.sector1, "1:00.000");
  assert.equal(entry.sector2, "—");
  assert.equal(entry.sector3, null);
});

test("un dernier secteur reste indisponible quand S2 brut dépasse le dernier tour", async () => {
  const result = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(
      routes({
        standings: [{
          ...standing,
          lapsCompleted: 1,
          lastLapTime: 110,
          lastSectorTime1: 25,
          lastSectorTime2: 120,
        }],
      }),
    ),
  });

  assert.equal(result.ok, true);
  const [entry] = result.data.standings;
  assert.equal(entry.sector1, "0:25.000");
  assert.equal(entry.sector2, "—");
  assert.equal(entry.sector3, null);
});

test("S3 reste indisponible si le dernier tour est incomplet ou incohérent", async () => {
  const invalidRoutes = routes({
    standings: [{
      ...standing,
      lastLapTime: 100,
      lastSectorTime1: 60,
      lastSectorTime2: 50,
    }],
  });
  const invalidResult = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(invalidRoutes),
  });
  assert.equal(invalidResult.ok, true);
  assert.equal(invalidResult.data.standings[0].sector3, null);

  const incompleteRoutes = routes({
    standings: [{
      ...standing,
      lastLapTime: -1,
    }],
  });
  const incompleteResult = await collectLiveTiming("s1_vm", {
    registry,
    fetchImpl: fakeFetch(incompleteRoutes),
  });
  assert.equal(incompleteResult.ok, true);
  assert.equal(incompleteResult.data.standings[0].sector3, null);
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

test("la collecte native S20 directe ne contacte pas le Manager avec un technicalId explicitement vérifié", async () => {
  const directRoutes = s20Routes();
  delete directRoutes["http://127.0.0.1:4000/api/view/servers/20"];
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    const route = directRoutes[url];
    if (!route) throw new Error(`unexpected URL: ${url}`);
    return response(route.status ?? 200, route.body, route);
  };

  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl,
    nativeTrackTechnicalId: "WATKINS_GLEN_BOOT",
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.degraded, undefined);
  assert.equal(result.data.server.trackTechnicalId, "WATKINS_GLEN_BOOT");
  assert.equal(result.data.session.serverUptime, null);
  assert.equal(requested.some((url) => url.includes(":4000/")), false);
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

test("un classement HTTP 500 conserve le contexte source en état dégradé sans fabriquer de pilotes", async () => {
  const badRoutes = s20Routes();
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = {
    status: 500,
    body: { internal: "must-not-leak" },
  };

  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    now: () => "2026-09-29T22:00:00.000Z",
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.degraded, true);
  assert.equal(result.error, "standings_unavailable");
  assert.equal(result.standingsFailure, "http_500");
  assert.equal(result.data.server.status, "degraded");
  assert.equal(result.data.server.circuit, "Paul Ricard  HTTT");
  assert.equal(result.data.server.currentSession, "Essais libres 1");
  assert.equal(result.data.server.driversCount, null);
  assert.equal(result.data.server.lapsCompleted, null);
  assert.deepEqual(result.data.standings, []);
  assert.equal(result.data.session.phase, "practice");
});

test("un classement Watch indisponible utilise les 8 lignes Shared Memory seulement si toutes les associations sont vérifiées", async () => {
  const badRoutes = s20Routes({
    sessionBody: { ...sessionInfo, numberOfVehicles: 8, lapDistance: 5463 },
  });
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = { status: 500, body: {} };
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    sharedMemoryReader: async () => ({
      stable: true,
      scoringVehicleCount: 8,
      telemetryVehicleCount: 8,
      matchedVehicleCount: 8,
      vehicles: [
        { slotID: 21, mID: 21, control: 2, driverName: "Human One", vehicleName: "Car A", carClass: "GT3", position: 1, lapsCompleted: 8, lastLapTime: 90, bestLapTime: 89, lapDistance: 4100 },
        { slotID: 22, mID: 22, control: 2, driverName: "Human Two", vehicleName: "Car B", carClass: "GT4", position: 2, lapsCompleted: 7, lastLapTime: 92, bestLapTime: 91, lapDistance: 3700 },
        { slotID: 23, mID: 23, control: 1, driverName: "AI Three", vehicleName: "Car C", carClass: "GT3", position: 3, lapsCompleted: 8, lastLapTime: 93, bestLapTime: 92, lapDistance: 3000 },
        { slotID: 24, mID: 24, control: 1, driverName: "AI Four", vehicleName: "Car D", carClass: "GT3", position: 4, lapsCompleted: 7, lastLapTime: 94, bestLapTime: 93, lapDistance: 2900 },
        { slotID: 25, mID: 25, control: 1, driverName: "AI Five", vehicleName: "Car E", carClass: "GT4", position: 5, lapsCompleted: 7, lastLapTime: 95, bestLapTime: 94, lapDistance: 2800 },
        { slotID: 26, mID: 26, control: 1, driverName: "AI Six", vehicleName: "Car F", carClass: "GT4", position: 6, lapsCompleted: 6, lastLapTime: 96, bestLapTime: 95, lapDistance: 2700 },
        { slotID: 27, mID: 27, control: 2, driverName: "Human Seven", vehicleName: "Car G", carClass: "GT3", position: 7, lapsCompleted: 6, lastLapTime: 97, bestLapTime: 96, lapDistance: 2600 },
        { slotID: 28, mID: 28, control: 1, driverName: "AI Eight", vehicleName: "Car H", carClass: "GT4", position: 8, lapsCompleted: 5, lastLapTime: 98, bestLapTime: 97, lapDistance: 2500 },
      ],
    }),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.degraded, false);
  assert.equal(result.warning, "native_shared_memory_fallback");
  assert.equal(result.data.server.status, "online");
  assert.equal(result.data.server.standingsUnavailableReason, "http_500");
  assert.equal(result.data.server.standingsSource, "shared_memory_scoring");
  assert.equal(result.data.server.driversCount, 8);
  assert.deepEqual(result.data.standings.map((row) => row.position), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(result.data.standings.filter((row) => row.driverType === "human").length, 3);
  assert.equal(result.data.standings.filter((row) => row.driverType === "ai").length, 5);
  assert.deepEqual(result.data.standings.filter((row) => row.driverType === "human").map(({position}) => position), [1, 2, 7]);
  assert.doesNotMatch(JSON.stringify(result.data), /slotID|mID|steamID|control/);
});

test("un snapshot Shared Memory instable n’alimente pas le classement", async () => {
  const badRoutes = s20Routes({
    sessionBody: { ...sessionInfo, numberOfVehicles: 1 },
  });
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = { status: 500, body: {} };
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    sharedMemoryReader: async () => ({
      stable: false,
      scoringVehicleCount: 1,
      telemetryVehicleCount: 1,
      matchedVehicleCount: 1,
      vehicles: [{ slotID: 1, mID: 1, control: 2, driverName: "Must Not Show", vehicleName: "Car", carClass: "GT3", position: 1 }],
    }),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.data.server.standingsSource, "unavailable");
  assert.equal(result.data.server.driversCount, null);
  assert.match(result.data.server.standingsUnavailableReason, /Trame Shared Memory indisponible ou instable/);
  assert.deepEqual(result.data.standings, []);
});

test("un mID différent du slotID refuse le fallback sans inventer une identité", async () => {
  const badRoutes = s20Routes({ sessionBody: { ...sessionInfo, numberOfVehicles: 1 } });
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = { status: 500, body: {} };
  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    sharedMemoryReader: async () => ({
      stable: true,
      scoringVehicleCount: 1,
      telemetryVehicleCount: 1,
      matchedVehicleCount: 1,
      vehicles: [{ slotID: 5, mID: 6, control: 2, driverName: "Unverified", vehicleName: "Car", carClass: "GT3", position: 1 }],
    }),
    weatherClientProbe: async () => false,
  });
  assert.equal(result.data.server.standingsSource, "unavailable");
  assert.deepEqual(result.data.standings, []);
  assert.equal(result.data.server.driversCount, null);
  assert.match(result.data.server.standingsUnavailableReason, /Association native slotID\/mID non vérifiée/);
  assert.doesNotMatch(result.data.server.standingsUnavailableReason, /5|6|Unverified/);
});

test("un classement JSON de forme inattendue est classifié en interne sans fuite publique", async () => {
  const badRoutes = s20Routes();
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = {
    status: 200,
    body: { vehicles: "must-not-leak" },
  };

  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.degraded, true);
  assert.equal(result.standingsFailure, "unexpected_shape");
  assert.deepEqual(result.data.standings, []);
});

test("un classement JSON illisible est classifié en interne sans fuite publique", async () => {
  const badRoutes = s20Routes();
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = {
    status: 200,
    parseError: true,
  };

  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.standingsFailure, "invalid_json");
  assert.deepEqual(result.data.standings, []);
});

test("un timeout standings est classifié en interne sans fuite publique", async () => {
  const baseFetch = fakeFetch(s20Routes());
  const fetchImpl = async (url, options) => {
    if (!url.endsWith("/rest/watch/standings")) return baseFetch(url, options);
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    });
  };

  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl,
    timeoutMs: 1,
    weatherClientProbe: async () => false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.standingsFailure, "timeout");
  assert.deepEqual(result.data.standings, []);
});

test("la route publique expose explicitement le snapshot dégradé sans exposer l’erreur interne", async () => {
  const badRoutes = s20Routes();
  badRoutes["http://127.0.0.1:5354/rest/watch/standings"] = {
    status: 500,
    body: { internal: "must-not-leak" },
  };
  const handler = createPublicLiveTimingHandler({
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
    weatherClientProbe: async () => false,
  });
  const response = makeJsonResponse();
  await handler({ method: "GET", url: "/api/public/live-timing/s20_vm" }, response);

  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.success, true);
  assert.equal(payload.degraded, true);
  assert.equal(payload.data.server.status, "degraded");
  assert.deepEqual(payload.data.standings, []);
  assert.doesNotMatch(response.body, /must-not-leak|standingsFailure|upstreamStatus/);
});

test("une indisponibilité sessionInfo reste une panne source sans DTO partiel", async () => {
  const badRoutes = s20Routes();
  badRoutes["http://127.0.0.1:5354/rest/watch/sessionInfo"] = {
    status: 503,
    body: { internal: "must-not-leak" },
  };

  const result = await collectLiveTiming("s20_vm", {
    registry: s20Registry,
    fetchImpl: fakeFetch(badRoutes),
  });

  assert.deepEqual(result, {
    ok: false,
    sourceId: "s20_vm",
    status: "error",
    error: "source_unavailable",
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
