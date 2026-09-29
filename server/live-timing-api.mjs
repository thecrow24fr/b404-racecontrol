import http from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createTrackGeometryProvider } from "./track-geometry.mjs";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MANAGER_BASE_URL = "http://127.0.0.1:4000";
const MANAGER_STATUS_PATH = "/api/view/servers/20";
const WEATHER_CLIENT_IMAGE = "rf2WeatherClient.exe";
const WEATHER_CLIENT_VM_SUFFIX = "_vm";
const INT32_MAX = 2147483647;
const STREAM_INTERVAL_MS = 500;
const execFileAsync = promisify(execFile);

/**
 * Explicit public source registry. The browser never receives these origins.
 */
export const SOURCE_REGISTRY = Object.freeze({
  s1_vm: Object.freeze({
    sourceId: "s1_vm",
    serverNumber: 1,
    label: "Serveur 1 — VM",
    description: "Source rFactor 2 de la VM",
    baseUrl: "http://127.0.0.1:5414",
  }),
  // S20 REST is reachable only on the internal WebUI port; this origin never
  // leaves the backend and is never exposed to the browser.
  s20_vm: Object.freeze({
    sourceId: "s20_vm",
    serverNumber: 20,
    label: "Serveur 20 — Entraînement",
    description: "Source rFactor 2 d’entraînement",
    baseUrl: "http://127.0.0.1:5354",
    managerDetailPath: MANAGER_STATUS_PATH,
    managerProfile: "Serveur 20",
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

export function parseWeatherClientTasklist(output) {
  const expected = WEATHER_CLIENT_IMAGE.toLowerCase();
  return String(output ?? "").split(/\r?\n/).some((line) => {
    const imageName = line.split(",", 1)[0]?.trim().replace(/^"|"$/g, "");
    return imageName?.toLowerCase() === expected;
  });
}

async function defaultWeatherClientProbe() {
  if (process.platform !== "win32") return false;

  try {
    const { stdout } = await execFileAsync(
      "tasklist.exe",
      ["/FI", `IMAGENAME eq ${WEATHER_CLIENT_IMAGE}`, "/FO", "CSV", "/NH"],
      { timeout: 1500, windowsHide: true, maxBuffer: 64 * 1024 },
    );
    return parseWeatherClientTasklist(stdout);
  } catch {
    return false;
  }
}

async function detectWeatherClient(sourceId, { probe = defaultWeatherClientProbe } = {}) {
  if (
    typeof sourceId !== "string" ||
    !sourceId.endsWith(WEATHER_CLIENT_VM_SUFFIX) ||
    typeof probe !== "function"
  ) {
    return null;
  }

  try {
    return (await probe()) ? "launched" : null;
  } catch {
    return null;
  }
}

function formatServerUptime(value) {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds < 0) return null;

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainder = totalSeconds % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${remainder}s`);
  return parts.join(" ");
}

function managerBaseUrl(options = {}) {
  return (
    options.managerBaseUrl ??
    process.env.RACECONTROL_MANAGER_URL ??
    DEFAULT_MANAGER_BASE_URL
  ).replace(/\/$/, "");
}

function resolveCanonicalTrackTechnicalId(body) {
  const resolution = body?.card?.circuit_resolution;
  const technicalId = publicText(resolution?.technical_id);
  const candidateCount = finiteNumber(resolution?.candidate_count);
  const status = publicText(resolution?.status).toLowerCase();
  return technicalId && status === "matched" && candidateCount === 1
    ? technicalId
    : null;
}

function resolveCanonicalTrackLength(body) {
  const card = body?.card;
  const resolution = card?.circuit_resolution;
  const lengthKm = finiteNumber(card?.circuit_length_km);
  const candidateCount = finiteNumber(resolution?.candidate_count);
  const status = publicText(resolution?.status).toLowerCase();
  const source = publicText(resolution?.length_source || resolution?.source);

  if (
    lengthKm === null ||
    lengthKm <= 0 ||
    status !== "matched" ||
    candidateCount !== 1 ||
    !source
  ) {
    return null;
  }

  return {
    meters: lengthKm * 1000,
    source,
    technicalId: resolveCanonicalTrackTechnicalId(body),
  };
}

async function fetchManagerContext(source, { fetchImpl, timeoutMs, managerUrl }) {
  const managerDetailPath = source?.managerDetailPath;
  if (typeof managerDetailPath !== "string" || !managerDetailPath.startsWith("/api/view/servers/")) {
    return { serverUptime: null, trackLength: null, trackTechnicalId: null };
  }

  const result = await requestJson(`${managerUrl}${managerDetailPath}`, {
    fetchImpl,
    timeoutMs,
  });
  const body = result.ok && result.body && typeof result.body === "object"
    ? result.body
    : null;
  const health = body?.health;
  const profile = publicText(body?.card?.profile);
  const expectedProfile = publicText(source.managerProfile);
  const pid = finiteNumber(health?.pid);
  const uptime = finiteNumber(health?.uptime_s);
  const serverUptime =
    profile === expectedProfile &&
    pid !== null &&
    pid > 0 &&
    uptime !== null &&
    uptime >= 0
      ? formatServerUptime(uptime)
      : null;

  const canonicalTrackLength = profile === expectedProfile
    ? resolveCanonicalTrackLength(body)
    : null;
  return {
    serverUptime,
    trackLength: canonicalTrackLength,
    trackTechnicalId:
      profile === expectedProfile ? resolveCanonicalTrackTechnicalId(body) : null,
  };
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

/**
 * Les champs `currentEventTime` et `endEventTime` de sessionInfo rFactor 2
 * sont des secondes natives. Le DTO public les convertit une seule fois en
 * HH:MM:SS ; `durationFormat` permet aux clients de distinguer ce contrat
 * d'un ancien processus qui avait interprété ces secondes comme des minutes.
 */
export function formatRFactorDuration(value) {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds < 0) return "—";
  const totalSeconds = Math.floor(seconds + Number.EPSILON);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const wholeMinutes = Math.floor(remainingSeconds / 60);
  const wholeSeconds = remainingSeconds % 60;
  return [hours, wholeMinutes, wholeSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
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
  const rain = finiteNumber(session.raining);
  const clouds = finiteNumber(session.darkCloud);
  const wetness = finiteNumber(session.averagePathWetness);
  const windMs = finiteNumber(session.windSpeed?.velocity);
  let condition = "Non disponible";
  if (rain !== null || clouds !== null) {
    const rainValue = rain ?? 0;
    const cloudValue = clouds ?? 0;
    condition = "Dégagé";
    if (rainValue >= 0.7) condition = "Pluie forte";
    else if (rainValue >= 0.3) condition = "Pluie modérée";
    else if (rainValue >= 0.05) condition = "Bruine";
    else if (cloudValue >= 0.7) condition = "Couvert";
    else if (cloudValue >= 0.3) condition = "Partiellement nuageux";
  }

  return {
    condition,
    temperature: finiteNumber(session.ambientTemp),
    windSpeed: windMs === null ? null : Math.round(windMs * 3.6),
    rainPercent:
      rain === null
        ? null
        : Math.round(Math.max(0, Math.min(1, rain)) * 100),
    trackCondition:
      wetness === null
        ? "unknown"
        : wetness >= 0.5
          ? "wet"
          : wetness >= 0.1
            ? "damp"
            : "dry",
  };
}

function normalizedFlagState(value) {
  const raw = value && typeof value === "object"
    ? value.flag ?? value.state ?? value.type
    : value;
  return publicText(raw).toUpperCase().replace(/[\\s-]+/g, "_");
}

function isConfirmedYellow(value) {
  const state = normalizedFlagState(value);
  return state === "YELLOW" || state === "YELLOW_FLAG" || state === "YELLOWFLAG";
}

function mapFlags(session) {
  const sectorFlags = Array.isArray(session.sectorFlag) ? session.sectorFlag : [];
  const yellowSectors = sectorFlags
    .slice(0, 3)
    .map((value, index) => isConfirmedYellow(value) ? index + 1 : null)
    .filter((sector) => sector !== null);
  if (yellowSectors.length > 0) {
    return yellowSectors.map((sector) => ({ type: "yellow", sector }));
  }

  const state = normalizedFlagState(session.yellowFlagState);
  if (!state) return [];
  if (state !== "NONE" && state !== "INVALID") {
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

function publicParticipantId(vehicle) {
  const slotId = finiteNumber(vehicle?.slotID);
  const driverName = publicText(vehicle?.driverName, "Pilote");
  const carNumber = publicText(vehicle?.carNumber, "");
  const identity = slotId !== null
    ? `slot:${Math.trunc(slotId)}`
    : `driver:${driverName}|car:${carNumber}`;

  let hash = 2166136261;
  for (const character of identity) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `p${(hash >>> 0).toString(36).padStart(7, "0")}`;
}

function buildStandings(vehicles, trackDistance) {
  const valid = vehicles
    .filter((vehicle) => vehicle && typeof vehicle === "object")
    .filter((vehicle) => publicText(vehicle.driverName) && (finiteNumber(vehicle.position) ?? 0) > 0)
    .sort((a, b) => (finiteNumber(a.position) ?? 0) - (finiteNumber(b.position) ?? 0));

  const bestLap = valid.reduce((best, vehicle) => {
    const lap = finiteNumber(vehicle.bestLapTime);
    return lap !== null && lap > 0 && lap < best ? lap : best;
  }, Number.POSITIVE_INFINITY);

  const mapped = valid.map((vehicle) => {
    const position = finiteNumber(vehicle.position) ?? 0;
    const qualification = finiteNumber(vehicle.qualification) ?? position;
    const lapDistance = finiteNumber(vehicle.lapDistance);
    const lapProgress =
      trackDistance !== null && trackDistance > 0 && lapDistance !== null
        ? Math.max(0, Math.min(1, lapDistance / trackDistance))
        : null;
    const startingPosition = qualification > 0 ? qualification : position;
    return {
      position,
      participantId: publicParticipantId(vehicle),
      startingPosition,
      prevPosition: startingPosition,
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
      timeBehindNext: finiteNumber(vehicle.timeBehindNext),
      nextParticipantId: null,
      bestLap: formatLapTime(vehicle.bestLapTime),
      lastLap: formatLapTime(vehicle.lastLapTime),
      sector1: formatLapTime(vehicle.bestSectorTime1),
      sector2: formatLapTime(vehicle.bestSectorTime2),
      sector3: null,
      inPit: vehicle.pitting === true || vehicle.pitState === "STOPPED",
      underYellow:
        typeof vehicle.underYellow === "boolean"
          ? vehicle.underYellow
          : isConfirmedYellow(vehicle.flag)
            ? true
            : null,
      status: mapStatus(vehicle),
      pitStops: finiteNumber(vehicle.pitstops) ?? 0,
      isPole: (finiteNumber(vehicle.bestLapTime) ?? -1) === bestLap,
      fuelFraction: finiteNumber(vehicle.fuelFraction),
      lapDistance,
      lapProgress,
      penalties: finiteNumber(vehicle.penalties) ?? 0,
    };
  });

  const participantIdByPosition = new Map(
    mapped.map((entry) => [entry.position, entry.participantId]),
  );
  return mapped.map((entry) => ({
    ...entry,
    nextParticipantId: participantIdByPosition.get(entry.position - 1) ?? null,
  }));
}

function selectionTrackName(selection) {
  const track = selection && typeof selection === "object" ? selection.track : null;
  if (!track || typeof track !== "object") return "";
  return publicText(track.name) || publicText(track.shortName);
}

function buildData(
  sourceId,
  session,
  vehicles,
  history,
  fetchedAt,
  selection,
  serverUptime,
  weatherClientStatus,
  canonicalTrackLength,
  trackTechnicalId,
) {
  const sessionCode = publicText(session.session, "—");
  const trackDistance = finiteNumber(session.lapDistance);
  const standings = buildStandings(vehicles, trackDistance);
  const maxLaps = finiteNumber(session.maximumLaps);
  const currentEventTime = finiteNumber(session.currentEventTime);
  const endEventTime = finiteNumber(session.endEventTime);
  const inRealtime = session.inRealtime === true;
  const sessionTimeRemaining =
    currentEventTime !== null && endEventTime !== null
      ? Math.max(0, endEventTime - currentEventTime)
      : null;

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
    durationFormat: "rFactor2-seconds-v1",
    server: {
      id: sourceId,
      sourceId,
      name: publicText(session.serverName, "Serveur rFactor 2"),
      circuit: publicText(session.trackName) || selectionTrackName(selection) || "Inconnu",
      category,
      weather: mapWeather(session),
      driversCount: standings.length,
      maxDrivers: finiteNumber(session.maxPlayers),
      currentSession: sessionLabel(sessionCode),
      timeRemaining:
        sessionTimeRemaining === null ? "—" : formatRFactorDuration(sessionTimeRemaining),
      totalSessionTime:
        endEventTime === null ? "—" : formatRFactorDuration(Math.max(0, endEventTime)),
      lapsCompleted: standings.reduce((max, entry) => Math.max(max, entry.laps), 0),
      totalLaps: maxLaps === INT32_MAX ? null : maxLaps,
      trackLength: canonicalTrackLength?.meters ?? null,
      trackLengthSource: canonicalTrackLength?.source ?? null,
      trackTechnicalId: trackTechnicalId ?? canonicalTrackLength?.technicalId ?? null,
      lapDistance: trackDistance,
      status: "online",
    },
    session: {
      phase: sessionPhase(sessionCode),
      sessionCode,
      inRealtime,
      serverUptime: serverUptime ?? null,
      weatherClientStatus: weatherClientStatus ?? null,
      serverTime:
        currentEventTime === null ? "—" : formatRFactorDuration(currentEventTime),
      trackTemp: finiteNumber(session.trackTemp),
      airTemp: finiteNumber(session.ambientTemp),
      flags: mapFlags(session),
      sessionTimeRemaining:
        sessionTimeRemaining === null ? "—" : formatRFactorDuration(sessionTimeRemaining),
      elapsedTime:
        sessionTimeRemaining === null ? "—" : formatRFactorDuration(sessionTimeRemaining),
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

  const historyResult = options.includeHistory === false
    ? null
    : await requestJson(
        `${source.baseUrl}/rest/watch/standings/history`,
        { fetchImpl, timeoutMs },
      );
  const history = historyResult?.ok ? historyResult.body : null;
  const managerContext = await fetchManagerContext(source, {
    fetchImpl,
    timeoutMs,
    managerUrl: managerBaseUrl(options),
  });
  const weatherClientStatus = await detectWeatherClient(sourceId, {
    probe: options.weatherClientProbe,
  });

  return {
    ok: true,
    data: buildData(
      sourceId,
      sessionResult.body,
      standingsResult.body,
      history,
      now(),
      selection,
      managerContext.serverUptime,
      weatherClientStatus,
      managerContext.trackLength,
      managerContext.trackTechnicalId,
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

function sourceServerNumber(source) {
  const configured = finiteNumber(source.serverNumber);
  if (configured !== null && configured >= 0) {
    return String(Math.trunc(configured));
  }
  const match = /^s(\d+)/i.exec(source.sourceId ?? "");
  return match?.[1] ?? source.sourceId;
}

async function sourceDescriptor(source, { fetchImpl, timeoutMs }) {
  let circuit = null;
  if (typeof fetchImpl === "function") {
    const [sessionResult, selectionResult] = await Promise.all([
      requestJson(`${source.baseUrl}/rest/watch/sessionInfo`, {
        fetchImpl,
        timeoutMs,
      }),
      requestJson(`${source.baseUrl}/rest/race/selection`, {
        fetchImpl,
        timeoutMs,
      }),
    ]);
    const session =
      sessionResult.ok && sessionResult.body && typeof sessionResult.body === "object"
        ? sessionResult.body
        : null;
    const selection =
      selectionResult.ok && selectionResult.body && typeof selectionResult.body === "object"
        ? selectionResult.body
        : null;
    circuit = publicText(session?.trackName) || selectionTrackName(selection) || null;
  }

  const serverNumber = sourceServerNumber(source);
  return {
    sourceId: source.sourceId,
    serverNumber,
    circuit,
    // Le circuit vient exclusivement de sessionInfo/selection. Le Dedicated
    // Game (serverName, par exemple #B404) ne sert jamais à nommer l’option.
    label: `Serveur ${serverNumber} — ${circuit ?? "Circuit indisponible"}`,
    description: source.description ?? "Source Live Timing configurée",
  };
}

async function sourceDescriptors(registry, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return Promise.all(
    Object.values(registry).map((source) =>
      sourceDescriptor(source, { fetchImpl, timeoutMs }),
    ),
  );
}

function writeSse(response, event, payload, sequence) {
  const id = sequence === undefined ? "" : `id: ${sequence}\n`;
  response.write(`${id}event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export class LiveTimingStreamHub {
  constructor({ collect, registry, intervalMs = STREAM_INTERVAL_MS }) {
    this.collect = collect;
    this.registry = registry;
    this.intervalMs = Number.isFinite(intervalMs)
      ? Math.max(0, intervalMs)
      : STREAM_INTERVAL_MS;
    this.states = new Map();
  }

  stateFor(sourceId) {
    let state = this.states.get(sourceId);
    if (!state) {
      state = {
        sourceId,
        clients: new Set(),
        timer: null,
        running: false,
        sequence: 0,
        lastEvent: null,
      };
      this.states.set(sourceId, state);
    }
    return state;
  }

  subscribe(sourceId, response) {
    const state = this.stateFor(sourceId);
    state.clients.add(response);

    if (state.lastEvent) {
      try {
        writeSse(
          response,
          state.lastEvent.event,
          state.lastEvent.payload,
          state.lastEvent.sequence,
        );
      } catch {
        state.clients.delete(response);
      }
    }

    if (!state.running) {
      state.running = true;
      void this.pump(state);
    }

    return () => this.unsubscribe(state, response);
  }

  unsubscribe(state, response) {
    state.clients.delete(response);
    if (state.clients.size === 0 && state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
      state.running = false;
    }
  }

  broadcast(state, event, payload) {
    state.sequence += 1;
    state.lastEvent = { event, payload, sequence: state.sequence };
    for (const response of [...state.clients]) {
      try {
        writeSse(response, event, payload, state.sequence);
      } catch {
        this.unsubscribe(state, response);
      }
    }
  }

  async pump(state) {
    if (state.clients.size === 0) {
      state.running = false;
      return;
    }

    const startedAt = Date.now();
    try {
      const result = await this.collect(state.sourceId);
      if (result.ok) {
        this.broadcast(state, "snapshot", {
          success: true,
          sourceId: state.sourceId,
          transport: "sse",
          data: result.data,
        });
      } else {
        this.broadcast(state, "status", {
          success: false,
          sourceId: state.sourceId,
          sourceStatus: result.status,
          error: result.error,
        });
      }
    } catch {
      this.broadcast(state, "status", {
        success: false,
        sourceId: state.sourceId,
        sourceStatus: "error",
        error: "adapter_failure",
      });
    }

    if (state.clients.size === 0) {
      state.running = false;
      return;
    }

    const delay = Math.max(0, this.intervalMs - (Date.now() - startedAt));
    state.timer = setTimeout(() => {
      state.timer = null;
      void this.pump(state);
    }, delay);
  }
}

export function createPublicLiveTimingHandler(options = {}) {
  const registry = options.registry ?? SOURCE_REGISTRY;
  const collect = options.collector ?? ((sourceId, collectOptions = {}) =>
    collectLiveTiming(sourceId, {
      ...options,
      ...collectOptions,
      registry,
    }));
  const geometryProvider = options.geometryProvider ?? createTrackGeometryProvider({
    registry,
    managerBaseUrl: managerBaseUrl(options),
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  const streamHub = options.streamHub ?? new LiveTimingStreamHub({
    collect: (sourceId) => collect(sourceId, { includeHistory: false }),
    registry,
  });

  return async function publicLiveTimingHandler(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname.replace(/\/$/, "") || "/";
    const basePath = "/api/public/live-timing";
    const prefix = `${basePath}/`;

    if (pathname === `${basePath}/sources`) {
      if (request.method !== "GET" || requestUrl.search) {
        writeJson(response, 405, { success: false, error: "method_not_allowed" });
        return;
      }
      writeJson(response, 200, {
        success: true,
        sources: await sourceDescriptors(registry, {
          fetchImpl: options.fetchImpl ?? globalThis.fetch,
          timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        }),
      });
      return;
    }

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

    const relativePath = pathname.slice(prefix.length);
    const [sourceId, resource = ""] = relativePath.split("/");
    const isStream = resource === "stream";
    const isGeometry = resource === "track-geometry";
    if (!Object.prototype.hasOwnProperty.call(registry, sourceId)) {
      writeJson(response, 404, { success: false, error: "unknown_source" });
      return;
    }
    if (!isStream && !isGeometry && resource !== "") {
      writeJson(response, 404, { success: false, error: "not_found" });
      return;
    }

    if (isGeometry) {
      try {
        const geometry = await geometryProvider.getForSource(sourceId, {
          fetchImpl: options.fetchImpl ?? globalThis.fetch,
          sourceRegistry: registry,
          managerUrl: managerBaseUrl(options),
          requestTimeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        });
        writeJson(response, 200, {
          success: true,
          sourceId,
          technicalId: geometry?.technicalId ?? null,
          geometry,
        });
      } catch {
        writeJson(response, 200, {
          success: true,
          sourceId,
          technicalId: null,
          geometry: null,
        });
      }
      return;
    }

    if (isStream) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      response.write(": RaceControl Live Timing SSE\n\n");
      const unsubscribe = streamHub.subscribe(sourceId, response);
      const close = () => unsubscribe();
      request.once("close", close);
      response.once("close", close);
      return;
    }

    try {
      const result = await collect(sourceId);
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
