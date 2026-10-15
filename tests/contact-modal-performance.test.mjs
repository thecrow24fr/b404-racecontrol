import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../app/_components/contact-modal.tsx", import.meta.url),
  "utf8"
);

const overlayClass = source.match(
  /className=\{`fixed inset-0 z-\[100\][^`]*`/s
)?.[0];

test("contact overlay dims the page without filtering its animated background", () => {
  assert.ok(overlayClass, "the contact backdrop class should be present");
  assert.match(overlayClass, /bg-black\/60/, "keep the page dimmed behind the modal");
  assert.doesNotMatch(
    overlayClass,
    /backdrop-blur/,
    "a full-viewport backdrop blur forces continuous filtering of the RaceControl hero video"
  );
});
