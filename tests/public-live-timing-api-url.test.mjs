import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicLiveTimingApiUrl } from "../app/_services/public-live-timing-api-url.mjs";

test("l’URL publique utilise api.b404ldc.fr si aucune base n’est configurée", () => {
  assert.equal(
    buildPublicLiveTimingApiUrl("/s20_vm", ""),
    "https://api.b404ldc.fr/api/public/live-timing/s20_vm",
  );
});

test("l’URL publique conserve une base configurée et normalise les slashs", () => {
  assert.equal(
    buildPublicLiveTimingApiUrl("s20_vm/stream", "https://api.example.test/"),
    "https://api.example.test/api/public/live-timing/s20_vm/stream",
  );
});
