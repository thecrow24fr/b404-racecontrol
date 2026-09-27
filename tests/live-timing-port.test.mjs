import test from "node:test";
import assert from "node:assert/strict";

const { resolveLiveTimingPort } = await import("../server/live-timing-port.mjs");

test("le port 0 reste éphémère et les valeurs invalides reprennent le port local", () => {
  assert.equal(resolveLiveTimingPort(undefined), 3101);
  assert.equal(resolveLiveTimingPort(""), 3101);
  assert.equal(resolveLiveTimingPort("0"), 0);
  assert.equal(resolveLiveTimingPort("3101"), 3101);
  assert.equal(resolveLiveTimingPort("not-a-port"), 3101);
  assert.equal(resolveLiveTimingPort("70000"), 3101);
});
