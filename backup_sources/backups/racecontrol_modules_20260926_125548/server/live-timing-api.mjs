import http from "node:http";

const DEFAULT_TIMEOUT_MS = 5000;
const INT32_MAX = 2147483647;

/**
 * Explicit public source registry. The browser never receives these origins.
 */
export const SOURCE_REGISTRY = Object.freeze({
  s1_vm: Object.freeze({
    sourceId: "s1_vm",
    baseUrl: "http://127.0.0.1:5414",
  }),
  // S20 REST is reachable only on the internal WebUI port; this origin never
  // leaves the backend and is never exposed to the browser.
  s20_vm: Object.freeze({
    sourceId: "s20_vm",
    baseUrl: "http://127.0.0.1:5354",
  }),
});

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

const SOURCE_TIMEOUT_ERROR = "source_unavailable";

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function publicText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 160);
}

function formatLapTime(value) {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${minutes}:${remainder.toFixed(3).padStart(6, "0")}`;
}

function formatDuration(value) {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds < 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds - minutes * 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatGap(timeBehind, lapsBehind, isLeader) {
  if (isLeader) return "Leader";
  const laps = finiteNumber(lapsBehind);
  if (laps !== null && laps > 0) {
    return `+${laps} tour${laps > 1 ? "s" : ""}`;
  }
  const seconds = finiteNumber(timeBehind);
  if (seconds === null || seconds <= 0) return "—";
  return `+${seconds.toFixed(3)}s`;
}

function sessionLabel(code) {
  const value = publicText(code, "—");
  return SESSION_LABELS[value] ?? value;
}

function sessionPhase(code) {
  const value = publicText(code).toUpperCase();
  if (value.startsWith("PRACTICE")) return "practice";
  if (value.startsWith("QUALIFY")) return "qualifying";
  if (value === "WARMUP") return "practice";
  if (value.startsWith("RACE")) return "race";
  if (value === "TESTDAY") return "practice";
  return "waiting";
}

function mapStatus(vehicle) {
  if (vehicle.pitting === true || vehicle.pitState === "STOPPED") return "pit";
  const finish = publicText(vehicle.finishStatus).toUpperCase();
  if (finish === "FSTAT_DNF" || finish === "FSTAT_DQ") return "dnf";
  if (finish === "FSTAT_FINISHED") return "finished";
  return "running";
}

function mapWeather(session) {
  const rain = finiteNumber(session.raining) ?? 0;
  const clouds = finiteNumber(session.darkCloud) ?? 0;
  const wetness = finiteNumber(session.averagePathWetness) ?? 0;
  const windMs = finiteNumber(session.windSpeed?.velocity) ?? 0;
  let condition = "Dégagé";
  if (rain >= 0.7) condition = "Pluie forte";
  else if (rain >= 0.3) condition = "Pluie modérée";
  else if (rain >= 0.05) condition = "Bruine";
  else if (clouds >= 0.7) condition = "Couvert";
  else if (clouds >= 0.3) condition = "Partiellement nuageux";

  return {
    condition,
    temperature: Math.round(finiteNumber(session.ambientTemp) ?? 0),
    windSpeed: Math.round(windMs * 3.6),
    rainPercent: Math.round(Math.max(0, Math.min(1, rain)) * 100),
    trackCondition:
      wetness >= 0.5 ? "wet" : wetness >= 0.1 ? "damp" : "dry",
  };
}

function mapFlags(session) {
  const state = publicText(session.yellowFlagState).toUpperCase();
  if (state && state !== "NONE" && state !== "INVALID") {
    return [{ type: "yellow", sector: 0 }];
  }
  return [{ type: "green", sector: 0 }];
}

function mapTyreCorner(raw) {
  if (!raw || typeof raw !== "object") return null;
  const result = {
    compound: publicText(raw.compound, "") || null,
    wear: finiteNumber(raw.wear),
    temperature: finiteNumber(raw.temperature),
    pressure: finiteNumber(raw.pressure),
  };
  if (
    result.compound === null &&
    result.wear === null &&
    result.temperature === null &&
    result.pressure === null
  ) {
    return null;
  }
  return result;
}

function mapTyreEvolution(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.evolution)) {
    return [];
  }
  return raw.evolution
    .filter((point) => point && typeof point === "object")
    .map((point) => ({
      lap: finiteNumber(point.lap),
      frontLeft: mapTyreCorner(point.frontLeft),
      frontRight: mapTyreCorner(point.frontRight),
      rearLeft: mapTyreCorner(point.rearLeft),
      rearRight: mapTyreCorner(point.rearRight),
    }))
    .filter((point) => point.lap !== null);
}

/**
 * Conservative tyre mapper. The native contract currently inspected does not
 * expose this block; it is accepted only when an explicit, complete nested
 * block is present in a future source response.
 */
function buildTyres(vehicles) {
  const entries = [];
  for (const vehicle of vehicles) {
    const raw = vehicle?.tyres ?? vehicle?.tires;
    if (!raw || typeof raw !== "object") continue;
    const corners = {
      frontLeft: mapTyreCorner(raw.frontLeft),
      frontRight: mapTyreCorner(raw.frontRight),
      rearLeft: mapTyreCorner(raw.rearLeft),
      rearRight: mapTyreCorner(raw.rearRight),
    };
    if (Object.values(corners).some((corner) => corner === null)) continue;
    entries.push({
      driverName: publicText(vehicle.driverName, "Pilote"),
      compound: publicText(raw.compound, "") || null,
      corners,
      evolution: mapTyreEvolution(raw),
    });
  }

  if (entries.length === 0) {
    return {
      available: false,
      message: "Données pneus non disponibles via l’API rFactor 2.",
      evolutionAvailable: false,
      entries: [],
    };
  }

  return {
    available: true,
    message: "Données pneus fournies explicitement par la source.",
    evolutionAvailable: entries.some((entry) => entry.evolution.length > 0),
    entries,
  };
}

function buildRecords(history, fallbackSession) {
  if (!history || typeof history !== "object" || Array.isArray(history)) {
    return {
      available: false,
      message: "Records non disponibles via l’API rFactor 2.",
      entries: [],
    };
  }

  const bestByDriverAndSession = new Map();
  for (const series of Object.values(history)) {
    if (!Array.isArray(series)) continue;
    for (const lap of series) {
      if (!lap || typeof lap !== "object") continue;
      const seconds = finiteNumber(lap.lapTime);
      const driverName = publicText(lap.driverName);
      if (!driverName || seconds === null || seconds <= 0) continue;
      const session = publicText(lap.session, fallbackSession || "—");
      const key = `${session}\u0000${driverName}`;
      const previous = bestByDriverAndSession.get(key);
      if (!previous || seconds < previous.seconds) {
        bestByDriverAndSession.set(key, {
          session,
          driverName,
          car: publicText(lap.vehicleName, "") || null,
          seconds,
          observedLaps: finiteNumber(lap.totalLaps),
        });
      }
    }
  }

  const entries = [...bestByDriverAndSession.values()]
    .sort((a, b) => a.seconds - b.seconds || a.driverName.localeCompare(b.driverName))
    .map((entry) => ({
      session: sessionLabel(entry.session),
      driverName: entry.driverName,
      car: entry.car,
      bestLap: formatLapTime(entry.seconds),
      observedLaps: entry.observedLaps,
    }));

  return entries.length > 0
    ? {
        available: true,
        message: "Records extraits de l’historique des tours.",
        entries,
      }
    : {
        available: false,
        message: "Aucun Record exploitable n’est disponible pour cette session.",
        entries: [],
      };
}

function buildStandings(vehicles) {
  const valid = vehicles
    .filter((vehicle) => vehicle && typeof vehicle === "object")
    .filter((vehicle) => publicText(vehicle.driverName) && (finiteNumber(vehicle.position) ?? 0) > 0)
    .sort((a, b) => (finiteNumber(a.position) ?? 0) - (finiteNumber(b.position) ?? 0));

  const bestLap = valid.reduce((best, vehicle) => {
    const lap = finiteNumber(vehicle.bestLapTime);
    return lap !== null && lap > 0 && lap < best ? lap : best;
  }, Number.POSITIVE_INFINITY);

  return valid.map((vehicle) => {
    const position = finiteNumber(vehicle.position) ?? 0;
    const qualification = finiteNumber(vehicle.qualification) ?? position;
    return {
      position,
      prevPosition: qualification > 0 ? qualification : position,
      driverName: publicText(vehicle.driverName, "Pilote"),
      team: publicText(vehicle.fullTeamName, ""),
      car: publicText(vehicle.vehicleName, "Inconnue"),
      carNumber: publicText(vehicle.carNumber, ""),
      carClass: publicText(vehicle.carClass, "Inconnue"),
      laps: finiteNumber(vehicle.lapsCompleted) ?? 0,
      gapToLeader: formatGap(
        vehicle.timeBehindLeader,
        vehicle.lapsBehindLeader,
        position === 1,
      ),
      gapToNext: formatGap(
        vehicle.timeBehindNext,
        vehicle.lapsBehindNext,
        position === 1,
      ),
      bestLap: formatLapTime(vehicle.bestLapTime),
      lastLap: formatLapTime(vehicle.lastLapTime),
      sector1: formatLapTime(vehicle.bestSectorTime1),
      sector2: formatLapTime(vehicle.bestSectorTime2),
      sector3: "—",
      inPit: vehicle.pitting === true || vehicle.pitState === "STOPPED",
      status: mapStatus(vehicle),
      pitStops: finiteNumber(vehicle.pitstops) ?? 0,
      isPole: (finiteNumber(vehicle.bestLapTime) ?? -1) === bestLap,
      penalties: finiteNumber(vehicle.penalties) ?? 0,
    };
  });
}

function selectionTrackName(selection) {
  const track = selection && typeof selection === "object" ? selection.track : null;
  if (!track || typeof track !== "object") return "";
  return publicText(track.name) || publicText(track.shortName);
}

function buildData(sourceId, session, vehicles, history, fetchedAt, selection) {
  const sessionCode = publicText(session.session, "—");
  const standings = buildStandings(vehicles);
  const maxLaps = finiteNumber(session.maximumLaps);
  const currentEventTime = finiteNumber(session.currentEventTime);
  const endEventTime = finiteNumber(session.endEventTime);
  const inRealtime = session.inRealtime === true;

  const categorySet = new Set(standings.map((entry) => entry.carClass).filter(Boolean));
  const category =
    categorySet.size === 1
      ? [...categorySet][0]
      : categorySet.size > 1
        ? "Multi-classe"
        : "Inconnue";

  return {
    sourceId,
    fetchedAt,
    server: {
      id: sourceId,
      sourceId,
      name: publicText(session.serverName, "Serveur rFactor 2"),
      circuit: publicText(session.trackName) || selectionTrackName(selection) || "Inconnu",
      category,
      weather: mapWeather(session),
      driversCount: standings.length,
      maxDrivers: finiteNumber(session.maxPlayers) ?? 0,
      currentSession: sessionLabel(sessionCode),
      timeRemaining:
        inRealtime && currentEventTime !== null && endEventTime !== null
          ? formatDuration(Math.max(0, endEventTime - currentEventTime))
          : "—",
      totalSessionTime:
        currentEventTime !== null && endEventTime !== null
          ? formatDuration(Math.max(0, endEventTime - (finiteNumber(session.startEventTime) ?? 0)))
          : "—",
      lapsCompleted: standings.reduce((max, entry) => Math.max(max, entry.laps), 0),
      totalLaps: maxLaps === INT32_MAX ? 0 : maxLaps ?? 0,
      status: "online",
    },
    session: {
      phase: sessionPhase(sessionCode),
      sessionCode,
      inRealtime,
      serverTime: formatDuration(currentEventTime),
      trackTemp: finiteNumber(session.trackTemp) ?? 0,
      airTemp: finiteNumber(session.ambientTemp) ?? 0,
      flags: mapFlags(session),
      elapsedTime: formatDuration(currentEventTime),
    },
    standings,
    records: buildRecords(history, sessionCode),
    tyres: buildTyres(vehicles),
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

export async function collectLiveTiming(sourceId, options = {}) {
  const registry = options.registry ?? SOURCE_REGISTRY;
  const source = registry[sourceId];
  if (!source) throw new Error("unknown_source");

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? (() => new Date().toISOString());

  const sessionResult = await requestJson(
    `${source.baseUrl}/rest/watch/sessionInfo`,
    { fetchImpl, timeoutMs },
  );
  if (!sessionResult.ok || !sessionResult.body || typeof sessionResult.body !== "object") {
    return { ok: false, sourceId, status: "error", error: SOURCE_TIMEOUT_ERROR };
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
    data: buildData(
      sourceId,
      sessionResult.body,
      standingsResult.body,
      history,
      now(),
      selection,
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

export function createPublicLiveTimingHandler(options = {}) {
  return async function publicLiveTimingHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname.replace(/\/$/, "") || "/";
    const prefix = "/api/public/live-timing/";

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
      const result = await collectLiveTiming(sourceId, options);
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

export function createLiveTimingServer(options = {}) {
  const handler = createPublicLiveTimingHandler(options);
  return http.createServer(handler);
}
