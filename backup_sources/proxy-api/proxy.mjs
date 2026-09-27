/**
 * B404 Proxy API — Version production standalone
 *
 * Pont entre Cloudflare Tunnel et l'API rFactor 2
 * + fichiers statiques RaceControl (./out/)
 *
 * Usage :
 *   node proxy.mjs
 *
 * Port : 3001
 *
 * @module proxy
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RACECONTROL_DIR = path.resolve(__dirname, "..", "..", "Site", "b404-racecontrol");
const STATIC_DIR = path.join(RACECONTROL_DIR, "out");
const PROXY_PORT = 3001;

// Plage de ports rF2 à proxifier
const RF2_PORTS = [5297, 5300, 5303, 5306, 5309, 5312, 5315];

// Merge Engine (backend données RaceControl)
const MERGE_ENGINE_URL = "http://localhost:3002";

// API publique Live Timing RaceControl. Les origines rFactor 2 restent dans
// l'adaptateur backend et ne sont jamais transmises au navigateur.
const LIVE_TIMING_API_MODULE = pathToFileURL(
  path.resolve(__dirname, "..", "Git", "B404-RaceControl", "server", "live-timing-api.mjs"),
).href;
const { createPublicLiveTimingHandler } = await import(LIVE_TIMING_API_MODULE);
const liveTimingHandler = createPublicLiveTimingHandler();

// ─── Serveur HTTP ────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  // Route : proxy API rF2
  if (url.startsWith("/api/rf2") && req.method === "POST") {
    return handleProxyRequest(req, res);
  }

  // API publique RaceControl Live Timing + flux SSE.
  if (url.startsWith("/api/public/live-timing/")) {
    return liveTimingHandler(req, res);
  }

  // Route : reverse-proxy Merge Engine (/api/merge/*)
  if (url.startsWith("/api/merge/")) {
    return handleMergeProxy(req, res);
  }

  // Route : fichiers statiques
  return serveStatic(req, res);
});

// ─── Reverse-proxy Merge Engine ───────────────────────────────────────

async function handleMergeProxy(req, res) {
  const targetUrl = `${MERGE_ENGINE_URL}${req.url}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const text = await upstream.text();

    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* pas du JSON */
    }

    writeJson(res, upstream.status, data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    writeJson(res, 502, {
      success: false,
      error: `Merge Engine indisponible: ${msg}`,
    });
  }
}

// ─── Proxy API ────────────────────────────────────────────────────────

async function handleProxyRequest(req, res) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const { url: targetUrl } = JSON.parse(body);

      if (!targetUrl || typeof targetUrl !== "string") {
        writeJson(res, 400, {
          success: false,
          error: "Paramètre 'url' requis",
        });
        return;
      }

      // Vérifier que l'URL cible un port rF2 autorisé
      const parsed = new URL(targetUrl);
      const port = parseInt(parsed.port, 10);
      if (!RF2_PORTS.includes(port)) {
        writeJson(res, 403, {
          success: false,
          error: `Port ${port} non autorisé. Ports: ${RF2_PORTS.join(", ")}`,
        });
        return;
      }

      const startTime = Date.now();

      const response = await fetch(targetUrl, {
        signal: AbortSignal.timeout(8000),
      });

      const elapsedMs = Date.now() - startTime;
      const text = await response.text();

      let data = text;
      try {
        data = JSON.parse(text);
      } catch {
        /* pas du JSON */
      }

      writeJson(res, 200, {
        success: response.ok,
        httpCode: response.status,
        url: targetUrl,
        elapsedMs,
        data,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      writeJson(res, 200, {
        success: false,
        httpCode: 0,
        error: msg,
        elapsedMs: 0,
        data: null,
      });
    }
  });
}

// ─── Fichiers statiques ─────────────────────────────────────────────

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function serveStatic(req, res) {
  let urlPath = req.url ?? "/";

  // Rediriger / vers /index.html
  if (urlPath.endsWith("/")) {
    urlPath += "index.html";
  }

  const filePath = path.join(STATIC_DIR, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback : si le fichier n'existe pas et n'a pas d'extension,
      // essayer {chemin}/index.html (Next.js static export avec trailingSlash)
      const ext = path.extname(urlPath);
      if (!ext) {
        const indexPath = path.join(STATIC_DIR, urlPath, "index.html");
        return fs.readFile(indexPath, (_err2, indexData) => {
          if (_err2) {
            return send404(res);
          }
          sendFile(res, indexPath, indexData);
        });
      }
      return send404(res);
    }

    sendFile(res, filePath, data);
  });
}

function sendFile(res, filePath, data) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  });
  res.end(data);
}

function send404(res) {
  const notFound = path.join(STATIC_DIR, "404.html");
  fs.readFile(notFound, (_err, data404) => {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data404 ?? "<h1>404 — Page non trouvée</h1>");
  });
}

// ─── Utilitaires ──────────────────────────────────────────────────────

function writeJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

// ─── Démarrage ────────────────────────────────────────────────────────

server.listen(PROXY_PORT, () => {
  console.log();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║   B404 RaceControl — Proxy API (production)     ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║   Site statique : http://localhost:${PROXY_PORT}  ║`);
  console.log("║   API rF2 proxy : /api/rf2 (POST)              ║");
  console.log(`║   Ports rF2      : ${RF2_PORTS.join(", ")}  ║`);
  console.log(`║   Static dir     : ${STATIC_DIR}  ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
});
