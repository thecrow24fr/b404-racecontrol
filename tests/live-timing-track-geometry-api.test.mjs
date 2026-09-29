import test from "node:test";
import assert from "node:assert/strict";

const { createPublicLiveTimingHandler } = await import("../server/live-timing-api.mjs");

function response() {
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

const registry = {
  s20_vm: {
    sourceId: "s20_vm",
    serverNumber: 20,
    baseUrl: "http://127.0.0.1:5354",
    managerDetailPath: "/api/view/servers/20",
    managerProfile: "Serveur 20",
  },
};

test("la route track-geometry retourne le layout résolu et reste séparée du snapshot", async () => {
  const calls = [];
  const geometryProvider = {
    async getForSource(sourceId) {
      calls.push(sourceId);
      return {
        technicalId: "WATKINS_GLEN_BOOT",
        lapLength: 5463.303711,
        viewBox: "0 0 1000 600",
        points: [
          { x: 10, y: 20, distance: 0 },
          { x: 30, y: 40, distance: 100 },
          { x: 10, y: 20, distance: 200 },
        ],
      };
    },
  };
  const handler = createPublicLiveTimingHandler({ registry, geometryProvider });
  const res = response();

  await handler({ method: "GET", url: "/api/public/live-timing/s20_vm/track-geometry" }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, ["s20_vm"]);
  const body = JSON.parse(res.body);
  assert.equal(body.success, true);
  assert.equal(body.technicalId, "WATKINS_GLEN_BOOT");
  assert.equal(body.geometry.points.length, 3);
});

test("la route track-geometry conserve les gardes GET et allowlist", async () => {
  const handler = createPublicLiveTimingHandler({
    registry,
    geometryProvider: { getForSource: async () => null },
  });
  const post = response();
  await handler({ method: "POST", url: "/api/public/live-timing/s20_vm/track-geometry" }, post);
  assert.equal(post.statusCode, 405);

  const unknown = response();
  await handler({ method: "GET", url: "/api/public/live-timing/other/track-geometry" }, unknown);
  assert.equal(unknown.statusCode, 404);
});
