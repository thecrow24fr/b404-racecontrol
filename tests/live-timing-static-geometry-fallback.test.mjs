import assert from "node:assert/strict";
import test from "node:test";

import { fetchTrackGeometryPayload } from "../app/_services/live-timing-track-geometry-loader.mjs";

const technicalId = "WATKINS_GLEN_BOOT";
const validPayload = {
  success: true,
  geometry: {
    technicalId,
    lapLength: 5500,
    viewBox: "0 0 100 100",
    points: [
      { x: 1, y: 1, distance: 0 },
      { x: 50, y: 1, distance: 2750 },
      { x: 1, y: 1, distance: 5500 },
    ],
    sectorBounds: [],
  },
};

function jsonResponse(payload, ok = true) {
  return { ok, json: async () => payload };
}

test("uses the exact static layout file when the preview API has no geometry", async () => {
  const requests = [];
  const payload = await fetchTrackGeometryPayload(
    "/api/public/live-timing/s20_vm/track-geometry",
    technicalId,
    async (url) => {
      requests.push(url);
      return url.startsWith("/api/")
        ? jsonResponse({ success: false })
        : jsonResponse(validPayload);
    },
  );

  assert.deepEqual(requests, [
    "/api/public/live-timing/s20_vm/track-geometry",
    "/track-geometry/WATKINS_GLEN_BOOT.json",
  ]);
  assert.deepEqual(payload, validPayload);
});

test("does not accept a static geometry file for a different layout", async () => {
  const wrongLayout = {
    ...validPayload,
    geometry: { ...validPayload.geometry, technicalId: "OTHER_LAYOUT" },
  };
  const payload = await fetchTrackGeometryPayload(
    "/api/public/live-timing/s20_vm/track-geometry",
    technicalId,
    async () => jsonResponse(wrongLayout),
  );

  assert.equal(payload, null);
});

test("keeps using a valid API geometry before trying the static fallback", async () => {
  const requests = [];
  const payload = await fetchTrackGeometryPayload(
    "/api/public/live-timing/s20_vm/track-geometry",
    technicalId,
    async (url) => {
      requests.push(url);
      return jsonResponse(validPayload);
    },
  );

  assert.deepEqual(requests, ["/api/public/live-timing/s20_vm/track-geometry"]);
  assert.deepEqual(payload, validPayload);
});
