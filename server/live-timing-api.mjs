import http from "node:http";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createTrackGeometryProvider } from "./track-geometry.mjs";
import { createTyreHistoryStore } from "./live-tyre-history.mjs";

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MANAGER_BASE_URL = "http://127.0.0.1:4000";
const MANAGER_STATUS_PATH = "/api/view/servers/20";
const WEATHER_CLIENT_IMAGE = "rf2WeatherClient.exe";
const WEATHER_CLIENT_VM_SUFFIX = "_vm";
const INT32_MAX = 2147483647;
const STREAM_INTERVAL_MS = 500;
const RF2_SHARED_MEMORY_READER_PATH = fileURLToPath(new URL("./rf2-shared-memory-reader.py", import.meta.url));
const RF2_SHARED_MEMORY_TIMEOUT_MS = 1500;
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

/**
 * rFactor 2 exposes lastSectorTime1 and lastSectorTime2 as cumulative lap
 * endpoints. Convert those endpoints to individual sector durations only when
 * the completed-lap bounds are coherent; otherwise keep the affected value
 * unavailable instead of displaying a negative or cumulative duration.
 */
function deriveLastSectorTimes(vehicle) {
  const lastLapTime = finiteNumber(vehicle.lastLapTime);
  const sector1End = finiteNumber(vehicle.lastSectorTime1);
  const sector2End = finiteNumber(vehicle.lastSectorTime2);
  const lapsCompleted = finiteNumber(vehicle.lapsCompleted);
  const hasLastLap = lastLapTime !== null && lastLapTime > 0;
  const hasCompletedLap = hasLastLap && lapsCompleted !== null && lapsCompleted >= 1;
  const hasUsableSector1End = sector1End !== null && sector1End > 0;
  const sector1 = hasLastLap && hasUsableSector1End && sector1End < lastLapTime
    ? sector1End
    : null;
  const hasCoherentSector2 =
    sector1 !== null
    && sector2End !== null
    && sector2End > sector1
    && sector2End < lastLapTime;
  const sector2 = hasCoherentSector2 ? sector2End - sector1 : null;
  const hasCoherentSector2End =
    sector2End !== null
    && sector2End > 0
    && hasLastLap
    && sector2End < lastLapTime
    && (!hasUsableSector1End || sector2End > sector1End);
  const sector3 = hasCompletedLap && hasCoherentSector2End
    ? lastLapTime - sector2End
    : null;

  return { sector1, sector2, sector3 };
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

function activeHistoryTiming(history, vehicle) {
  if (!history || typeof history !== "object" || Array.isArray(history)) return null;
  const slotId = finiteNumber(vehicle?.slotID);
  if (slotId === null || !Number.isInteger(slotId)) return null;
  const series = history[String(Math.trunc(slotId))];
  if (!Array.isArray(series)) return null;

  const completed = series
    .filter((lap) => lap && typeof lap === "object")
    .filter((lap) => finiteNumber(lap.slotID) === Math.trunc(slotId))
    .map((lap) => ({ lap, seconds: finiteNumber(lap.lapTime) }))
    .filter(({ seconds }) => seconds !== null && seconds > 0);
  if (completed.length === 0) return null;

  const latest = completed.at(-1);
  const best = completed.reduce((fastest, candidate) =>
    candidate.seconds < fastest.seconds ? candidate : fastest,
  );
  return {
    bestLapTime: best.seconds,
    lastLapTime: latest.seconds,
    lastSectorTime1: finiteNumber(latest.lap.sectorTime1),
    lastSectorTime2: finiteNumber(latest.lap.sectorTime2),
  };
}

function enrichActiveVehiclesWithHistory(vehicles, history) {
  return vehicles.map((vehicle) => {
    if (!vehicle || typeof vehicle !== "object") return vehicle;
    const timing = activeHistoryTiming(history, vehicle);
    if (!timing) return vehicle;
    const nativeLastLap = finiteNumber(vehicle.lastLapTime);
    const primaryLastLapIsValid = nativeLastLap !== null && nativeLastLap > 0;
    const nativeBestLap = finiteNumber(vehicle.bestLapTime);
    return {
      ...vehicle,
      bestLapTime: nativeBestLap !== null && nativeBestLap > 0 ? nativeBestLap : timing.bestLapTime,
      ...(primaryLastLapIsValid ? {} : {
        lastLapTime: timing.lastLapTime,
        lastSectorTime1: timing.lastSectorTime1,
        lastSectorTime2: timing.lastSectorTime2,
      }),
    };
  });
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

function nativeVelocityMetersPerSecond(vehicle) {
  // /rest/watch/standings fournit la magnitude native carVelocity.velocity.
  // Le vecteur rFactor 2 Velocity est documenté en mètres par seconde.
  const velocity = finiteNumber(vehicle?.carVelocity?.velocity);
  return velocity !== null && velocity >= 0 ? velocity : null;
}

function vmaxSessionState(cache, sourceId, sessionCode) {
  const current = cache.get(sourceId);
  if (current?.sessionCode === sessionCode) return current;
  const next = { sessionCode, maxSpeedMsByParticipantId: new Map() };
  cache.set(sourceId, next);
  return next;
}

function rememberSessionVmax(state, vehicles) {
  for (const vehicle of vehicles) {
    const velocity = nativeVelocityMetersPerSecond(vehicle);
    if (velocity === null) continue;
    const participantId = publicParticipantId(vehicle);
    const current = state.maxSpeedMsByParticipantId.get(participantId);
    if (current === undefined || velocity > current) {
      state.maxSpeedMsByParticipantId.set(participantId, velocity);
    }
  }
  return state.maxSpeedMsByParticipantId;
}

function nativeFuelFraction(vehicle) {
  const fraction = finiteNumber(vehicle?.fuelFraction);
  return fraction !== null && fraction >= 0 && fraction <= 1 ? fraction : null;
}

function normalizedIdentity(value) {
  return publicText(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("fr");
}

function sameIdentity(left, right) {
  const normalizedLeft = normalizedIdentity(left);
  const normalizedRight = normalizedIdentity(right);
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

function nativeFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  return finiteNumber(value);
}

function validNativeFuel(value) {
  const number = nativeFiniteNumber(value);
  return number !== null && number >= 0 ? number : null;
}

function validNativeWearPercent(value) {
  const fraction = nativeFiniteNumber(value);
  if (fraction === null || fraction < 0 || fraction > 1) return null;
  return Math.round(fraction * 1000) / 10;
}

function unavailableNativeVehicleMeasurements() {
  return {
    fuelLiters: null,
    fuelCapacityLiters: null,
    fuelFraction: null,
    frontTyreCompound: null,
    rearTyreCompound: null,
    wearFrontLeft: null,
    wearFrontRight: null,
    wearRearLeft: null,
    wearRearRight: null,
  };
}

/**
 * Enriches only existing Watch standings vehicles. A measure is accepted only
 * after an exact native slot and independent Scoring identity match.
 */
export function enrichActiveVehiclesWithSharedMemory(vehicles, snapshot) {
  const unavailable = unavailableNativeVehicleMeasurements();
  if (!snapshot?.stable || !Array.isArray(snapshot.vehicles)) {
    return vehicles.map((vehicle) => ({ ...vehicle, sharedMemoryTelemetryExpected: true, ...unavailable }));
  }

  const bySlot = new Map();
  const duplicateSlots = new Set();
  for (const measurement of snapshot.vehicles) {
    const slotID = finiteNumber(measurement?.slotID);
    if (slotID === null || !Number.isInteger(slotID)) continue;
    const slot = Math.trunc(slotID);
    if (bySlot.has(slot)) duplicateSlots.add(slot);
    else bySlot.set(slot, measurement);
  }

  return vehicles.map((vehicle) => {
    const slotID = finiteNumber(vehicle?.slotID);
    if (slotID === null || !Number.isInteger(slotID)) {
      return { ...vehicle, sharedMemoryTelemetryExpected: true, ...unavailable };
    }
    const measurement = bySlot.get(Math.trunc(slotID));
    if (
      !measurement ||
      duplicateSlots.has(Math.trunc(slotID)) ||
      !sameIdentity(vehicle.driverName, measurement.driverName) ||
      !sameIdentity(vehicle.vehicleName, measurement.vehicleName) ||
      !sameIdentity(vehicle.carClass, measurement.carClass) ||
      (typeof vehicle.player === "boolean" && typeof measurement.player === "boolean" && vehicle.player !== measurement.player)
    ) {
      return { ...vehicle, sharedMemoryTelemetryExpected: true, ...unavailable };
    }

    const fuelLiters = validNativeFuel(measurement.fuelLiters);
    const fuelCapacityLiters = validNativeFuel(measurement.fuelCapacityLiters);
    const fuelFraction =
      fuelLiters !== null && fuelCapacityLiters !== null && fuelCapacityLiters > 0 && fuelLiters <= fuelCapacityLiters
        ? fuelLiters / fuelCapacityLiters
        : null;
    const wear = Array.isArray(measurement.wheelWearFractions) && measurement.wheelWearFractions.length === 4
      ? measurement.wheelWearFractions.map(validNativeWearPercent)
      : [null, null, null, null];

    const control = finiteNumber(measurement.control);
    const nativeDriverType = control === 1
      ? "ai"
      : control === 0 || control === 2
        ? "human"
        : null;
    return {
      ...vehicle,
      ...(nativeDriverType === null ? {} : { driverType: nativeDriverType }),
      sharedMemoryTelemetryExpected: true,
      fuelLiters,
      fuelCapacityLiters,
      fuelFraction,
      frontTyreCompound: publicText(measurement.frontTyreCompound) || null,
      rearTyreCompound: publicText(measurement.rearTyreCompound) || null,
      wearFrontLeft: wear[0],
      wearFrontRight: wear[1],
      wearRearLeft: wear[2],
      wearRearRight: wear[3],
    };
  });
}

function sharedMemoryFallbackStandings(snapshot, expectedVehicleCount) {
  const expected = finiteNumber(expectedVehicleCount);
  if (
    snapshot?.stable !== true ||
    !Number.isInteger(expected) ||
    expected < 1 ||
    snapshot.scoringVehicleCount !== expected ||
    snapshot.telemetryVehicleCount !== expected ||
    snapshot.matchedVehicleCount !== expected ||
    !Array.isArray(snapshot.vehicles) ||
    snapshot.vehicles.length !== expected
  ) return null;

  const slots = new Set();
  const positions = new Set();
  const verified = [];
  for (const vehicle of snapshot.vehicles) {
    const slotID = finiteNumber(vehicle?.slotID);
    const mID = finiteNumber(vehicle?.mID);
    const position = finiteNumber(vehicle?.position);
    const control = finiteNumber(vehicle?.control);
    const driverName = publicText(vehicle?.driverName);
    const vehicleName = publicText(vehicle?.vehicleName);
    const carClass = publicText(vehicle?.carClass);
    if (
      slotID === null || !Number.isInteger(slotID) ||
      mID === null || !Number.isInteger(mID) || mID !== slotID ||
      position === null || !Number.isInteger(position) || position < 1 ||
      control === null || ![0, 1, 2].includes(control) ||
      !driverName || !vehicleName || !carClass ||
      slots.has(slotID) || positions.has(position)
    ) return null;
    slots.add(slotID);
    positions.add(position);
    // InternalsPlugin.hpp: mControl 0=local player, 1=AI, 2=remote human.
    const driverType = control === 1 ? "ai" : "human";
    const wear = Array.isArray(vehicle.wheelWearFractions) && vehicle.wheelWearFractions.length === 4
      ? vehicle.wheelWearFractions.map(validNativeWearPercent)
      : [null, null, null, null];
    const fuelLiters = validNativeFuel(vehicle.fuelLiters);
    const fuelCapacityLiters = validNativeFuel(vehicle.fuelCapacityLiters);
    verified.push({
      ...vehicle,
      slotID,
      driverName,
      vehicleName,
      carClass,
      position,
      driverType,
      sharedMemoryTelemetryExpected: true,
      fuelFraction: fuelLiters !== null && fuelCapacityLiters !== null && fuelCapacityLiters > 0 && fuelLiters <= fuelCapacityLiters
        ? fuelLiters / fuelCapacityLiters
        : null,
      frontTyreCompound: publicText(vehicle.frontTyreCompound) || null,
      rearTyreCompound: publicText(vehicle.rearTyreCompound) || null,
      wearFrontLeft: wear[0],
      wearFrontRight: wear[1],
      wearRearLeft: wear[2],
      wearRearRight: wear[3],
    });
  }
  return verified.length > 0
    ? verified.sort((a, b) => a.position - b.position)
    : null;
}

function sharedMemoryFallbackIssue(snapshot, expectedVehicleCount) {
  if (!snapshot || typeof snapshot !== "object") {
    return "Lecture Shared Memory désactivée ou indisponible; aucun classement publié.";
  }
  if (snapshot.stable !== true) {
    return "Trame Shared Memory indisponible ou instable; aucun classement publié.";
  }
  const expected = finiteNumber(expectedVehicleCount);
  if (!Number.isInteger(expected) || expected < 1) {
    return "Nombre de véhicules attendu par Watch indisponible; aucun classement publié.";
  }
  const counts = [snapshot.scoringVehicleCount, snapshot.telemetryVehicleCount, snapshot.matchedVehicleCount];
  if (counts.some((count) => finiteNumber(count) !== expected)) {
    return `Comptages incohérents : Watch ${expected}, Scoring ${counts[0] ?? "N/D"}, Telemetry ${counts[1] ?? "N/D"}, correspondances ${counts[2] ?? "N/D"}; aucun classement publié.`;
  }
  if (!Array.isArray(snapshot.vehicles) || snapshot.vehicles.length !== expected) {
    return `Roster Shared Memory incomplet : ${Array.isArray(snapshot.vehicles) ? snapshot.vehicles.length : "liste absente"}/${expected}; aucun classement publié.`;
  }
  const slots = new Set();
  const positions = new Set();
  for (const vehicle of snapshot.vehicles) {
    const slotID = finiteNumber(vehicle?.slotID);
    const mID = finiteNumber(vehicle?.mID);
    const position = finiteNumber(vehicle?.position);
    const control = finiteNumber(vehicle?.control);
    if (slotID === null || !Number.isInteger(slotID) || mID === null || !Number.isInteger(mID) || mID !== slotID) {
      return "Association native slotID/mID non vérifiée; aucune ligne affichée.";
    }
    if (position === null || !Number.isInteger(position) || position < 1) {
      return "Position native absente ou invalide; aucune ligne affichée.";
    }
    if (control === null || ![0, 1, 2].includes(control)) {
      return "Type de participant inconnu (mControl absent/invalide); aucune ligne affichée.";
    }
    if (!publicText(vehicle?.driverName) || !publicText(vehicle?.vehicleName) || !publicText(vehicle?.carClass)) {
      return "Identité Scoring incomplète (pilote, voiture ou classe); aucune ligne affichée.";
    }
    if (slots.has(slotID)) return "slotID dupliqué; associations non vérifiées, aucune ligne affichée.";
    if (positions.has(position)) return "Positions natives dupliquées; classement non vérifié, aucune ligne affichée.";
    slots.add(slotID);
    positions.add(position);
  }
  return "Snapshot Shared Memory refusé pour une raison non classifiée; aucun classement publié.";
}

async function defaultSharedMemoryReader() {
  if (process.platform !== "win32") return { stable: false, vehicles: [] };
  try {
    const { stdout } = await execFileAsync(
      "python",
      [RF2_SHARED_MEMORY_READER_PATH],
      { timeout: RF2_SHARED_MEMORY_TIMEOUT_MS, windowsHide: true, maxBuffer: 256 * 1024 },
    );
    const payload = JSON.parse(stdout);
    return payload && typeof payload === "object" ? payload : { stable: false, vehicles: [] };
  } catch {
    return { stable: false, vehicles: [] };
  }
}

async function readSharedMemory(options) {
  const reader = typeof options.sharedMemoryReader === "function"
    ? options.sharedMemoryReader
    : options.enableNativeSharedMemory === true
      ? defaultSharedMemoryReader
      : null;
  if (!reader) return null;
  try {
    const snapshot = await reader();
    return snapshot && typeof snapshot === "object" ? snapshot : { stable: false, vehicles: [] };
  } catch {
    return { stable: false, vehicles: [] };
  }
}

function nativeVehicleMeasurements(vehicle) {
  if (vehicle?.sharedMemoryTelemetryExpected === true) {
    return {
      fuelLiters: validNativeFuel(vehicle.fuelLiters),
      fuelCapacityLiters: validNativeFuel(vehicle.fuelCapacityLiters),
      fuelFraction: (() => {
        const fraction = nativeFiniteNumber(vehicle.fuelFraction);
        return fraction !== null && fraction >= 0 && fraction <= 1 ? fraction : null;
      })(),
      frontTyreCompound: publicText(vehicle.frontTyreCompound) || null,
      rearTyreCompound: publicText(vehicle.rearTyreCompound) || null,
      wearFrontLeft: nativeFiniteNumber(vehicle.wearFrontLeft),
      wearFrontRight: nativeFiniteNumber(vehicle.wearFrontRight),
      wearRearLeft: nativeFiniteNumber(vehicle.wearRearLeft),
      wearRearRight: nativeFiniteNumber(vehicle.wearRearRight),
    };
  }
  return {
    fuelLiters: null,
    fuelCapacityLiters: null,
    fuelFraction: nativeFuelFraction(vehicle),
    frontTyreCompound: null,
    rearTyreCompound: null,
    wearFrontLeft: null,
    wearFrontRight: null,
    wearRearLeft: null,
    wearRearRight: null,
  };
}

function buildStandings(vehicles, trackDistance, maxSpeedMsByParticipantId = null, tyreHistoryStore = null, tyreHistorySessionKey = null, sessionSeconds = null) {
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
    const qualification = finiteNumber(vehicle.qualification);
    const lapDistance = finiteNumber(vehicle.lapDistance);
    const lapProgress =
      trackDistance !== null && trackDistance > 0 && lapDistance !== null
        ? Math.max(0, Math.min(1, lapDistance / trackDistance))
        : null;
    const startingPosition = qualification !== null && qualification > 0
      ? qualification
      : null;
    const lastSectorTimes = deriveLastSectorTimes(vehicle);
    const participantId = publicParticipantId(vehicle);
    const vehicleMeasurements = nativeVehicleMeasurements(vehicle);
    const maxSpeedMs = maxSpeedMsByParticipantId?.get(participantId);
    const maxSpeedKmh =
      typeof maxSpeedMs === "number" && Number.isFinite(maxSpeedMs) && maxSpeedMs >= 0
        ? maxSpeedMs * 3.6
        : null;
    return {
      position,
      participantId,
      startingPosition,
      prevPosition: startingPosition ?? position,
      driverName: publicText(vehicle.driverName, "Pilote"),
      driverType: vehicle.driverType === "ai" ? "ai" : vehicle.driverType === "human" ? "human" : undefined,
      team: publicText(vehicle.fullTeamName, ""),
      car: publicText(vehicle.vehicleName, "Inconnue"),
      carNumber: publicText(vehicle.carNumber, ""),
      carClass: publicText(vehicle.carClass, "") || null,
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
      maxSpeedKmh,
      sector1: formatLapTime(lastSectorTimes.sector1),
      sector2: formatLapTime(lastSectorTimes.sector2),
      sector3: lastSectorTimes.sector3 === null ? null : formatLapTime(lastSectorTimes.sector3),
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
      ...vehicleMeasurements,
      tyreHistory: null,
      lapDistance,
      lapProgress,
      penalties: finiteNumber(vehicle.penalties) ?? 0,
    };
  });

  const participantIdByPosition = new Map(
    mapped.map((entry) => [entry.position, entry.participantId]),
  );
  return mapped.map((entry) => {
    if (tyreHistoryStore && tyreHistorySessionKey && entry.participantId && entry.frontTyreCompound !== null && entry.rearTyreCompound !== null) {
      tyreHistoryStore.record(tyreHistorySessionKey, {
        participantId: entry.participantId,
        driverName: entry.driverName,
        lap: entry.laps,
        sessionSeconds,
        lapTime: entry.lastLap,
        frontTyreCompound: entry.frontTyreCompound,
        rearTyreCompound: entry.rearTyreCompound,
        wearFrontLeft: entry.wearFrontLeft,
        wearFrontRight: entry.wearFrontRight,
        wearRearLeft: entry.wearRearLeft,
        wearRearRight: entry.wearRearRight,
        inPit: entry.inPit,
      });
    }
    return {
      ...entry,
      tyreHistory: tyreHistoryStore && tyreHistorySessionKey && entry.participantId
        ? tyreHistoryStore.history(tyreHistorySessionKey, entry.participantId)
        : [],
      nextParticipantId: participantIdByPosition.get(entry.position - 1) ?? null,
    };
  });
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
  serverStatus = "online",
  standingsAvailable = true,
  standingsSource = "standings",
  maxSpeedMsByParticipantId = null,
  tyreHistoryStore = null,
  standingsUnavailableReason = null,
) {
  const sessionCode = publicText(session.session, "—");
  const trackDistance = finiteNumber(session.lapDistance);
  const sessionSeconds = finiteNumber(session.currentEventTime);
  const standings = buildStandings(
    vehicles,
    trackDistance,
    maxSpeedMsByParticipantId,
    tyreHistoryStore,
    `${sourceId}:${sessionCode}`,
    sessionSeconds,
  );
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
      driversCount: standingsAvailable ? standings.length : null,
      maxDrivers: finiteNumber(session.maxPlayers),
      currentSession: sessionLabel(sessionCode),
      timeRemaining:
        sessionTimeRemaining === null ? "—" : formatRFactorDuration(sessionTimeRemaining),
      totalSessionTime:
        endEventTime === null ? "—" : formatRFactorDuration(Math.max(0, endEventTime)),
      lapsCompleted: standingsAvailable
        ? standings.reduce((max, entry) => Math.max(max, entry.laps), 0)
        : null,
      totalLaps: maxLaps === INT32_MAX ? null : maxLaps,
      trackLength: canonicalTrackLength?.meters ?? null,
      trackLengthSource: canonicalTrackLength?.source ?? null,
      trackTechnicalId: trackTechnicalId ?? canonicalTrackLength?.technicalId ?? null,
      lapDistance: trackDistance,
      status: serverStatus,
      standingsSource,
      standingsUnavailableReason: publicText(standingsUnavailableReason) || null,
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
  } catch (error) {
    const isTimeout = controller.signal.aborted || error?.name === "AbortError";
    return { ok: false, status: 0, failure: isTimeout ? "timeout" : "transport" };
  } finally {
    clearTimeout(timer);
  }
}

/** Internal-only standings diagnosis. Never include an upstream body or identity. */
function classifyStandingsFailure(result) {
  if (result?.ok && !Array.isArray(result.body)) return "unexpected_shape";
  if (result?.ok && Array.isArray(result.body) && result.body.length === 0) return "empty_standings";
  if (result?.parseError) return "invalid_json";
  if (result?.failure === "timeout") return "timeout";
  if (result?.failure === "transport") return "transport";
  const status = finiteNumber(result?.status);
  return status !== null && status > 0 ? `http_${Math.trunc(status)}` : "transport";
}

function r2laSession(payload) {
  const scoring = payload?.mScoringInfo;
  if (!scoring || typeof scoring !== "object" || Array.isArray(scoring)) return null;
  return {
    serverName: scoring.mServerName,
    trackName: scoring.mTrackName,
    session: typeof scoring.mSession === "string" ? scoring.mSession : "—",
    currentEventTime: scoring.mCurrentET,
    endEventTime: scoring.mEndET,
    maximumLaps: scoring.mMaxLaps,
    lapDistance: scoring.mLapDist,
    ambientTemp: scoring.mAmbientTemp,
    trackTemp: scoring.mTrackTemp,
    raining: scoring.mRaining,
    yellowFlagState: scoring.mYellowFlagState,
    sectorFlag: scoring.mSectorFlag,
  };
}

function r2laVehicles(payload) {
  if (!Array.isArray(payload?.mVehicles)) return null;
  return payload.mVehicles
    .filter((vehicle) => vehicle && typeof vehicle === "object")
    .map((vehicle) => ({
      slotID: vehicle.mID,
      driverName: vehicle.mDriverName,
      vehicleName: vehicle.mVehicleName,
      fullTeamName: vehicle.mTeamName,
      carNumber: vehicle.mCarNumber,
      carClass: vehicle.mVehicleClass,
      position: vehicle.mPlace,
      lapsCompleted: vehicle.mTotalLaps,
      bestLapTime: vehicle.mBestLapTime,
      lastLapTime: vehicle.mLastLapTime,
      timeBehindLeader: vehicle.mTimeBehindLeader,
      timeBehindNext: vehicle.mTimeBehindNext,
      lapsBehindLeader: vehicle.mLapsBehindLeader,
      pitstops: vehicle.mNumPitstops,
      pitting: finiteNumber(vehicle.mInPits) !== null && finiteNumber(vehicle.mInPits) !== 0,
      lapDistance: vehicle.mLapDist,
      // R2LA exposes mLastSector1/2, but their units and cumulative semantics
      // are not established here. Omit them rather than publish false sectors.
    }));
}

/**
 * Isolated R2LA adapter. It deliberately shares the existing B404 DTO builder
 * so the public contract and the track renderer keep their current shape.
 */
export async function collectR2laLiveTiming(sourceId, options = {}) {
  const registry = options.registry ?? SOURCE_REGISTRY;
  const source = registry[sourceId];
  if (!source) throw new Error("unknown_source");
  const baseUrl = typeof source.r2laBaseUrl === "string" ? source.r2laBaseUrl.replace(/\/$/, "") : "";
  if (!baseUrl) throw new Error("r2la_source_unconfigured");

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch_unavailable");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? (() => new Date().toISOString());
  // The R2LA payload has no verified layout identity. Only a caller that has
  // resolved the active RF2 event locally may opt into publishing this value.
  const trackTechnicalId = typeof options.trackTechnicalId === "string"
    && options.trackTechnicalId.trim()
    ? options.trackTechnicalId.trim()
    : null;
  const result = await requestJson(`${baseUrl}/live/get_data`, { fetchImpl, timeoutMs });
  const session = result.ok ? r2laSession(result.body) : null;
  const vehicles = result.ok ? r2laVehicles(result.body) : null;
  if (!session || !vehicles) {
    return { ok: false, sourceId, status: "error", error: SOURCE_TIMEOUT_ERROR };
  }

  return {
    ok: true,
    data: buildData(
      sourceId,
      session,
      vehicles,
      null,
      now(),
      null,
      null,
      null,
      null,
      trackTechnicalId,
    ),
  };
}

function nativeTrackContext(options) {
  const trackTechnicalId = publicText(options.nativeTrackTechnicalId) || null;
  if (trackTechnicalId === null) return null;
  return {
    serverUptime: null,
    trackLength: null,
    trackTechnicalId,
  };
}

async function collectContext(source, options, fetchImpl, timeoutMs) {
  if (options.disableManagerContext === true) {
    return { serverUptime: null, trackLength: null, trackTechnicalId: null };
  }
  return nativeTrackContext(options) ?? fetchManagerContext(source, {
    fetchImpl,
    timeoutMs,
    managerUrl: managerBaseUrl(options),
  });
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
  const vmaxCache = options.vmaxCache ?? new Map();
  const vmaxState = vmaxSessionState(
    vmaxCache,
    sourceId,
    publicText(sessionResult.body.session, "—"),
  );

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
  if (!standingsResult.ok || !Array.isArray(standingsResult.body) || standingsResult.body.length === 0) {
    const standingsFailure = classifyStandingsFailure(standingsResult);
    const sharedMemory = await readSharedMemory(options);
    const fallbackVehicles = sharedMemoryFallbackStandings(
      sharedMemory,
      sessionResult.body.numberOfVehicles,
    );

    const weatherClientStatus = await detectWeatherClient(sourceId, {
      probe: options.weatherClientProbe,
    });
    if (fallbackVehicles) {
      return {
        ok: true,
        degraded: false,
        warning: "native_shared_memory_fallback",
        standingsFailure,
        upstreamStatus: standingsResult.status,
        data: buildData(
          sourceId,
          sessionResult.body,
          fallbackVehicles,
          null,
          now(),
          selection,
          null,
          weatherClientStatus,
          null,
          null,
          "online",
          true,
          "shared_memory_scoring",
          null,
          options.tyreHistoryStore ?? null,
          standingsFailure,
        ),
      };
    }
    const managerContext = await collectContext(source, options, fetchImpl, timeoutMs);
    return {
      ok: true,
      degraded: true,
      error: "standings_unavailable",
      standingsFailure,
      upstreamStatus: standingsResult.status,
      data: buildData(
        sourceId,
        sessionResult.body,
        [],
        null,
        now(),
        selection,
        managerContext.serverUptime,
        weatherClientStatus,
        managerContext.trackLength,
        managerContext.trackTechnicalId,
        "degraded",
        false,
        "unavailable",
        null,
        null,
        sharedMemoryFallbackIssue(sharedMemory, sessionResult.body.numberOfVehicles),
      ),
    };
  }
  rememberSessionVmax(vmaxState, standingsResult.body);

  const historyResult = options.includeHistory === false
    ? null
    : await requestJson(
        `${source.baseUrl}/rest/watch/standings/history`,
        { fetchImpl, timeoutMs },
      );
  const history = historyResult?.ok ? historyResult.body : null;
  const activeVehicles = enrichActiveVehiclesWithHistory(standingsResult.body, history);
  const sharedMemory = await readSharedMemory(options);
  const telemetryVehicles = sharedMemory === null
    ? activeVehicles
    : enrichActiveVehiclesWithSharedMemory(activeVehicles, sharedMemory);
  const managerContext = await collectContext(source, options, fetchImpl, timeoutMs);
  const weatherClientStatus = await detectWeatherClient(sourceId, {
    probe: options.weatherClientProbe,
  });

  return {
    ok: true,
    data: buildData(
      sourceId,
      sessionResult.body,
      telemetryVehicles,
      history,
      now(),
      selection,
      managerContext.serverUptime,
      weatherClientStatus,
      managerContext.trackLength,
      managerContext.trackTechnicalId,
      undefined,
      undefined,
      undefined,
      vmaxState.maxSpeedMsByParticipantId,
      options.tyreHistoryStore ?? null,
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
        healthState: null,
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
      const nextHealthState = result.ok
        ? result.degraded
          ? `degraded:${result.error ?? "partial"}`
          : "online"
        : `error:${result.error ?? "adapter_failure"}`;
      if (state.healthState !== nextHealthState) {
        const previousHealthState = state.healthState;
        state.healthState = nextHealthState;
        if (nextHealthState === "online" && previousHealthState) {
          console.info(
            `[Live Timing] source=${state.sourceId} recovered previous=${previousHealthState}`,
          );
        } else if (nextHealthState !== "online") {
          const upstreamStatus = result.upstreamStatus ?? "n/a";
          const standingsFailure = result.standingsFailure ?? "n/a";
          console.warn(
            `[Live Timing] source=${state.sourceId} state=${nextHealthState} standingsFailure=${standingsFailure} upstreamStatus=${upstreamStatus}`,
          );
        }
      }
      if (result.ok) {
        this.broadcast(state, "snapshot", {
          success: true,
          sourceId: state.sourceId,
          transport: "sse",
          degraded: result.degraded === true,
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
      const nextHealthState = "error:adapter_failure";
      if (state.healthState !== nextHealthState) {
        const previousHealthState = state.healthState;
        state.healthState = nextHealthState;
        console.warn(
          `[Live Timing] source=${state.sourceId} state=${nextHealthState} previous=${previousHealthState ?? "none"}`,
        );
      }
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
  const vmaxCache = options.vmaxCache ?? new Map();
  const tyreHistoryStore = options.tyreHistoryStore ?? createTyreHistoryStore();
  const collect = options.collector ?? ((sourceId, collectOptions = {}) =>
    collectLiveTiming(sourceId, {
      ...options,
      ...collectOptions,
      registry,
      vmaxCache,
      tyreHistoryStore,
    }));
  const geometryProvider = options.geometryProvider ?? createTrackGeometryProvider({
    registry,
    managerBaseUrl: managerBaseUrl(options),
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });
  const streamHub = options.streamHub ?? new LiveTimingStreamHub({
    collect: (sourceId) => collect(sourceId),
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
      writeJson(response, 200, {
        success: true,
        degraded: result.degraded === true,
        data: result.data,
      });
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
