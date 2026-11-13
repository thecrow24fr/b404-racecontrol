"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Gauge, Map as MapIcon } from "lucide-react";
import type { Flag, StandingEntry } from "../_types/live-timing";
import { publicLiveTimingApiUrl } from "../_services/public-live-timing-provider";
import { getMarkerPalette } from "../_services/live-timing-visual-theme";
import * as motionPredictor from "../_services/motion-predictor-experimental.mjs";
import { isFullCourseYellow } from "../_services/live-timing-yellow-flags.mjs";
import type { PredictorState } from "../_services/motion-predictor-experimental.mjs";
import {
  freezeMarkerMotionAtCurrentPosition,
  getAnimatedLapDistance,
  MAX_MARKER_ANIMATION_DISTANCE,
  retargetMarkerMotion,
  VISUAL_MARKER_ANIMATION_DURATION_MS,
} from "../_services/live-timing-track-motion";
import type {
  MarkerMotionInput,
  MarkerMotionPlan,
} from "../_services/live-timing-track-motion";

interface TrackGeometryPoint {
  x: number;
  y: number;
  distance: number;
}

interface TrackSectorBounds {
  sector: number;
  startDistance: number;
  endDistance: number;
}

interface TrackGeometry {
  technicalId: string;
  lapLength: number;
  viewBox: string;
  points: TrackGeometryPoint[];
  /** Explicit native/AIW sector distances only; never inferred from lap thirds. */
  sectorBounds: TrackSectorBounds[];
}

interface LiveTimingTrackLineProps {
  sourceId: string;
  sessionKey: string;
  trackTechnicalId: string | null;
  lapDistance: number | null;
  trackLength: number | null;
  trackLengthSource: string | null;
  standings: StandingEntry[];
  motionAvailable: boolean;
  flags: Flag[];
  snapshotTimeMs: number | null;
  sourceFetchedAt?: string;
}

type GeometryStatus = "idle" | "loading" | "ready" | "unavailable";

const geometryCache = new Map<string, Promise<TrackGeometry | null>>();
const geometryMemoryCache = new Map<string, TrackGeometry>();
const GEOMETRY_CACHE_VERSION = "v2";

function formatDistance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "Non disponible";
  return `${(value / 1000).toFixed(3)} km`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSectorBounds(value: unknown, lapLength: number): TrackSectorBounds[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .map((candidate) => ({
      sector: Number(candidate.sector),
      startDistance: Number(candidate.startDistance),
      endDistance: Number(candidate.endDistance),
    }))
    .filter(
      (candidate) => Number.isInteger(candidate.sector)
        && candidate.sector >= 1
        && candidate.sector <= 3
        && Number.isFinite(candidate.startDistance)
        && Number.isFinite(candidate.endDistance)
        && candidate.startDistance >= 0
        && candidate.endDistance > candidate.startDistance
        && candidate.endDistance <= lapLength,
    )
    .sort((first, second) => first.sector - second.sector);
}

function deriveSector3Bounds(
  sectorBounds: TrackSectorBounds[],
  lapLength: number,
): TrackSectorBounds[] {
  if (sectorBounds.some((bounds) => bounds.sector === 3)) return sectorBounds;
  const sector1 = sectorBounds.find((bounds) => bounds.sector === 1);
  const sector2 = sectorBounds.find((bounds) => bounds.sector === 2);
  if (
    !sector1
    || !sector2
    || sector1.endDistance > sector2.startDistance
    || sector2.endDistance >= lapLength
  ) {
    return sectorBounds;
  }

  // S3 is the verified complement from the explicit end of S2 to the AIW lap line.
  return [
    ...sectorBounds,
    {
      sector: 3,
      startDistance: sector2.endDistance,
      endDistance: lapLength,
    },
  ].sort((first, second) => first.sector - second.sector);
}

function parseGeometryPayload(payload: unknown, technicalId: string): TrackGeometry | null {
  if (!isRecord(payload) || payload.success !== true || !isRecord(payload.geometry)) return null;
  const candidate = payload.geometry;
  if (candidate.technicalId !== technicalId || typeof candidate.viewBox !== "string") return null;
  const lapLength = Number(candidate.lapLength);
  if (!Number.isFinite(lapLength) || lapLength <= 0 || !Array.isArray(candidate.points)) return null;

  const points = candidate.points
    .filter(isRecord)
    .map((point) => ({
      x: Number(point.x),
      y: Number(point.y),
      distance: Number(point.distance),
    }))
    .filter(
      (point) => Number.isFinite(point.x)
        && Number.isFinite(point.y)
        && Number.isFinite(point.distance),
    );
  if (points.length < 3) return null;
  const sectorBounds = parseSectorBounds(candidate.sectorBounds, lapLength);
  return {
    technicalId,
    lapLength,
    viewBox: candidate.viewBox,
    points,
    sectorBounds: deriveSector3Bounds(sectorBounds, lapLength),
  };
}

function geometryCacheStorageKey(sourceId: string, technicalId: string): string {
  const layoutKey = `${sourceId}:${technicalId}`;
  return `b404-racecontrol:track-geometry:${GEOMETRY_CACHE_VERSION}:${encodeURIComponent(layoutKey)}`;
}

function readCachedTrackGeometry(sourceId: string, technicalId: string): TrackGeometry | null {
  const cacheKey = `${sourceId}:${technicalId}`;
  const memoryGeometry = geometryMemoryCache.get(cacheKey);
  if (memoryGeometry) return memoryGeometry;
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(geometryCacheStorageKey(sourceId, technicalId));
    if (!raw) return null;
    const geometry = parseGeometryPayload(JSON.parse(raw), technicalId);
    if (!geometry) return null;
    geometryMemoryCache.set(cacheKey, geometry);
    return geometry;
  } catch {
    return null;
  }
}

function writeCachedTrackGeometry(sourceId: string, geometry: TrackGeometry): void {
  const cacheKey = `${sourceId}:${geometry.technicalId}`;
  geometryMemoryCache.set(cacheKey, geometry);
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      geometryCacheStorageKey(sourceId, geometry.technicalId),
      JSON.stringify({ success: true, geometry }),
    );
  } catch {
    // localStorage can be unavailable or full; memory cache remains valid.
  }
}

function refreshTrackGeometry(sourceId: string, technicalId: string): Promise<TrackGeometry | null> {
  const cacheKey = `${sourceId}:${technicalId}`;
  const inFlight = geometryCache.get(cacheKey);
  if (inFlight) return inFlight;

  const geometryUrl = `${publicLiveTimingApiUrl(`/${encodeURIComponent(sourceId)}/track-geometry`)}?technicalId=${encodeURIComponent(technicalId)}`;
  const request = fetch(geometryUrl, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
    .then((response) => response.ok ? response.json() as Promise<unknown> : null)
    .then((payload) => parseGeometryPayload(payload, technicalId))
    .then((geometry) => {
      if (geometry) writeCachedTrackGeometry(sourceId, geometry);
      return geometry;
    })
    .catch(() => null);
  geometryCache.set(cacheKey, request);
  void request.finally(() => {
    if (geometryCache.get(cacheKey) === request) {
      geometryCache.delete(cacheKey);
    }
  });
  return request;
}

function interpolateGeometryPoint(
  geometry: TrackGeometry,
  lapDistance: number | null,
): { x: number; y: number } | null {
  if (lapDistance === null || !Number.isFinite(lapDistance)) return null;
  let distance = lapDistance % geometry.lapLength;
  if (distance < 0) distance += geometry.lapLength;

  for (let index = 1; index < geometry.points.length; index += 1) {
    const previous = geometry.points[index - 1];
    const current = geometry.points[index];
    if (distance <= current.distance) {
      const span = current.distance - previous.distance;
      const ratio = span > 0 ? (distance - previous.distance) / span : 0;
      return {
        x: previous.x + (current.x - previous.x) * ratio,
        y: previous.y + (current.y - previous.y) * ratio,
      };
    }
  }

  const previous = geometry.points.at(-1);
  const first = geometry.points[0];
  if (!previous || !first) return null;
  const span = Math.max(1e-6, geometry.lapLength - previous.distance);
  const ratio = (distance - previous.distance) / span;
  return {
    x: previous.x + (first.x - previous.x) * ratio,
    y: previous.y + (first.y - previous.y) * ratio,
  };
}

interface StartFinishLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  directionArrowPath: string;
}

const START_FINISH_HALF_LENGTH = 18;
const START_DIRECTION_ARROW_OFFSET = 12;
const START_DIRECTION_ARROW_LENGTH = 24;
const START_DIRECTION_ARROW_HEAD_LENGTH = 9;
const START_DIRECTION_ARROW_HALF_WIDTH = 6;
const MARKER_LABEL_COUNTER_ROTATION = -90;

function getStartFinishLine(
  geometry: TrackGeometry,
): StartFinishLine | null {
  if (geometry.points.length < 3) return null;

  const startIndex = geometry.points.reduce((bestIndex, point, index, points) => (
    point.distance < points[bestIndex].distance ? index : bestIndex
  ), 0);
  const start = geometry.points[startIndex];
  const previous = geometry.points[(startIndex - 1 + geometry.points.length) % geometry.points.length];
  const next = geometry.points[(startIndex + 1) % geometry.points.length];
  if (!start || !previous || !next) return null;

  let tangentX = next.x - previous.x;
  let tangentY = next.y - previous.y;
  let tangentLength = Math.hypot(tangentX, tangentY);
  if (tangentLength < 1e-6) {
    tangentX = next.x - start.x;
    tangentY = next.y - start.y;
    tangentLength = Math.hypot(tangentX, tangentY);
  }
  if (tangentLength < 1e-6) return null;

  const directionX = tangentX / tangentLength;
  const directionY = tangentY / tangentLength;
  const normalX = -directionY;
  const normalY = directionX;
  const arrowStartX = start.x + directionX * START_DIRECTION_ARROW_OFFSET;
  const arrowStartY = start.y + directionY * START_DIRECTION_ARROW_OFFSET;
  const arrowTipX = arrowStartX + directionX * START_DIRECTION_ARROW_LENGTH;
  const arrowTipY = arrowStartY + directionY * START_DIRECTION_ARROW_LENGTH;
  const arrowBaseX = arrowTipX - directionX * START_DIRECTION_ARROW_HEAD_LENGTH;
  const arrowBaseY = arrowTipY - directionY * START_DIRECTION_ARROW_HEAD_LENGTH;
  const arrowBaseOneX = arrowBaseX + normalX * START_DIRECTION_ARROW_HALF_WIDTH;
  const arrowBaseOneY = arrowBaseY + normalY * START_DIRECTION_ARROW_HALF_WIDTH;
  const arrowBaseTwoX = arrowBaseX - normalX * START_DIRECTION_ARROW_HALF_WIDTH;
  const arrowBaseTwoY = arrowBaseY - normalY * START_DIRECTION_ARROW_HALF_WIDTH;

  return {
    x1: start.x - normalX * START_FINISH_HALF_LENGTH,
    y1: start.y - normalY * START_FINISH_HALF_LENGTH,
    x2: start.x + normalX * START_FINISH_HALF_LENGTH,
    y2: start.y + normalY * START_FINISH_HALF_LENGTH,
    directionArrowPath: [
      `M ${arrowStartX} ${arrowStartY} L ${arrowTipX} ${arrowTipY}`,
      `M ${arrowBaseOneX} ${arrowBaseOneY} L ${arrowTipX} ${arrowTipY} L ${arrowBaseTwoX} ${arrowBaseTwoY}`,
    ].join(" "),
  };
}

// Fixed per-layout padding for the SVG marker circles.
const MARKER_SAFE_MARGIN = 18;
const MARKER_LABEL_RADIUS = 8;
const MARKER_LABEL_STROKE_WIDTH = 2;
const MARKER_LABEL_FONT_SIZE = 10;
const DEFAULT_VIEWPORT_ASPECT_RATIO = 3;

interface DisplayGeometryFit {
  viewBox: string;
  transform: string;
  minX: number;
  minY: number;
  width: number;
  height: number;
  badgeBandHeight: number;
}

interface GeometryMarkerPlacement {
  entry: StandingEntry;
  point: { x: number; y: number };
}

interface PitEntryFadeMarker extends GeometryMarkerPlacement {
  identity: string;
  fadingOutFromPit: true;
}

interface MarkerAnimationState {
  input: MarkerMotionInput;
  plan: MarkerMotionPlan;
  startedAt: number;
}

const PIT_EXIT_FADE_DURATION_MS = 1500;

interface SectorBadgePlacement {
  x: number;
  y: number;
}

const SECTOR_BADGE_BAND_HEIGHT = 48;
const SECTOR_BADGE_WIDTH = 104;
const SECTOR_BADGE_HEIGHT = 30;

function getMarkerIdentity(entry: StandingEntry): string {
  const participantId = entry.participantId?.trim();
  return participantId ? `participant:${participantId}` : `driver:${entry.driverName}`;
}

function getMarkerMotionInput(entry: StandingEntry): MarkerMotionInput | null {
  if (entry.lapDistance === null || entry.lapDistance === undefined || !Number.isFinite(entry.lapDistance)) {
    return null;
  }
  return {
    lapDistance: entry.lapDistance,
    completedLaps: entry.laps,
    inPit: entry.inPit === true,
    status: entry.status,
  };
}

function getSectorAnchor(
  geometry: TrackGeometry,
  sector: number,
): { x: number; y: number } | null {
  const bounds = geometry.sectorBounds.find((candidate) => candidate.sector === sector);
  if (!bounds) return null;
  return interpolateGeometryPoint(
    geometry,
    bounds.startDistance + (bounds.endDistance - bounds.startDistance) / 2,
  );
}

function getSectorPath(geometry: TrackGeometry, sector: number): string | null {
  const bounds = geometry.sectorBounds.find((candidate) => candidate.sector === sector);
  if (!bounds) return null;
  const start = interpolateGeometryPoint(geometry, bounds.startDistance);
  const end = interpolateGeometryPoint(geometry, bounds.endDistance);
  if (!start || !end) return null;
  const points = [
    start,
    ...geometry.points
      .filter((point) => point.distance > bounds.startDistance && point.distance < bounds.endDistance)
      .map((point) => ({ x: point.x, y: point.y })),
    end,
  ];
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function getSectorBadgePlacement(
  fit: DisplayGeometryFit,
  index: number,
  count: number,
): SectorBadgePlacement {
  const columns = Math.max(1, Math.min(count, 3));
  const slotWidth = fit.width / columns;
  return {
    x: fit.minX + slotWidth * (index % columns) + slotWidth / 2,
    y: fit.minY + fit.badgeBandHeight / 2,
  };
}

function isActiveOnTrack(entry: StandingEntry): boolean {
  return entry.status === "running" && !entry.inPit;
}

function rotateDisplayPoint(point: { x: number; y: number }, rotation: number) {
  return rotation === 90 ? { x: -point.y, y: point.x } : point;
}

function getGeometryMarkerPlacements(
  geometry: TrackGeometry,
  entries: StandingEntry[],
): GeometryMarkerPlacement[] {
  return entries
    .map((entry) => ({
      entry,
      point: interpolateGeometryPoint(geometry, entry.lapDistance ?? null),
    }))
    .filter(
      (candidate): candidate is {
        entry: StandingEntry;
        point: { x: number; y: number };
      } => candidate.point !== null,
    )
    // Draw pit/out markers first so an active on-track vehicle remains visible above them.
    .sort((first, second) => Number(isActiveOnTrack(first.entry)) - Number(isActiveOnTrack(second.entry)));
}

function fitGeometryForDisplay(
  geometry: TrackGeometry,
  viewportAspectRatio: number,
  yellowBadgeCount: number,
): DisplayGeometryFit {
  const badgeBandHeight = yellowBadgeCount > 0 ? SECTOR_BADGE_BAND_HEIGHT : 0;
  const validPoints = geometry.points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (validPoints.length < 3 || !Number.isFinite(viewportAspectRatio) || viewportAspectRatio <= 0) {
    const [minX, minY, width, height] = geometry.viewBox.split(/\s+/).map(Number);
    return {
      viewBox: geometry.viewBox,
      transform: "",
      minX: Number.isFinite(minX) ? minX : 0,
      minY: Number.isFinite(minY) ? minY : 0,
      width: Number.isFinite(width) ? width : 1,
      height: Number.isFinite(height) ? height : 1,
      badgeBandHeight,
    };
  }

  const candidates = [0, 90].map((rotation) => {
    const transformed = validPoints.map((point) => rotateDisplayPoint(point, rotation));
    const minX = Math.min(...transformed.map((point) => point.x));
    const maxX = Math.max(...transformed.map((point) => point.x));
    const minY = Math.min(...transformed.map((point) => point.y));
    const maxY = Math.max(...transformed.map((point) => point.y));
    const width = maxX - minX + MARKER_SAFE_MARGIN * 2;
    const height = maxY - minY + MARKER_SAFE_MARGIN * 2 + badgeBandHeight;
    return {
      rotation,
      minX: minX - MARKER_SAFE_MARGIN,
      minY: minY - MARKER_SAFE_MARGIN - badgeBandHeight,
      width,
      height,
      badgeBandHeight,
      scale: Math.min(viewportAspectRatio / width, 1 / height),
    };
  });
  const best = candidates.reduce((current, candidate) => (
    candidate.scale > current.scale ? candidate : current
  ));

  return {
    viewBox: `${best.minX} ${best.minY} ${best.width} ${best.height}`,
    transform: best.rotation === 90 ? "rotate(90)" : "",
    minX: best.minX,
    minY: best.minY,
    width: best.width,
    height: best.height,
    badgeBandHeight: best.badgeBandHeight,
  };
}

function fallbackLine(markers: StandingEntry[], fullCourseYellow: boolean) {
  return (
    <div className="relative h-24 px-3 sm:h-28 sm:px-6">
      <div className={`absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full sm:left-6 sm:right-6 ${fullCourseYellow ? "bg-[#facc15]/90" : "bg-[#3f8f4a]/60"}`} />
      <div className="absolute left-3 right-3 top-[calc(50%+18px)] flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:left-6 sm:right-6">
        <span>Départ</span>
        <span>Arrivée</span>
      </div>
      {markers.map((entry) => {
        const left = `${(entry.lapProgress ?? 0) * 100}%`;
        const marker = String(entry.position);
        const carNumber = entry.carNumber?.trim();
        const markerPalette = getMarkerPalette(entry.carClass, entry.inPit === true);
        return (
          <div
            key={getMarkerIdentity(entry)}
            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left }}
            title={`Position ${marker} — ${entry.driverName}${carNumber ? ` — voiture #${carNumber}` : ""}`}
          >
            <span
              className="flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-2 text-xs font-black text-[#06101d] shadow-lg transition group-hover:scale-110"
              style={{ backgroundColor: markerPalette.fill, borderColor: markerPalette.stroke }}
            >
              {marker}
            </span>
            <span className="pointer-events-none absolute left-1/2 top-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#06101d] px-2 py-1 text-[10px] text-white shadow-xl group-hover:block">
              {entry.driverName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Vue Live générique : tracé AIW mis en cache, marqueurs interpolés par lapDistance. */
export function LiveTimingTrackLine({
  sourceId,
  sessionKey,
  trackTechnicalId,
  lapDistance,
  trackLength,
  standings,
  motionAvailable,
  flags,
  snapshotTimeMs,
  sourceFetchedAt,
}: LiveTimingTrackLineProps) {
  const markers = standings
    .filter((entry) => entry.inPit !== true && entry.lapProgress !== null && entry.lapProgress !== undefined)
    .sort((a, b) => (a.lapProgress ?? 0) - (b.lapProgress ?? 0));
  const hasTrackPosition = markers.length > 0 || standings.some(
    (entry) => Number.isFinite(entry.lapDistance),
  );
  const displayLength = trackLength ?? lapDistance;
  const geometryKey = sourceId && trackTechnicalId
    ? `${sourceId}:${trackTechnicalId}`
    : "";
  const [geometryState, setGeometryState] = useState<{
    key: string;
    sourceId: string;
    sessionKey: string;
    geometry: TrackGeometry | null;
    status: GeometryStatus;
  }>({ key: "", sourceId: "", sessionKey: "", geometry: null, status: "idle" });
  const canRetainGeometry =
    !trackTechnicalId
    && geometryState.sourceId === sourceId
    && geometryState.sessionKey === sessionKey
    && geometryState.geometry !== null;
  const geometry = geometryState.key === geometryKey
    ? geometryState.geometry
    : canRetainGeometry
      ? geometryState.geometry
      : null;
  const geometryStatus = geometry
    ? "ready"
    : geometryState.key === geometryKey
      ? geometryState.status
      : geometryKey
        ? "loading"
        : "idle";
  const showTrack = hasTrackPosition || geometry !== null;
  const geometryViewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportAspectRatio, setViewportAspectRatio] = useState(DEFAULT_VIEWPORT_ASPECT_RATIO);

  useEffect(() => {
    if (!geometryViewportRef.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      const height = entry?.contentRect.height ?? 0;
      if (width <= 0 || height <= 0) return;
      setViewportAspectRatio((current) => {
        const next = width / height;
        return Math.abs(current - next) < 0.01 ? current : next;
      });
    });
    observer.observe(geometryViewportRef.current);
    return () => observer.disconnect();
  }, [geometry]);

  const yellowSectors = useMemo(
    () => [...new Set(
      flags
        .filter((flag) => flag.type === "yellow" && flag.sector > 0 && flag.sector <= 3)
        .map((flag) => flag.sector),
    )].sort((first, second) => first - second),
    [flags],
  );
  const fullCourseYellow = isFullCourseYellow(flags);
  const fittedGeometry = useMemo(
    () => geometry ? fitGeometryForDisplay(geometry, viewportAspectRatio, yellowSectors.length) : null,
    [geometry, viewportAspectRatio, yellowSectors.length],
  );

  const geometryMarkers = useMemo(
    () => geometry
      ? getGeometryMarkerPlacements(
        geometry,
        standings.filter(
          (entry) => entry.lapDistance !== null
            && entry.lapDistance !== undefined
            && Number.isFinite(entry.lapDistance)
            && entry.inPit !== true,
        ),
      )
      : [],
    [geometry, standings],
  );
  const [pitEntryFadeMarkers, setPitEntryFadeMarkers] = useState<PitEntryFadeMarker[]>([]);
  const markerAnimationsRef = useRef(new Map<string, MarkerAnimationState>());
  const pitExitFadeUntilRef = useRef(new Map<string, number>());
  const pitEntryFadeUntilRef = useRef(new Map<string, number>());
  const markerDisplayPositionsRef = useRef(new Map<string, { x: number; y: number }>());
  const predictorStatesRef = useRef(new Map<string, PredictorState>());

  const [predictorEnabled, setPredictorEnabled] = useState(false);
  useEffect(() => {
    const syncHash = () => setPredictorEnabled(
      new URLSearchParams(window.location.hash.slice(1)).get("motionTest") === "1",
    );
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  const previousPredictorEnabledRef = useRef(false);
  const markerElementsRef = useRef(new Map<string, SVGGElement>());
  const previousSessionKeyRef = useRef(sessionKey);
  const animationFrameRef = useRef<number | null>(null);
  const scheduleAnimationRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const animations = markerAnimationsRef.current;
    if (!geometry || !sessionKey) {
      animations.clear();
      scheduleAnimationRef.current = () => {};
      return undefined;
    }

    let cancelled = false;
    const animate = (timestamp: number) => {
      if (cancelled) return;
      for (const [identity, state] of animations) {
        const element = markerElementsRef.current.get(identity);
        if (!element) continue;
        const pitEntryFadeUntil = pitEntryFadeUntilRef.current.get(identity);
        if (pitEntryFadeUntil !== undefined) {
          const lastPoint = markerDisplayPositionsRef.current.get(identity);
          if (lastPoint) element.setAttribute("transform", `translate(${lastPoint.x} ${lastPoint.y})`);
          const opacity = Math.max(0, Math.min(1, (pitEntryFadeUntil - timestamp) / PIT_EXIT_FADE_DURATION_MS));
          element.setAttribute("opacity", String(opacity));
          if (timestamp >= pitEntryFadeUntil) {
            pitEntryFadeUntilRef.current.delete(identity);
            setPitEntryFadeMarkers((current) => current.filter((marker) => marker.identity !== identity));
          }
          continue;
        }
        const predicted = predictorEnabled ? predictorStatesRef.current.get(identity) : undefined;
        const nextPrediction = predicted ? motionPredictor.step(predicted, timestamp) : null;
        if (nextPrediction) predictorStatesRef.current.set(identity, nextPrediction);
        const point = interpolateGeometryPoint(
          geometry,
          nextPrediction ? nextPrediction.x : getAnimatedLapDistance(state.plan, timestamp - state.startedAt),
        );
        if (!point) continue;
        markerDisplayPositionsRef.current.set(identity, point);
        const fadeUntil = pitExitFadeUntilRef.current.get(identity);
        if (fadeUntil !== undefined) {
          const opacity = Math.max(0, Math.min(1, 1 - (fadeUntil - timestamp) / PIT_EXIT_FADE_DURATION_MS));
          element.setAttribute("opacity", String(opacity));
          if (timestamp >= fadeUntil) pitExitFadeUntilRef.current.delete(identity);
        }
        element.setAttribute("transform", `translate(${point.x} ${point.y})`);
        element.dataset.markerMotion = nextPrediction ? "experimental" : state.plan.mode;
      }
      const hasActiveAnimation = pitEntryFadeUntilRef.current.size > 0 || pitExitFadeUntilRef.current.size > 0 || [...animations.values()].some(
        (state) => state.plan.durationMs > 0 && timestamp - state.startedAt < state.plan.durationMs,
      ) || (predictorEnabled && [...predictorStatesRef.current.values()].some(
        (state) => timestamp - state.last.at < 2500,
      ));
      animationFrameRef.current = hasActiveAnimation
        ? requestAnimationFrame(animate)
        : null;
    };

    scheduleAnimationRef.current = () => {
      if (!cancelled && animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    return () => {
      cancelled = true;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      scheduleAnimationRef.current = () => {};
    };
  }, [geometry, sessionKey, predictorEnabled]);

  useLayoutEffect(() => {
    const animations = markerAnimationsRef.current;
    const modeChanged = previousPredictorEnabledRef.current !== predictorEnabled;
    previousPredictorEnabledRef.current = predictorEnabled;
    if (modeChanged) {
      const switchAt = performance.now();
      if (!predictorEnabled) {
        for (const [identity, predicted] of predictorStatesRef.current) {
          const previous = animations.get(identity);
          if (!previous) continue;
          const current = motionPredictor.step(predicted, switchAt).x;
          animations.set(identity, {
            ...previous,
            plan: { mode: "static", fromDistance: current, toDistance: current, durationMs: 0, initialVelocity: 0, maxVelocity: 0 },
            startedAt: switchAt,
          });
        }
      }
      predictorStatesRef.current.clear();
    }
    if (previousSessionKeyRef.current !== sessionKey) {
      animations.clear();
      predictorStatesRef.current.clear();
      previousSessionKeyRef.current = sessionKey;
    }
    if (!geometry || !sessionKey) {
      animations.clear();
      predictorStatesRef.current.clear();
      return;
    }
    if (!motionAvailable) {
      const freezeAt = performance.now();
      for (const [identity, predicted] of predictorStatesRef.current) {
        const frozen = motionPredictor.step(predicted, freezeAt);
        predictorStatesRef.current.set(identity, {...frozen, v:0, last:{...frozen.last, running:false}});
      }
      for (const [identity, animation] of animations) {
        animations.set(
          identity,
          freezeMarkerMotionAtCurrentPosition(animation, freezeAt),
        );
      }
      scheduleAnimationRef.current();
      return;
    }

    const now = modeChanged ? performance.now() : snapshotTimeMs ?? performance.now();
    const visibleMarkerIds = new Set<string>();
    const newPitEntryFadeMarkers: PitEntryFadeMarker[] = [];
    const nextEntries = standings.filter((entry) => getMarkerMotionInput(entry) !== null);
    for (const entry of nextEntries) {
      const input = getMarkerMotionInput(entry);
      if (!input) continue;
      const identity = getMarkerIdentity(entry);
      visibleMarkerIds.add(identity);
      const previous = animations.get(identity);
      const exitedPit = previous?.input.inPit === true && !input.inPit;
      const enteredPit = previous?.input.inPit === false && input.inPit;
      if (exitedPit) {
        pitEntryFadeUntilRef.current.delete(identity);
        setPitEntryFadeMarkers((current) => current.filter((marker) => marker.identity !== identity));
        pitExitFadeUntilRef.current.set(identity, performance.now() + PIT_EXIT_FADE_DURATION_MS);
        markerElementsRef.current.get(identity)?.setAttribute("opacity", "0");
      }
      if (enteredPit && previous) {
        const fadeStart = performance.now();
        const priorPrediction = predictorStatesRef.current.get(identity);
        const lastDisplayedPoint = markerDisplayPositionsRef.current.get(identity)
          ?? interpolateGeometryPoint(
            geometry,
            priorPrediction
              ? motionPredictor.step(priorPrediction, now).x
              : getAnimatedLapDistance(previous.plan, now - previous.startedAt),
          );
        if (lastDisplayedPoint) {
          pitExitFadeUntilRef.current.delete(identity);
          pitEntryFadeUntilRef.current.set(identity, fadeStart + PIT_EXIT_FADE_DURATION_MS);
          newPitEntryFadeMarkers.push({ identity, entry, point: lastDisplayedPoint, fadingOutFromPit: true });
        }
      }

      const priorPrediction = predictorStatesRef.current.get(identity);
      let previousForPlan = previous;
      const sourceAt = sourceFetchedAt ? Date.parse(sourceFetchedAt) : NaN;
      if (modeChanged && !predictorEnabled && previous) continue;
      const pitTransitionActive = !!previous && (previous.input.inPit
        || (previous.plan.mode === "pit-transition" && now - previous.startedAt < previous.plan.durationMs));
      if (predictorEnabled && !pitTransitionActive && !input.inPit && input.status === "running"
        && Number.isInteger(input.completedLaps) && Number.isFinite(input.lapDistance)
        && Number.isFinite(sourceAt)) {
        const resumable = priorPrediction && !priorPrediction.last.running
          && priorPrediction.last.sourceId === sourceFetchedAt
          ? { ...priorPrediction, clock: now, last: { ...priorPrediction.last, running: true, at: now } }
          : priorPrediction;
        const predicted = motionPredictor.update(resumable ?? null, {
          distance: input.lapDistance as number,
          lap: input.completedLaps as number,
          running: true,
          at: now,
          sourceAt,
          sourceId: sourceFetchedAt,
        }, geometry.lapLength);
        if (predicted) {
          if (!priorPrediction && previous) {
            const displayed = getAnimatedLapDistance(previous.plan, now - previous.startedAt);
            let current = ((displayed % geometry.lapLength) + geometry.lapLength) % geometry.lapLength;
            let target = predicted.target;
            // Put both positions in the same unwrapped lap around the finish line.
            if (target - current > geometry.lapLength / 2) current += geometry.lapLength;
            if (current - target > geometry.lapLength / 2) target += geometry.lapLength;
            predictorStatesRef.current.set(identity, {
              ...predicted, x: current, target, correction: current > target ? target : null,
            });
          } else {
            predictorStatesRef.current.set(identity, predicted);
          }
        }
      } else {
        if (predictorEnabled && priorPrediction && previous) {
          const current = motionPredictor.step(priorPrediction, now).x;
          previousForPlan = {
            ...previous,
            plan: {mode:"static",fromDistance:current,toDistance:current,durationMs:0,initialVelocity:0,maxVelocity:0},
            startedAt: now,
          };
        }
        predictorStatesRef.current.delete(identity);
      }
      const plan = retargetMarkerMotion(previousForPlan ?? null, input, geometry.lapLength, now);
      animations.set(identity, {
        input,
        // Keep the pit handoff in the ordinary animation path across retargets.
        plan: predictorEnabled && pitTransitionActive && plan.durationMs > 0
          ? { ...plan, mode: "pit-transition" }
          : plan,
        startedAt: now,
      });
    }

    for (const identity of animations.keys()) {
      if (!visibleMarkerIds.has(identity)) {
        animations.delete(identity);
        predictorStatesRef.current.delete(identity);
      }
    }
    if (newPitEntryFadeMarkers.length > 0) {
      // Render the real received entry position before the inPit filter removes it.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPitEntryFadeMarkers((current) => [
        ...current.filter((marker) => !newPitEntryFadeMarkers.some((next) => next.identity === marker.identity)),
        ...newPitEntryFadeMarkers,
      ]);
    }
    scheduleAnimationRef.current();
  }, [geometry, motionAvailable, sessionKey, snapshotTimeMs, sourceFetchedAt, standings, predictorEnabled]);

  useEffect(() => {
    let cancelled = false;
    const requestedTechnicalId = trackTechnicalId;
    if (!sourceId || !requestedTechnicalId) {
      return () => {
        cancelled = true;
      };
    }

    const key = `${sourceId}:${requestedTechnicalId}`;
    const cachedGeometry = readCachedTrackGeometry(sourceId, requestedTechnicalId);
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setGeometryState({
        key,
        sourceId,
        sessionKey,
        geometry: cachedGeometry,
        status: cachedGeometry ? "ready" : "loading",
      });
    });

    void refreshTrackGeometry(sourceId, requestedTechnicalId).then((loaded) => {
      if (cancelled) return;
      setGeometryState({
        key,
        sourceId,
        sessionKey,
        geometry: loaded ?? cachedGeometry,
        status: loaded || cachedGeometry ? "ready" : "unavailable",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sourceId, trackTechnicalId, sessionKey]);

  const trackPath = useMemo(
    () => geometry?.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ") ?? "",
    [geometry],
  );
  const startFinishLine = useMemo(
    () => geometry ? getStartFinishLine(geometry) : null,
    [geometry],
  );
  const markerLabelRotation = fittedGeometry?.transform === "rotate(90)"
    ? MARKER_LABEL_COUNTER_ROTATION
    : 0;
  const pitStandings = standings.filter(
    (entry) => entry.inPit === true && entry.status !== "dnf" && entry.status !== "out",
  );

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <MapIcon className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                Progression Live
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">
                Positions en piste
              </h2>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            Longueur source : {formatDistance(displayLength)}
          </span>
        </div>

        {!showTrack ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] px-5 py-6 text-sm text-gray-400">
            <Gauge className="mb-3 h-5 w-5 text-gray-500" aria-hidden="true" />
            <p>Position sur le tour indisponible.</p>
            <p className="mt-2 text-xs text-gray-500">
              Aucun couple lapDistance / longueur de progression exploitable n’est
              fourni par la source à cette observation.
            </p>
          </div>
        ) : (
          <div className={pitStandings.length > 0 ? "grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]" : "grid grid-cols-1 items-start gap-4"}>
          <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
            {geometry ? (
              <div
                ref={geometryViewportRef}
                className="relative h-72 w-full overflow-hidden rounded-xl bg-[#091629] sm:h-96"
              >
                <svg
                  viewBox={fittedGeometry?.viewBox ?? geometry.viewBox}
                  className="h-full w-full"
                  role="img"
                  aria-label={`Tracé AIW du layout ${geometry.technicalId}${fullCourseYellow ? " — drapeau jaune général" : ""}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {yellowSectors.map((sector) => {
                    const anchor = getSectorAnchor(geometry, sector);
                    if (!anchor) return null;
                    const displayRotation = fittedGeometry?.transform === "rotate(90)" ? 90 : 0;
                    const displayAnchor = rotateDisplayPoint(anchor, displayRotation);
                    const badgePlacement = fittedGeometry
                      ? getSectorBadgePlacement(
                        fittedGeometry,
                        yellowSectors.indexOf(sector),
                        yellowSectors.length,
                      )
                      : null;
                    if (!badgePlacement) return null;
                    return (
                      <line
                        key={`sector-flag-leader-${sector}`}
                        data-sector-flag-leader="true"
                        x1={displayAnchor.x}
                        y1={displayAnchor.y}
                        x2={badgePlacement.x}
                        y2={badgePlacement.y + SECTOR_BADGE_HEIGHT / 2}
                        stroke="#facc15"
                        strokeOpacity="0.9"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                  <g transform={fittedGeometry?.transform}>
                  <path
                    data-track-path="true"
                    data-full-course-yellow={fullCourseYellow ? "true" : "false"}
                    d={`${trackPath} Z`}
                    fill="none"
                    stroke={fullCourseYellow ? "#facc15" : "#3f8f4a"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="12"
                    vectorEffect="non-scaling-stroke"
                  />
                  {yellowSectors.map((sector) => {
                    const sectorPath = getSectorPath(geometry, sector);
                    return sectorPath ? (
                      <path
                        key={`sector-flag-track-${sector}`}
                        data-sector-flag-track="true"
                        d={sectorPath}
                        fill="none"
                        stroke="#facc15"
                        strokeOpacity="0.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="22"
                        vectorEffect="non-scaling-stroke"
                      />
                    ) : null;
                  })}
                  {startFinishLine ? (
                    <line
                      data-start-finish-line="true"
                      x1={startFinishLine.x1}
                      y1={startFinishLine.y1}
                      x2={startFinishLine.x2}
                      y2={startFinishLine.y2}
                      stroke="#f8fafc"
                      strokeOpacity="0.9"
                      strokeLinecap="butt"
                      strokeWidth="5"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                  {startFinishLine ? (
                    <path
                      data-direction-arrow="true"
                      d={startFinishLine.directionArrowPath}
                      fill="none"
                      stroke="#f8fafc"
                      strokeOpacity="0.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}

                  {[
                    ...geometryMarkers.map((placement) => ({
                      ...placement,
                      identity: getMarkerIdentity(placement.entry),
                      fadingOutFromPit: false as const,
                    })),
                    ...pitEntryFadeMarkers,
                  ].map(({ entry, point, identity, fadingOutFromPit }) => {
                    const marker = String(entry.position);
                    const carNumber = entry.carNumber?.trim();
                    const markerPalette = getMarkerPalette(entry.carClass, entry.inPit === true && !fadingOutFromPit);
                    return (
                      <g
                        key={identity}
                        ref={(element) => {
                          if (element) {
                            markerElementsRef.current.set(identity, element);
                            markerDisplayPositionsRef.current.set(identity, point);
                          } else markerElementsRef.current.delete(identity);
                        }}
                        transform={`translate(${point.x} ${point.y})`}
                        opacity="1"
                        data-marker-motion="initial"
                        data-participant-id={identity}
                        data-position={entry.position}
                        data-in-pit={entry.inPit === true ? "true" : "false"}
                        data-marker-animation-duration={VISUAL_MARKER_ANIMATION_DURATION_MS}
                        data-marker-animation-max-distance={MAX_MARKER_ANIMATION_DISTANCE}
                        aria-label={`Position ${marker} — ${entry.driverName}`}
                      >
                        <title>{`Position ${marker} — ${entry.driverName}${carNumber ? ` — voiture #${carNumber}` : ""}`}</title>
                        <g
                          data-marker-label="true"
                          transform={`rotate(${markerLabelRotation})`}
                        >
                          <circle
                            r={MARKER_LABEL_RADIUS}
                            fill={markerPalette.fill}
                            stroke={markerPalette.stroke}
                            strokeWidth={MARKER_LABEL_STROKE_WIDTH}
                          />
                          <text
                            x="0"
                            y="1"
                            dominantBaseline="middle"
                            textAnchor="middle"
                            fill="#06101d"
                            fontSize={MARKER_LABEL_FONT_SIZE}
                            fontWeight="900"
                          >
                            {marker}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                  </g>
                  {yellowSectors.map((sector, index) => {
                    const badgePlacement = fittedGeometry
                      ? getSectorBadgePlacement(fittedGeometry, index, yellowSectors.length)
                      : null;
                    if (!badgePlacement) return null;
                    return (
                      <g
                        key={`sector-flag-badge-${sector}`}
                        data-sector-flag-badge="true"
                        className="pointer-events-none"
                        transform={`translate(${badgePlacement.x} ${badgePlacement.y})`}
                      >
                        <rect
                          x={-SECTOR_BADGE_WIDTH / 2}
                          y={-SECTOR_BADGE_HEIGHT / 2}
                          width={SECTOR_BADGE_WIDTH}
                          height={SECTOR_BADGE_HEIGHT}
                          rx="8"
                          fill="#854d0e"
                          fillOpacity="0.98"
                          stroke="#fde047"
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x="0"
                          y="1"
                          dominantBaseline="middle"
                          textAnchor="middle"
                          fill="#fef9c3"
                          fontSize="14"
                          fontWeight="900"
                        >
                          ⚠ S{sector}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : geometryStatus === "unavailable" ? (
              <>
                {fallbackLine(markers, fullCourseYellow)}
                <p className="mt-2 text-[10px] text-gray-500">
                  Tracé AIW indisponible — ligne de secours temporaire.
                </p>
              </>
            ) : (
              <div
                data-track-loading-indicator="true"
                role="status"
                aria-live="polite"
                aria-label="Chargement du tracé AIW"
                className="flex h-72 w-full items-center justify-center gap-3 rounded-xl bg-[#091629] text-sm font-semibold text-slate-300 sm:h-96"
              >
                <span>Chargement du tracé…</span>
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-orange-300 [animation-delay:300ms]" />
                </span>
              </div>
            )}

          </div>
          {pitStandings.length > 0 ? (
            <aside data-pit-car-list="true" aria-label="Voitures aux stands" className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
              <h3 className="text-center text-xs font-black uppercase tracking-wider text-orange-300">Aux stands</h3>
              <ul className="mt-3 space-y-2">
                {pitStandings.map((entry) => (
                  <li key={getMarkerIdentity(entry)} className="rounded-lg bg-[#091629] px-3 py-2 text-center text-xs text-white">
                    <span className="font-bold">{entry.position}. {entry.driverName}</span>
                    {entry.carNumber?.trim() ? <span className="ml-2 text-gray-400">#{entry.carNumber.trim()}</span> : null}
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
