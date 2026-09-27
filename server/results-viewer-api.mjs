import { SOURCE_REGISTRY } from "./live-timing-api.mjs";

const DEFAULT_TIMEOUT_MS = 5000;
const SESSION_LABELS = {
  TESTDAY: "Test Day",
  PRACTICE1: "Essais libres 1",
  PRACTICE2: "Essais libres 2",
  PRACTICE3: "Essais libres 3",
  PRACTICE4: "Essais libres 4",
  QUALIFY1: "Qualifications 1",
  QUALIFY2: "Qualifications 2",
  QUALIFY3: "Qualifications 3",
  QUALIFY4: "Qualifications 4",
  WARMUP: "Warmup",
  RACE1: "Course 1",
  RACE2: "Course 2",
  RACE3: "Course 3",
  RACE4: "Course 4",
};

const SOURCE_NAMES = {
  s1_vm: "S1 VM",
  s20_vm: "S20 — Serveur 20",
};

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function publicText(value, fallback = null) {
  if (typeof value !== "string") return fallback;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 160);
  return text || fallback;
}

function formatLapTime(value) {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${minutes}:${remainder.toFixed(3).padStart(6, "0")}`;
}

function formatGap(vehicle, position) {
  if (position === 1) return "Leader";
  const laps = finiteNumber(vehicle.lapsBehindLeader);
  if (laps !== null && laps > 0) return `+${laps} tour${laps > 1 ? "s" : ""}`;
  const seconds = finiteNumber(vehicle.timeBehindLeader);
  if (seconds === null || seconds <= 0) return null;
  return `+${seconds.toFixed(3)}s`;
}

function sessionCode(value, fallback = "UNKNOWN") {
  return publicText(value, fallback)?.toUpperCase() ?? fallback;
}

function sessionName(code) {
  return SESSION_LABELS[code] ?? code;
}

function sessionPhase(code) {
  if (code.startsWith("PRACTICE") || code === "TESTDAY" || code === "WARMUP") {
    return "practice";
  }
  if (code.startsWith("QUALIFY")) return "qualifying";
  if (code.startsWith("RACE")) return "race";
  return "waiting";
}

function driverStatus(vehicle) {
  if (vehicle?.pitting === true || vehicle?.pitState === "STOPPED") return "pit";
  const finish = publicText(vehicle?.finishStatus, "")?.toUpperCase();
  if (finish === "FSTAT_DNF" || finish === "FSTAT_DQ") return "dnf";
  if (finish === "FSTAT_FINISHED") return "finished";
  return "running";
}

function historyEntries(history) {
  if (Array.isArray(history)) return history;
  if (!history || typeof history !== "object") return [];
  return Object.values(history).flatMap((series) =>
    Array.isArray(series) ? series : [],
  );
}

function trackName(selection, sessionInfo) {
  const track = selection?.track;
  if (track && typeof track === "object") {
    return (
      publicText(track.name) ??
      publicText(track.shortName) ??
      publicText(sessionInfo.trackName)
    );
  }
  return publicText(sessionInfo.trackName);
}

function eventName(selection, sessionInfo) {
  const event = selection?.event;
  if (event && typeof event === "object") {
    return publicText(event.name) ?? publicText(event.title);
  }
  return publicText(selection?.eventName) ?? publicText(sessionInfo.eventName);
}

function ensureSession(sessions, code, context) {
  if (!sessions.has(code)) {
    sessions.set(code, {
      id: `${context.sourceId}:${code}`,
      code,
      name: sessionName(code),
      phase: sessionPhase(code),
      status: code === context.currentCode ? "current" : "observed",
      circuit: context.circuit,
      serverName: context.serverName,
      eventName: context.eventName,
      observedAt: context.fetchedAt,
      entries: new Map(),
    });
  }
  return sessions.get(code);
}

function ensureDriver(session, driverName) {
  if (!session.entries.has(driverName)) {
    session.entries.set(driverName, {
      position: null,
      driverName,
      team: null,
      car: null,
      carNumber: null,
      laps: null,
      bestLapSeconds: null,
      lastLapSeconds: null,
      gapToLeader: null,
      status: "observed",
    });
  }
  return session.entries.get(driverName);
}

function mergeLap(entry, lap) {
  const lapTime = finiteNumber(lap.lapTime ?? lap.bestLapTime);
  if (lapTime !== null && lapTime > 0) {
    entry.bestLapSeconds =
      entry.bestLapSeconds === null
        ? lapTime
        : Math.min(entry.bestLapSeconds, lapTime);
    entry.lastLapSeconds = lapTime;
  }

  const laps = finiteNumber(lap.totalLaps ?? lap.lapsCompleted);
  if (laps !== null && laps >= 0) {
    entry.laps = entry.laps === null ? laps : Math.max(entry.laps, laps);
  }

  const position = finiteNumber(lap.position);
  if (position !== null && position > 0) entry.position = position;
  if (publicText(lap.team)) entry.team = publicText(lap.team);
  if (publicText(lap.fullTeamName)) entry.team = publicText(lap.fullTeamName);
  if (publicText(lap.vehicleName)) entry.car = publicText(lap.vehicleName);
  if (publicText(lap.carNumber)) entry.carNumber = publicText(lap.carNumber);
}

function mergeVehicle(entry, vehicle) {
  const position = finiteNumber(vehicle.position);
  if (position !== null && position > 0) entry.position = position;
  entry.team = publicText(vehicle.fullTeamName) ?? entry.team;
  entry.car = publicText(vehicle.vehicleName) ?? entry.car;
  entry.carNumber = publicText(vehicle.carNumber) ?? entry.carNumber;

  const laps = finiteNumber(vehicle.lapsCompleted);
  if (laps !== null && laps >= 0) {
    entry.laps = entry.laps === null ? laps : Math.max(entry.laps, laps);
  }

  const bestLap = finiteNumber(vehicle.bestLapTime);
  if (bestLap !== null && bestLap > 0) {
    entry.bestLapSeconds =
      entry.bestLapSeconds === null
        ? bestLap
        : Math.min(entry.bestLapSeconds, bestLap);
  }
  const lastLap = finiteNumber(vehicle.lastLapTime);
  if (lastLap !== null && lastLap > 0) entry.lastLapSeconds = lastLap;
  entry.gapToLeader = formatGap(vehicle, entry.position);
  entry.status = driverStatus(vehicle);
}

function serializeSession(session) {
  const entries = [...session.entries.values()]
    .sort((left, right) => {
      const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
      const rightPosition = right.position ?? Number.POSITIVE_INFINITY;
      if (leftPosition !== rightPosition) return leftPosition - rightPosition;
      const leftBest = left.bestLapSeconds ?? Number.POSITIVE_INFINITY;
      const rightBest = right.bestLapSeconds ?? Number.POSITIVE_INFINITY;
      return leftBest - rightBest || left.driverName.localeCompare(right.driverName);
    })
    .map((entry) => ({
      position: entry.position,
      driverName: entry.driverName,
      team: entry.team,
      car: entry.car,
      carNumber: entry.carNumber,
      laps: entry.laps,
      bestLap: formatLapTime(entry.bestLapSeconds),
      lastLap: formatLapTime(entry.lastLapSeconds),
      gapToLeader: entry.gapToLeader,
      status: entry.status,
    }));

  return {
    id: session.id,
    code: session.code,
    name: session.name,
    phase: session.phase,
    status: session.status,
    circuit: session.circuit,
    serverName: session.serverName,
    eventName: session.eventName,
    observedAt: session.observedAt,
    participants: entries.length,
    entries,
  };
}

function buildResults(sourceId, sessionInfo, selection, standings, history, fetchedAt) {
  const currentCode = sessionCode(sessionInfo.session);
  const context = {
    sourceId,
    currentCode,
    circuit: trackName(selection, sessionInfo),
    serverName: publicText(sessionInfo.serverName),
    eventName: eventName(selection, sessionInfo),
    fetchedAt,
  };
  const sessions = new Map();

  for (const lap of historyEntries(history)) {
    if (!lap || typeof lap !== "object") continue;
    const driverName = publicText(lap.driverName);
    if (!driverName) continue;
    const code = sessionCode(lap.session ?? lap.sessionCode, currentCode);
    const session = ensureSession(sessions, code, context);
    mergeLap(ensureDriver(session, driverName), lap);
  }

  const current = ensureSession(sessions, currentCode, context);
  for (const vehicle of standings) {
    if (!vehicle || typeof vehicle !== "object") continue;
    const driverName = publicText(vehicle.driverName);
    if (!driverName) continue;
    mergeVehicle(ensureDriver(current, driverName), vehicle);
  }

  const serialized = [...sessions.values()]
    .map(serializeSession)
    .sort((left, right) => {
      if (left.id === `${sourceId}:${currentCode}`) return -1;
      if (right.id === `${sourceId}:${currentCode}`) return 1;
      return left.code.localeCompare(right.code);
    });

  return {
    sourceId,
    sourceName: SOURCE_NAMES[sourceId] ?? sourceId,
    fetchedAt,
    currentSessionId: `${sourceId}:${currentCode}`,
    archive: {
      available: false,
      message:
        "RaceControl expose ici les observations réellement reçues de la source. Aucune archive finale indépendante n’est déclarée sans une source de résultats persistante et vérifiée.",
    },
    sessions: serialized,
  };
}

async function requestJson(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: response.status };
    try {
      return { ok: true, status: response.status, body: await response.json() };
    } catch {
      return { ok: false, status: response.status, parseError: true };
    }
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export async function collectResults(sourceId, options = {}) {
  const registry = options.registry ?? SOURCE_REGISTRY;
  const source = registry[sourceId];
  if (!source) throw new Error("unknown_source");

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? (() => new Date().toISOString());
  const fetchedAt = now();

  const sessionResult = await requestJson(
    `${source.baseUrl}/rest/watch/sessionInfo`,
    { fetchImpl, timeoutMs },
  );
  if (
    !sessionResult.ok ||
    !sessionResult.body ||
    typeof sessionResult.body !== "object"
  ) {
    return { ok: false, sourceId, status: "error", error: "source_unavailable" };
  }

  const selectionResult = await requestJson(
    `${source.baseUrl}/rest/race/selection`,
    { fetchImpl, timeoutMs },
  );
  const selection =
    selectionResult.ok && selectionResult.body && typeof selectionResult.body === "object"
      ? selectionResult.body
      : null;

  const standingsResult = await requestJson(
    `${source.baseUrl}/rest/watch/standings`,
    { fetchImpl, timeoutMs },
  );
  if (!standingsResult.ok || !Array.isArray(standingsResult.body)) {
    return { ok: false, sourceId, status: "error", error: "standings_unavailable" };
  }

  const historyResult = await requestJson(
    `${source.baseUrl}/rest/watch/standings/history`,
    { fetchImpl, timeoutMs },
  );
  const history = historyResult.ok ? historyResult.body : null;

  return {
    ok: true,
    data: buildResults(
      sourceId,
      sessionResult.body,
      selection,
      standingsResult.body,
      history,
      fetchedAt,
    ),
  };
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

export function createPublicResultsHandler(options = {}) {
  return async function publicResultsHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname.replace(/\/$/, "") || "/";
    const prefix = "/api/public/results/";

    if (!pathname.startsWith(prefix)) {
      writeJson(response, 404, { success: false, error: "not_found" });
      return;
    }
    if (request.method !== "GET") {
      writeJson(response, 405, { success: false, error: "method_not_allowed" });
      return;
    }
    if (requestUrl.search) {
      writeJson(response, 400, { success: false, error: "query_not_allowed" });
      return;
    }

    const sourceId = pathname.slice(prefix.length);
    const registry = options.registry ?? SOURCE_REGISTRY;
    if (!Object.prototype.hasOwnProperty.call(registry, sourceId)) {
      writeJson(response, 404, { success: false, error: "unknown_source" });
      return;
    }

    try {
      const result = await collectResults(sourceId, options);
      if (!result.ok) {
        writeJson(response, 503, {
          success: false,
          sourceId,
          sourceStatus: result.status,
          error: result.error,
        });
        return;
      }
      writeJson(response, 200, { success: true, data: result.data });
    } catch {
      writeJson(response, 500, {
        success: false,
        sourceId,
        sourceStatus: "error",
        error: "adapter_failure",
      });
    }
  };
}
