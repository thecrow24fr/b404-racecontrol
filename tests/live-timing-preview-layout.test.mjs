import assert from "node:assert/strict";
import test from "node:test";

import { resolvePreviewTrackTechnicalId } from "../app/_services/live-timing-preview-layout.mjs";

test("resolves only the exact verified 3012 preview circuit name", () => {
  assert.equal(
    resolvePreviewTrackTechnicalId("Watkins Glen Boot", null),
    "WATKINS_GLEN_BOOT",
  );
  assert.equal(resolvePreviewTrackTechnicalId("Some other circuit", null), null);
  assert.equal(resolvePreviewTrackTechnicalId(null, null), null);
});

test("prefers a technical identity already supplied by the live source", () => {
  assert.equal(
    resolvePreviewTrackTechnicalId("Watkins Glen Boot", "VERIFIED_SOURCE_LAYOUT"),
    "VERIFIED_SOURCE_LAYOUT",
  );
});
