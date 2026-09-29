import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_RF2_BASE = "D:\\rfactor2-dedicated";
const DEFAULT_CATALOG_PATH = "D:\\B404\\Apps\\Manager\\data\\circuit_catalog.sqlite";
const DEFAULT_MANAGER_BASE_URL = "http://127.0.0.1:4000";
const DEFAULT_TIMEOUT_MS = 5000;
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 600;
const SVG_PADDING = 36;
const EPSILON = 1e-6;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function tupleValues(line, key) {
  const expression = new RegExp(`^\\s*${key}\\s*=\\s*\\(([^)]*)\\)`, "i");
  const match = expression.exec(line);
  if (!match) return null;
  const values = match[1]
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value));
  return values.length > 0 ? values : null;
}

function scalarValue(line, key) {
  const expression = new RegExp(`^\\s*${key}\\s*=\\s*\\(?([^,)\\s]+)`, "i");
  const match = expression.exec(line);
  return match ? finiteNumber(match[1]) : null;
}

function parseWaypointNodes(text) {
  const waypointStart = text.search(/^\[Waypoint\]\s*$/im);
  if (waypointStart < 0) return { lapLength: null, nodes: [] };

  const lines = text.slice(waypointStart).split(/\r?\n/);
  let lapLength = null;
  const nodes = [];
  let current = null;

  for (const line of lines) {
    const section = /^\s*\[[^]]+\]\s*$/i.test(line);
    if (section && !/^\s*\[Waypoint\]\s*$/i.test(line)) break;

    const parsedLapLength = scalarValue(line, "lap_length");
    if (parsedLapLength !== null && parsedLapLength > 0) lapLength = parsedLapLength;

    const position = tupleValues(line, "wp_pos");
    if (position && position.length >= 3) {
      current = {
        sourceIndex: nodes.length,
        x: position[0],
        y: position[2],
        scoreDistance: null,
        branchId: null,
        bitfields: null,
        pointers: null,
      };
      nodes.push(current);
      continue;
    }
    if (!current) continue;

    const score = tupleValues(line, "wp_score");
    if (score && score.length >= 2) current.scoreDistance = score[1];

    const pointers = tupleValues(line, "WP_PTRS");
    if (pointers && pointers.length >= 2) {
      current.pointers = pointers.map((value) => Math.trunc(value));
    }

    const branchId = scalarValue(line, "wp_branchID");
    if (branchId !== null) current.branchId = Math.trunc(branchId);

    const bitfields = scalarValue(line, "wp_bitfields");
    if (bitfields !== null) current.bitfields = Math.trunc(bitfields);
  }

  return { lapLength, nodes };
}

function followClosedChain(nodes, startIndex) {
  const chain = [];
  const seen = new Set();
  let index = startIndex;

  while (index >= 0 && index < nodes.length && !seen.has(index)) {
    const node = nodes[index];
    if (!node.pointers || node.branchId !== 0 || node.bitfields !== 0) return null;
    seen.add(index);
    chain.push(index);
    index = node.pointers[1];
  }

  return index === startIndex && chain.length >= 3 ? chain : null;
}

function chooseMainChain(nodes) {
  const candidates = nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.branchId === 0 && node.bitfields === 0 && node.pointers);
  let best = null;
  for (const { index } of candidates) {
    const chain = followClosedChain(nodes, index);
    if (chain && (!best || chain.length > best.length)) best = chain;
  }
  return best;
}

function rotateByStartScore(chain, nodes, lapLength) {
  const scored = chain
    .map((nodeIndex, chainIndex) => ({
      chainIndex,
      score: nodes[nodeIndex].scoreDistance,
    }))
    .filter(({ score }) => score !== null && score >= -EPSILON);
  if (scored.length === 0) return chain;
  const start = scored.reduce((best, item) => item.score < best.score ? item : best, scored[0]);
  if (lapLength === null || lapLength <= 0) return chain;
  return chain.slice(start.chainIndex).concat(chain.slice(0, start.chainIndex));
}

function euclideanDistance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function cumulativeDistances(ordered, nodes, lapLength) {
  const scores = ordered.map((index) => nodes[index].scoreDistance);
  if (lapLength !== null && lapLength > 0 && scores.every((value) => value !== null)) {
    const unwrapped = [scores[0]];
    let offset = 0;
    for (let index = 1; index < scores.length; index += 1) {
      let value = scores[index] + offset;
      while (value < unwrapped[index - 1] - EPSILON) {
        offset += lapLength;
        value = scores[index] + offset;
      }
      unwrapped.push(value);
    }
    const distances = unwrapped.map((value) => value - unwrapped[0]);
    if (distances.at(-1) > EPSILON && distances.at(-1) <= lapLength * 1.05) {
      return distances;
    }
  }

  const distances = [0];
  for (let index = 1; index < ordered.length; index += 1) {
    distances.push(
      distances[index - 1] + euclideanDistance(nodes[ordered[index - 1]], nodes[ordered[index]]),
    );
  }
  return distances;
}

/**
 * Parse un AIW rFactor 2 sans dépendre d’un nom de circuit.
 * La chaîne retenue est celle formée par WP_PTRS next sur les waypoints
 * principaux (branchID=0, bitfields=0). Les coordonnées SVG sont préparées
 * séparément afin de garder cette fonction testable sur les coordonnées brutes.
 */
export function parseAiwGeometry(text, { technicalId = "unknown" } = {}) {
  if (typeof text !== "string" || text.length === 0) throw new Error("aiw_empty");
  const { lapLength: parsedLapLength, nodes } = parseWaypointNodes(text);
  const chain = chooseMainChain(nodes);
  if (!chain) throw new Error("aiw_main_path_unavailable");

  const ordered = rotateByStartScore(chain, nodes, parsedLapLength);
  const lapLength = parsedLapLength ?? null;
  const distances = cumulativeDistances(ordered, nodes, lapLength);
  const totalDistance = distances.at(-1) ?? 0;
  const effectiveLapLength = lapLength && lapLength > totalDistance
    ? lapLength
    : totalDistance;
  if (!Number.isFinite(effectiveLapLength) || effectiveLapLength <= 0) {
    throw new Error("aiw_length_unavailable");
  }

  return {
    technicalId,
    lapLength: effectiveLapLength,
    points: ordered.map((nodeIndex, index) => ({
      x: nodes[nodeIndex].x,
      y: nodes[nodeIndex].y,
      distance: distances[index],
      sourceIndex: nodes[nodeIndex].sourceIndex,
    })),
  };
}

function normalizeGeometry(geometry, metadata = {}) {
  const minX = Math.min(...geometry.points.map((point) => point.x));
  const maxX = Math.max(...geometry.points.map((point) => point.x));
  const minY = Math.min(...geometry.points.map((point) => point.y));
  const maxY = Math.max(...geometry.points.map((point) => point.y));
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  if (!(rangeX > 0) || !(rangeY > 0)) throw new Error("aiw_degenerate_geometry");

  const scale = Math.min(
    (SVG_WIDTH - 2 * SVG_PADDING) / rangeX,
    (SVG_HEIGHT - 2 * SVG_PADDING) / rangeY,
  );
  const renderedWidth = rangeX * scale;
  const renderedHeight = rangeY * scale;
  const offsetX = (SVG_WIDTH - renderedWidth) / 2;
  const offsetY = (SVG_HEIGHT - renderedHeight) / 2;

  return {
    ...geometry,
    ...metadata,
    viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
    points: geometry.points.map((point) => ({
      x: offsetX + (point.x - minX) * scale,
      y: offsetY + (maxY - point.y) * scale,
      distance: point.distance,
      sourceIndex: point.sourceIndex,
    })),
  };
}

export function interpolateGeometryPoint(geometry, lapDistance) {
  if (!geometry || !Array.isArray(geometry.points) || geometry.points.length < 2) return null;
  const length = finiteNumber(geometry.lapLength);
  const requested = finiteNumber(lapDistance);
  if (length === null || length <= 0 || requested === null) return null;

  let distance = requested % length;
  if (distance < 0) distance += length;
  const points = geometry.points;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (distance <= current.distance) {
      const span = current.distance - previous.distance;
      const ratio = span > EPSILON ? (distance - previous.distance) / span : 0;
      return {
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      };
    }
  }

  const previous = points.at(-1);
  const first = points[0];
  const wrapSpan = Math.max(EPSILON, length - previous.distance);
  const ratio = (distance - previous.distance) / wrapSpan;
  return {
    x: previous.x + (first.x - previous.x) * ratio,
    y: previous.y + (first.y - previous.y) * ratio,
  };
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(entryPath));
    else files.push(entryPath);
  }
  return files;
}

function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== "..");
}

export async function resolveLayoutFromCatalog(
  technicalId,
  {
    catalogPath = process.env.RACECONTROL_CATALOG_PATH ?? DEFAULT_CATALOG_PATH,
    rf2Base = process.env.RACECONTROL_RF2_BASE ?? DEFAULT_RF2_BASE,
  } = {},
) {
  if (typeof technicalId !== "string" || !technicalId.trim()) return null;
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(catalogPath, { readOnly: true });
  try {
    const rows = database.prepare(`
      SELECT
        l.technical_id AS technicalId,
        c.component_name AS componentName,
        c.component_version AS componentVersion,
        c.component_dir AS componentDir,
        m.mas_name AS masName,
        ls.source_file_name AS sourceFileName
      FROM layouts l
      JOIN mas_archives m ON m.mas_pk = l.mas_pk
      JOIN components c ON c.component_pk = m.component_pk
      LEFT JOIN layout_sources ls
        ON ls.layout_pk = l.layout_pk AND ls.source_kind = 'AIW'
      WHERE l.technical_id = ?
    `).all(technicalId.trim());
    if (rows.length !== 1 || !rows[0].sourceFileName) return null;

    const row = rows[0];
    const locationsRoot = path.resolve(rf2Base, "Installed", "Locations");
    const catalogComponentDir = row.componentDir
      ? path.resolve(row.componentDir)
      : path.join(locationsRoot, row.componentName, row.componentVersion);
    const componentDir = isWithin(locationsRoot, catalogComponentDir)
      ? catalogComponentDir
      : path.join(locationsRoot, row.componentName, row.componentVersion);
    const masPath = path.join(componentDir, row.masName);
    if (!isWithin(locationsRoot, masPath)) return null;

    return {
      technicalId: row.technicalId,
      componentName: row.componentName,
      componentVersion: row.componentVersion,
      componentDir,
      masName: row.masName,
      masPath,
      sourceFileName: row.sourceFileName,
    };
  } finally {
    database.close();
  }
}

async function defaultExtractAiwText(layout, { rf2Base, timeoutMs = 60000 } = {}) {
  const modMgr = path.join(rf2Base, "Bin64", "ModMgr.exe");
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "racecontrol-aiw-"));
  try {
    await execFileAsync(
      modMgr,
      [`-c${layout.componentDir}`, `-o${outputDir}`, `-x${layout.masName}`, "*.AIW"],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 256 * 1024 },
    );
    const files = await walkFiles(outputDir);
    const exact = files.find((file) => path.basename(file).toLowerCase() === layout.sourceFileName.toLowerCase());
    const fallback = files.find((file) => path.extname(file).toLowerCase() === ".aiw");
    const sourcePath = exact ?? fallback;
    if (!sourcePath) throw new Error("aiw_extraction_empty");
    return await readFile(sourcePath, "utf8");
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

async function requestJson(url, { fetchImpl, timeoutMs }) {
  if (typeof fetchImpl !== "function") return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function createTrackGeometryProvider({
  registry = {},
  rf2Base = process.env.RACECONTROL_RF2_BASE ?? DEFAULT_RF2_BASE,
  catalogPath = process.env.RACECONTROL_CATALOG_PATH ?? DEFAULT_CATALOG_PATH,
  managerBaseUrl = process.env.RACECONTROL_MANAGER_URL ?? DEFAULT_MANAGER_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  resolveLayout = (technicalId) => resolveLayoutFromCatalog(technicalId, { rf2Base, catalogPath }),
  extractAiwText = (layout) => defaultExtractAiwText(layout, { rf2Base }),
} = {}) {
  const cache = new Map();

  async function getForTechnicalId(technicalId) {
    const key = typeof technicalId === "string" ? technicalId.trim() : "";
    if (!key) return null;
    if (!cache.has(key)) {
      const promise = (async () => {
        const layout = await resolveLayout(key);
        if (!layout) return null;
        const text = await extractAiwText(layout);
        const parsed = parseAiwGeometry(text, { technicalId: key });
        return normalizeGeometry(parsed, {
          componentName: layout.componentName ?? null,
          componentVersion: layout.componentVersion ?? null,
          masName: layout.masName ?? null,
          sourceFileName: layout.sourceFileName ?? null,
        });
      })().catch(() => null);
      cache.set(key, promise);
    }
    return cache.get(key);
  }

  async function getForSource(sourceId, {
    fetchImpl = globalThis.fetch,
    sourceRegistry = registry,
    managerUrl = managerBaseUrl,
    requestTimeoutMs = timeoutMs,
  } = {}) {
    const source = sourceRegistry[sourceId];
    if (!source?.managerDetailPath) return null;
    const body = await requestJson(`${managerUrl}${source.managerDetailPath}`, {
      fetchImpl,
      timeoutMs: requestTimeoutMs,
    });
    const card = body?.card;
    const resolution = card?.circuit_resolution;
    const profile = typeof card?.profile === "string" ? card.profile.trim() : "";
    if (profile !== source.managerProfile) return null;
    if (
      resolution?.status !== "matched" ||
      Number(resolution?.candidate_count) !== 1 ||
      typeof resolution?.technical_id !== "string"
    ) return null;
    return getForTechnicalId(resolution.technical_id);
  }

  return {
    getForTechnicalId,
    getForSource,
    cache,
  };
}
