import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const {
  createTrackGeometryProvider,
  interpolateGeometryPoint,
  parseAiwGeometry,
} = await import("../server/track-geometry.mjs");

const fixture = `
[Waypoint]
number_waypoints=5
lap_length=100.000000
wp_pos=(0,0,0)
wp_score=(0,0)
wp_branchID=(0)
wp_bitfields=(0)
WP_PTRS=(3,1,-1,0)
wp_pos=(10,0,0)
wp_score=(0,25)
wp_branchID=(0)
wp_bitfields=(0)
WP_PTRS=(0,2,4,0)
wp_pos=(10,0,10)
wp_score=(1,50)
wp_branchID=(0)
wp_bitfields=(0)
WP_PTRS=(1,3,-1,0)
wp_pos=(0,0,10)
wp_score=(2,75)
wp_branchID=(0)
wp_bitfields=(0)
WP_PTRS=(2,0,-1,0)
wp_pos=(50,0,50)
wp_score=(0,50)
wp_branchID=(1)
wp_bitfields=(0)
WP_PTRS=(1,4,-1,0)
`;

test("parseAiwGeometry suit la chaîne principale et exclut les branches", () => {
  const geometry = parseAiwGeometry(fixture, { technicalId: "FIXTURE_LAYOUT" });

  assert.equal(geometry.technicalId, "FIXTURE_LAYOUT");
  assert.equal(geometry.lapLength, 100);
  assert.equal(geometry.points.length, 4);
  assert.deepEqual(geometry.points[0].sourceIndex, 0);
  assert.deepEqual(geometry.points.at(-1).sourceIndex, 3);
  assert.ok(geometry.points.every((point, index, points) =>
    index === 0 || point.distance > points[index - 1].distance));
});

test("interpolateGeometryPoint place un marker par distance curviligne et reboucle", () => {
  const geometry = parseAiwGeometry(fixture, { technicalId: "FIXTURE_LAYOUT" });
  const atStart = interpolateGeometryPoint(geometry, 0);
  const atQuarter = interpolateGeometryPoint(geometry, 25);
  const afterLap = interpolateGeometryPoint(geometry, 125);

  assert.deepEqual(atStart, { x: 0, y: 0 });
  assert.deepEqual(atQuarter, { x: 10, y: 0 });
  assert.deepEqual(afterLap, { x: 10, y: 0 });
});

test("le provider met en cache une géométrie et retourne null pour un layout absent", async () => {
  let extractionCount = 0;
  const provider = createTrackGeometryProvider({
    resolveLayout: async (technicalId) => technicalId === "KNOWN"
      ? { technicalId, sourceFileName: "KNOWN.AIW" }
      : null,
    extractAiwText: async () => {
      extractionCount += 1;
      return fixture;
    },
  });

  const first = await provider.getForTechnicalId("KNOWN");
  const second = await provider.getForTechnicalId("KNOWN");
  const missing = await provider.getForTechnicalId("MISSING");

  assert.equal(first.technicalId, "KNOWN");
  assert.strictEqual(second, first);
  assert.equal(missing, null);
  assert.equal(extractionCount, 1);
});

const rf2Base = process.env.RACECONTROL_RF2_BASE ?? "D:\\rfactor2-dedicated";
const catalogPath = process.env.RACECONTROL_CATALOG_PATH
  ?? "D:\\B404\\Apps\\Manager\\data\\circuit_catalog.sqlite";
const realSourceAvailable = existsSync(resolve(rf2Base, "Bin64", "ModMgr.exe"))
  && existsSync(catalogPath);

test("AIW réel Watkins Glen Boot : chaîne principale exploitable", { skip: !realSourceAvailable }, async () => {
  const provider = createTrackGeometryProvider({ rf2Base, catalogPath });
  const geometry = await provider.getForTechnicalId("WATKINS_GLEN_BOOT");

  assert.ok(geometry);
  assert.equal(geometry.technicalId, "WATKINS_GLEN_BOOT");
  assert.ok(geometry.points.length > 500);
  assert.ok(Math.abs(geometry.lapLength - 5463.303711) < 0.001);
});

test("AIW réel Nürburgring Grand Prix : la résolution change de géométrie", { skip: !realSourceAvailable }, async () => {
  const provider = createTrackGeometryProvider({ rf2Base, catalogPath });
  const watkins = await provider.getForTechnicalId("WATKINS_GLEN_BOOT");
  const nurburgring = await provider.getForTechnicalId("NURBURGRING_GRANDPRIX");

  assert.ok(watkins);
  assert.ok(nurburgring);
  assert.notEqual(watkins.technicalId, nurburgring.technicalId);
  assert.notEqual(watkins.points[0].x, nurburgring.points[0].x);
  assert.ok(Math.abs(nurburgring.lapLength - 5146.70459) < 0.001);
});
