import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicLiveTimingHandler } from "./live-timing-api.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = path.join(rootDir, "out");
const port = 3012;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const apiHandler = createPublicLiveTimingHandler({
  disableManagerContext: true,
  // Preview 3012 only: direct read-only rFactor 2 Shared Memory telemetry.
  enableNativeSharedMemory: true,
  geometryProvider: {
    async getForSource() {
      return null;
    },
  },
});

function send(response, status, headers, body) {
  response.writeHead(status, headers);
  response.end(body);
}

async function serveStatic(request, response) {
  if (request.method !== "GET") {
    send(response, 405, { "Content-Type": "text/plain; charset=utf-8" }, "Method Not Allowed");
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    send(response, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = path.resolve(staticDir, relative);
  const relativeToRoot = path.relative(staticDir, candidate);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }
  const candidates = [candidate];
  if (pathname.endsWith("/")) candidates.unshift(path.join(candidate, "index.html"));
  if (!path.extname(pathname)) candidates.push(path.join(candidate, "index.html"));
  for (const filePath of candidates) {
    try {
      const body = await fs.readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();
      send(response, 200, {
        "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
        "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=300",
      }, body);
      return;
    } catch {
      // Try the next static candidate.
    }
  }
  send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
}

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (pathname.startsWith("/api/public/live-timing/")) {
    void apiHandler(request, response);
    return;
  }
  void serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`B404 full Live Timing preview: http://127.0.0.1:${port}`);
});
