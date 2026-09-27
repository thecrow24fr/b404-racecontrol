import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicLiveTimingHandler } from "./live-timing-api.mjs";
import { createPublicResultsHandler } from "./results-viewer-api.mjs";
import { resolveLiveTimingPort } from "./live-timing-port.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = path.join(rootDir, "out");
const port = resolveLiveTimingPort(process.env.LIVE_TIMING_PORT);

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

const apiHandler = createPublicLiveTimingHandler();
const resultsHandler = createPublicResultsHandler();

function send(response, status, headers, body) {
  response.writeHead(status, headers);
  response.end(body);
}

async function serveStatic(request, response) {
  if (request.method !== "GET") {
    send(response, 405, { "Content-Type": "text/plain; charset=utf-8" }, "Method Not Allowed");
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    send(response, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad Request");
    return;
  }

  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = path.resolve(staticDir, relative);
  const relativeToRoot = path.relative(staticDir, candidate);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  const candidates = [candidate];
  if (decoded.endsWith("/")) candidates.unshift(path.join(candidate, "index.html"));
  if (!path.extname(decoded)) candidates.push(path.join(candidate, "index.html"));

  for (const filePath of candidates) {
    try {
      const body = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      send(response, 200, {
        "Content-Type": mimeTypes[ext] ?? "application/octet-stream",
        "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300",
      }, body);
      return;
    } catch {
      // Try the next static candidate.
    }
  }

  send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not Found");
}

const server = (await import("node:http")).createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  if (pathname.startsWith("/api/public/live-timing/")) {
    void apiHandler(request, response);
    return;
  }
  if (pathname.startsWith("/api/public/results/")) {
    void resultsHandler(request, response);
    return;
  }
  void serveStatic(request, response);
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`B404 RaceControl Live Timing local server: http://127.0.0.1:${actualPort}`);
});
