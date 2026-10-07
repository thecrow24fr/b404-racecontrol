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
  const geometryLoader = await text("app/_services/live-timing-track-geometry-loader.mjs");

  assert.match(track, /geometryCache = new Map/);
  assert.match(track, /track-geometry/);
  assert.match(track, /<svg/);
  assert.match(track, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(track, /function fitGeometryForDisplay\(\r?\n/);
  assert.match(track, /MARKER_SAFE_MARGIN/);
  assert.match(track, /getGeometryMarkerPlacements/);
  assert.match(track, /<line/);
  assert.match(track, /function getStartFinishLine\(\r?\n/);
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
  assert.match(client, /resolvePreviewTrackTechnicalId/);
  assert.match(client, /trackTechnicalId=\{trackTechnicalId\}/);
  assert.doesNotMatch(client, /unavailableReason=\{data\.server\.standingsUnavailableReason\}/);
  assert.match(track, /fetchTrackGeometryPayload/);
  assert.match(geometryLoader, /\/track-geometry\/\$\{encodeURIComponent\(id\)\}\.json/);
  assert.match(types, /trackTechnicalId\?: string \| null/);
});

test("la progression réserve le gris aux stands confirmés et les couleurs aux classes", async () => {
  const track = await text("app/_components/live-timing-track-line.tsx");
  const theme = await text("app/_services/live-timing-visual-theme.ts");

  assert.match(track, /getMarkerPalette\(entry\.carClass, entry\.inPit === true\)/);
  assert.match(theme, /CAR_CLASS_PALETTES = Object\.freeze/);
  assert.match(theme, /PIT_MARKER_PALETTE/);
  assert.match(theme, /#64748b/);
  assert.match(theme, /#cbd5e1/);
  assert.match(theme, /GT3: Object\.freeze\(\{[\s\S]*fill: "#f97316"/);
  assert.match(theme, /GT4: Object\.freeze\(\{[\s\S]*fill: "#2563eb"/);
  const gt3Fill = theme.match(/GT3: Object\.freeze\(\{[\s\S]*?fill: "([^"]+)"/)?.[1];
  const gt4Fill = theme.match(/GT4: Object\.freeze\(\{[\s\S]*?fill: "([^"]+)"/)?.[1];
  assert.ok(gt3Fill && gt4Fill);
  assert.notEqual(gt3Fill, gt4Fill);
  assert.match(theme, /LMP2: Object\.freeze\(\{[\s\S]*fill: "#9333ea"/);
  assert.match(theme, /HYPERCAR/);
  assert.match(theme, /PORSCHE_CUP/);
  assert.match(theme, /MULTI_CLASSE/);
  assert.match(track, /fill=\{markerPalette\.fill\}/);
  assert.match(track, /stroke=\{markerPalette\.stroke\}/);
  assert.match(track, /backgroundColor: markerPalette\.fill/);
  assert.match(track, /borderColor: markerPalette\.stroke/);
  assert.doesNotMatch(track, /const markerFill = entry\.underYellow/);
  assert.doesNotMatch(track, /entry\.inPit \? "#06b6d4"/);
  assert.match(track, /const marker = String\(entry\.position\)/);
  assert.match(track, /<title>/);
  assert.doesNotMatch(track, /safetyCar/);
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
