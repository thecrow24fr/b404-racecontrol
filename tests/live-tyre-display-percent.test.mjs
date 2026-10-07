import test from "node:test";
import assert from "node:assert/strict";
import { formatTyrePercent, liveTimingHealthPresentation } from "../app/_services/live-tyre-display-percent.mjs";

test("formats remaining tyre wear as a whole percent without changing source telemetry", () => {
  assert.equal(formatTyrePercent(94.2), "94 %");
  assert.equal(formatTyrePercent(93.7), "94 %");
  assert.equal(formatTyrePercent(100), "100 %");
});

test("keeps invalid or unavailable tyre wear visibly unavailable", () => {
  assert.equal(formatTyrePercent(null), "N/D");
  assert.equal(formatTyrePercent(Number.NaN), "N/D");
  assert.equal(formatTyrePercent(-0.1), "N/D");
  assert.equal(formatTyrePercent(100.1), "N/D");
});

test("recognizes only complete validated native Shared Memory fallback as online with a visible notice", () => {
  assert.deepEqual(liveTimingHealthPresentation({ status: "degraded", standingsSource: "shared_memory_scoring", driversCount: 5, standingsCount: 5 }), {
    status: "online",
    notice: "Classement natif complet (Shared Memory) — source standings indisponible.",
  });
});

test("keeps a complete fallback degraded when its transport is also disconnected", () => {
  const result = liveTimingHealthPresentation({
    status: "degraded",
    standingsSource: "shared_memory_scoring",
    driversCount: 5,
    standingsCount: 5,
    error: "Flux Live Timing reconnecté…",
  });
  assert.equal(result.status, "degraded");
  assert.match(result.notice, /source standings indisponible/);
});

test("does not hide partial, unavailable, or primary-source degraded states", () => {
  for (const input of [
    { status: "degraded", standingsSource: "shared_memory_scoring", driversCount: 5, standingsCount: 4 },
    { status: "degraded", standingsSource: "unavailable", driversCount: null, standingsCount: 0 },
    { status: "degraded", standingsSource: "standings", driversCount: 5, standingsCount: 5 },
    { status: "offline", standingsSource: "shared_memory_scoring", driversCount: 5, standingsCount: 5 },
  ]) {
    assert.deepEqual(liveTimingHealthPresentation(input), { status: input.status, notice: null });
  }
});
