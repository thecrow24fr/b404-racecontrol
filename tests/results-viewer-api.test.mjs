import test from "node:test";
import assert from "node:assert/strict";

const { collectResults, createPublicResultsHandler } = await import(
  "../server/results-viewer-api.mjs"
);

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
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

const registry = {
  s20_vm: { sourceId: "s20_vm", baseUrl: "http://127.0.0.1:5354" },
};

const sessionInfo = {
  serverName: "B404 S20",
  trackName: "Paul Ricard HTTT",
  session: "PRACTICE1",
  playerName: "must-not-leak",
  serverPort: 5354,
};

const selection = {
  track: { name: "Paul Ricard HTTT", shortName: "Paul Ricard" },
  event: { name: "B404 Training" },
};

const standing = {
  driverName: "Pilote Public",
  vehicleName: "GT3 publique",
  fullTeamName: "Équipe publique",
  carNumber: "7",
  position: 1,
  qualification: 1,
  lapsCompleted: 4,
  bestLapTime: 125.123,
  lastLapTime: 126.456,
  timeBehindLeader: 0,
  lapsBehindLeader: 0,
  pitting: false,
  finishStatus: "FSTAT_NONE",
  steamID: 90071996842377246,
};

const history = {
  "40": [
    {
      driverName: "Pilote Public",
      vehicleName: "GT3 publique",
      session: "PRACTICE1",
      lapTime: 125.123,
      totalLaps: 3,
    },
    {
      driverName: "Pilote Public",
      vehicleName: "GT3 publique",
      session: "PRACTICE1",
      lapTime: 124.987,
      totalLaps: 4,
    },
  ],
};

function routes({ standings = [standing], historyBody = history } = {}) {
  return {
    "http://127.0.0.1:5354/rest/watch/sessionInfo": { body: sessionInfo },
    "http://127.0.0.1:5354/rest/race/selection": { body: selection },
    "http://127.0.0.1:5354/rest/watch/standings": { body: standings },
    "http://127.0.0.1:5354/rest/watch/standings/history": { body: historyBody },
  };
}

test("collecte les observations Results Viewer et filtre les champs internes", async () => {
  const result = await collectResults("s20_vm", {
    registry,
    fetchImpl: fakeFetch(routes()),
    now: () => "2026-09-26T12:00:00.000Z",
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.sourceId, "s20_vm");
  assert.equal(result.data.sourceName, "S20 — Serveur 20");
  assert.equal(result.data.sessions.length, 1);
  assert.equal(result.data.sessions[0].name, "Essais libres 1");
  assert.equal(result.data.sessions[0].circuit, "Paul Ricard HTTT");
  assert.equal(result.data.sessions[0].entries[0].bestLap, "2:04.987");
  assert.equal(result.data.sessions[0].entries[0].laps, 4);
  assert.equal(result.data.archive.available, false);

  const serialized = JSON.stringify(result.data);
  assert.doesNotMatch(serialized, /steamID|serverPort|playerName/);
});

test("un classement indisponible bloque le Results Viewer", async () => {
  const result = await collectResults("s20_vm", {
    registry,
    fetchImpl: fakeFetch({
      ...routes(),
      "http://127.0.0.1:5354/rest/watch/standings": {
        status: 500,
        body: { internal: "must-not-leak" },
      },
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    sourceId: "s20_vm",
    status: "error",
    error: "standings_unavailable",
  });
});

test("la route Results Viewer est GET-only et refuse les sources arbitraires", async () => {
  const handler = createPublicResultsHandler({
    registry,
    fetchImpl: fakeFetch(routes()),
  });
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

  const okResponse = makeResponse();
  await handler({ method: "GET", url: "/api/public/results/s20_vm" }, okResponse);
  assert.equal(okResponse.statusCode, 200);
  assert.equal(JSON.parse(okResponse.body).data.sourceId, "s20_vm");

  const postResponse = makeResponse();
  await handler({ method: "POST", url: "/api/public/results/s20_vm" }, postResponse);
  assert.equal(postResponse.statusCode, 405);

  const queryResponse = makeResponse();
  await handler({ method: "GET", url: "/api/public/results/s20_vm?source=http://evil" }, queryResponse);
  assert.equal(queryResponse.statusCode, 400);

  const unknownResponse = makeResponse();
  await handler({ method: "GET", url: "/api/public/results/unknown" }, unknownResponse);
  assert.equal(unknownResponse.statusCode, 404);
});
