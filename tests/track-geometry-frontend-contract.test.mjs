import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("la progression utilise le tracé SVG AIW générique et un cache par layout", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const client = await text("app/_components/live-timing-client.tsx");
  const types = await text("app/_types/live-timing.ts");

  assert.match(track, /geometryCache = new Map/);
  assert.match(track, /track-geometry/);
  assert.match(track, /<svg/);
  assert.match(track, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(track, /function fitGeometryForDisplay\(\n/);
  assert.match(track, /MARKER_SAFE_MARGIN/);
  assert.match(track, /getGeometryMarkerPlacements/);
  assert.match(track, /<line/);
  assert.match(track, /function getStartFinishLine\(\n/);
  assert.match(track, /startFinishLine/);
  assert.match(track, /data-start-finish-line="true"/);
  assert.match(track, /stroke="#f8fafc"/);
  assert.match(track, /const START_FINISH_HALF_LENGTH = 18/);
  assert.match(track, /strokeWidth="5"/);
  assert.match(track, /directionArrowPath/);
  assert.match(track, /data-direction-arrow="true"/);
  assert.match(track, /const START_DIRECTION_ARROW_LENGTH/);
  assert.match(track, /const MARKER_LABEL_COUNTER_ROTATION = -90/);
  assert.match(track, /markerLabelRotation/);
  assert.match(track, /rotate\(\$\{markerLabelRotation\}\)/);
  assert.match(track, /const MARKER_LABEL_RADIUS = 8/);
  assert.match(track, /r=\{MARKER_LABEL_RADIUS\}/);
  assert.match(track, /strokeWidth=\{MARKER_LABEL_STROKE_WIDTH\}/);
  assert.match(track, /fontSize=\{MARKER_LABEL_FONT_SIZE\}/);
  assert.match(track, /stroke="#3f8f4a"/);
  assert.doesNotMatch(track, /url\(#live-track-gradient\)/);
  assert.doesNotMatch(track, /linearGradient/);
  assert.doesNotMatch(track, /#f59e0b|#ef4444/);
  assert.doesNotMatch(track, /#22c55e/);
  assert.match(track, /const fittedGeometry = useMemo/);
  assert.match(track, /viewBox=\{fittedGeometry\?\.viewBox/);
  assert.match(track, /interpolateGeometryPoint\(geometry, entry\.lapDistance/);
  assert.match(track, /Tracé AIW indisponible — ligne de secours temporaire/);
  assert.match(track, /Marqueur : position actuelle au classement/);
  assert.doesNotMatch(track, /const marker = entry\.carNumber/);
  assert.match(client, /sourceId=\{selectedSourceId\}/);
  assert.match(client, /trackTechnicalId=\{data\.server\.trackTechnicalId \?\? null\}/);
  assert.match(types, /trackTechnicalId\?: string \| null/);
});

test("le provider backend route la géométrie sans l’ajouter au snapshot Live", async () => {
  const api = await text("server/live-timing-api.mjs");
  const geometry = await text("server/track-geometry.mjs");

  assert.match(api, /createTrackGeometryProvider/);
  assert.match(api, /resource === "track-geometry"/);
  assert.match(api, /geometryProvider\.getForSource/);
  assert.match(geometry, /resolveLayoutFromCatalog/);
  assert.match(geometry, /ModMgr\.exe/);
  assert.match(geometry, /WP_PTRS/);
  assert.match(geometry, /branchId !== 0/);
  assert.match(geometry, /cache = new Map/);
});
