/**
 * Serveur proxy local — Pont entre le navigateur et l'API rFactor 2
 *
 * À utiliser en production locale sur la VM B404, quand le site statique
 * est servi par un serveur HTTP simple (pas Next.js).
 *
 * Ce serveur ajoute les headers CORS manquants à l'API rF2,
 * permettant au navigateur de l'interroger directement.
 *
 * Usage :
 *   node local-proxy.mjs
 *
 *   Puis ouvre http://localhost:3001/serveurs/
 *   (les fichiers statiques doivent être dans ./out/)
 *
 * @module local-proxy
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATIC_DIR = path.join(__dirname, "out");
const PROXY_PORT = 3001;

// Plage de ports rF2 à proxifier
const RF2_PORTS = [5297, 5300, 5303, 5306, 5309, 5312, 5315];

// ─── Serveur HTTP ────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  // Route : proxy API rF2
  if (url.startsWith("/api/rf2") && req.method === "POST") {
    return handleProxyRequest(req, res);
  }

  // Route : fichiers statiques
  return serveStatic(req, res);
});

// ─── Proxy API ────────────────────────────────────────────────────────

async function handleProxyRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  let body = "";
  req.on("data", (chunk: string) => (body += chunk));
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

      let data: unknown = text;
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
    } catch (err: unknown) {
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

const MIME_TYPES: Record<string, string> = {
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

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  let urlPath = req.url ?? "/";

  // Rediriger / vers /index.html
  if (urlPath.endsWith("/")) {
    urlPath += "index.html";
  }

  const filePath = path.join(STATIC_DIR, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Page 404 personnalisée
      const notFound = path.join(STATIC_DIR, "404.html");
      fs.readFile(notFound, (_err2, data404) => {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data404 ?? "<h1>404 — Page non trouvée</h1>");
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    // ✅ HEADER CORS AJOUTÉ — c'est le but de ce proxy
    res.writeHead(200, {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  });
}

// ─── Utilitaires ──────────────────────────────────────────────────────

function writeJson(
  res: http.ServerResponse,
  status: number,
  data: unknown,
) {
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
  console.log("║   B404 RaceControl — Proxy Local                ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║   Site statique : http://localhost:${PROXY_PORT}  ║`);
  console.log("║   API rF2 proxy : /api/rf2 (POST)              ║");
  console.log(`║   Ports rF2      : ${RF2_PORTS.join(", ")}  ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
});
