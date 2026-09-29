"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Map as MapIcon } from "lucide-react";
import type { Flag, StandingEntry } from "../_types/live-timing";

interface TrackGeometryPoint {
  x: number;
  y: number;
  distance: number;
}

interface TrackGeometry {
  technicalId: string;
  lapLength: number;
  viewBox: string;
  points: TrackGeometryPoint[];
}

interface LiveTimingTrackLineProps {
  sourceId: string;
  trackTechnicalId: string | null;
  lapDistance: number | null;
  trackLength: number | null;
  trackLengthSource: string | null;
  standings: StandingEntry[];
  flags: Flag[];
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
  return { technicalId, lapLength, viewBox: candidate.viewBox, points };
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

  const request = fetch(`/api/public/live-timing/${encodeURIComponent(sourceId)}/track-geometry`, {
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
}

interface GeometryMarkerPlacement {
  entry: StandingEntry;
  point: { x: number; y: number };
}

function isActiveOnTrack(entry: StandingEntry): boolean {
  return entry.status === "running" && !entry.inPit;
}

function parseViewBox(viewBox: string): { x: number; y: number; width: number; height: number } | null {
  const values = viewBox.trim().split(/\s+/).map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
  const [x, y, width, height] = values;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
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
): DisplayGeometryFit {
  const validPoints = geometry.points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (validPoints.length < 3 || !Number.isFinite(viewportAspectRatio) || viewportAspectRatio <= 0) {
    return { viewBox: geometry.viewBox, transform: "" };
  }

  const candidates = [0, 90].map((rotation) => {
    const transformed = validPoints.map((point) => rotateDisplayPoint(point, rotation));
    const minX = Math.min(...transformed.map((point) => point.x));
    const maxX = Math.max(...transformed.map((point) => point.x));
    const minY = Math.min(...transformed.map((point) => point.y));
    const maxY = Math.max(...transformed.map((point) => point.y));
    const width = maxX - minX + MARKER_SAFE_MARGIN * 2;
    const height = maxY - minY + MARKER_SAFE_MARGIN * 2;
    return {
      rotation,
      minX: minX - MARKER_SAFE_MARGIN,
      minY: minY - MARKER_SAFE_MARGIN,
      width,
      height,
      scale: Math.min(viewportAspectRatio / width, 1 / height),
    };
  });
  const best = candidates.reduce((current, candidate) => (
    candidate.scale > current.scale ? candidate : current
  ));

  return {
    viewBox: `${best.minX} ${best.minY} ${best.width} ${best.height}`,
    transform: best.rotation === 90 ? "rotate(90)" : "",
  };
}

function fallbackLine(markers: StandingEntry[]) {
  return (
    <div className="relative h-24 px-3 sm:h-28 sm:px-6">
      <div className="absolute left-3 right-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#3f8f4a]/60 sm:left-6 sm:right-6" />
      <div className="absolute left-3 right-3 top-[calc(50%+18px)] flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 sm:left-6 sm:right-6">
        <span>Départ</span>
        <span>Arrivée</span>
      </div>
      {markers.map((entry) => {
        const left = `${(entry.lapProgress ?? 0) * 100}%`;
        const marker = String(entry.position);
        const carNumber = entry.carNumber?.trim();
        const fallbackMarkerTone = entry.underYellow === true
          ? "border-yellow-200 bg-yellow-400 shadow-yellow-500/25"
          : entry.inPit
            ? "border-cyan-200 bg-cyan-500 shadow-cyan-500/25"
            : "border-orange-200 bg-orange-500 shadow-orange-500/25";
        return (
          <div
            key={`${entry.position}-${entry.driverName}`}
            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left }}
            title={`Position ${marker} — ${entry.driverName}${carNumber ? ` — voiture #${carNumber}` : ""}`}
          >
            <span className={`flex h-8 min-w-8 items-center justify-center rounded-full border-2 px-2 text-xs font-black text-[#06101d] shadow-lg ${fallbackMarkerTone} transition group-hover:scale-110`}>
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
  trackTechnicalId,
  lapDistance,
  trackLength,
  trackLengthSource,
  standings,
  flags,
}: LiveTimingTrackLineProps) {
  const markers = standings
    .filter((entry) => entry.lapProgress !== null && entry.lapProgress !== undefined)
    .sort((a, b) => (a.lapProgress ?? 0) - (b.lapProgress ?? 0));
  const hasTrackPosition = lapDistance !== null && markers.length > 0;
  const displayLength = trackLength ?? lapDistance;
  const displaySource = trackLengthSource
    ? `catalogue ${trackLengthSource}`
    : "lapDistance runtime";
  const geometryKey = sourceId && trackTechnicalId
    ? `${sourceId}:${trackTechnicalId}`
    : "";
  const [geometryState, setGeometryState] = useState<{
    key: string;
    geometry: TrackGeometry | null;
    status: GeometryStatus;
  }>({ key: "", geometry: null, status: "idle" });
  const geometry = geometryState.key === geometryKey ? geometryState.geometry : null;
  const geometryStatus = geometryState.key === geometryKey
    ? geometryState.status
    : geometryKey
      ? "loading"
      : "idle";
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

  const fittedGeometry = useMemo(
    () => geometry ? fitGeometryForDisplay(geometry, viewportAspectRatio) : null,
    [geometry, viewportAspectRatio],
  );
  const yellowSectors = useMemo(
    () => [...new Set(
      flags
        .filter((flag) => flag.type === "yellow" && flag.sector > 0 && flag.sector <= 3)
        .map((flag) => flag.sector),
    )].sort((first, second) => first - second),
    [flags],
  );
  const yellowFlagLabels = yellowSectors.length > 0
    ? yellowSectors.map((sector) => `S${sector}`)
    : flags.some((flag) => flag.type === "yellow" && flag.sector === 0)
      ? ["JAUNE"]
      : [];
  const displayViewBox = useMemo(
    () => geometry ? parseViewBox(fittedGeometry?.viewBox ?? geometry.viewBox) : null,
    [fittedGeometry, geometry],
  );

  const geometryMarkers = useMemo(
    () => geometry
      ? getGeometryMarkerPlacements(
        geometry,
        standings.filter(
          (entry) => entry.lapDistance !== null
            && entry.lapDistance !== undefined
            && Number.isFinite(entry.lapDistance),
        ),
      )
      : [],
    [geometry, standings],
  );

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
        geometry: cachedGeometry,
        status: cachedGeometry ? "ready" : "loading",
      });
    });

    void refreshTrackGeometry(sourceId, requestedTechnicalId).then((loaded) => {
      if (cancelled) return;
      setGeometryState({
        key,
        geometry: loaded ?? cachedGeometry,
        status: loaded || cachedGeometry ? "ready" : "unavailable",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sourceId, trackTechnicalId]);

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
                Position des voitures sur le tour
              </h2>
            </div>
          </div>
          <span className="text-xs text-gray-500">
            Longueur source : {formatDistance(displayLength)}
          </span>
        </div>

        {!hasTrackPosition ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] px-5 py-6 text-sm text-gray-400">
            <Gauge className="mb-3 h-5 w-5 text-gray-500" aria-hidden="true" />
            <p>Position sur le tour indisponible.</p>
            <p className="mt-2 text-xs text-gray-500">
              Aucun couple lapDistance / longueur de progression exploitable n’est
              fourni par la source à cette observation.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
            {geometry ? (
              <div
                ref={geometryViewportRef}
                className="relative h-72 w-full overflow-hidden rounded-xl bg-[#091629] sm:h-96"
              >
                <svg
                  viewBox={fittedGeometry?.viewBox ?? geometry.viewBox}
                  className="h-full w-full"
                  role="img"
                  aria-label={`Tracé AIW du layout ${geometry.technicalId}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g transform={fittedGeometry?.transform}>
                  <path
                    d={`${trackPath} Z`}
                    fill="none"
                    stroke="#3f8f4a"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="18"
                    vectorEffect="non-scaling-stroke"
                  />
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

                  {geometryMarkers.map(({ entry, point }) => {
                    const marker = String(entry.position);
                    const carNumber = entry.carNumber?.trim();
                    const markerFill = entry.underYellow === true
                      ? "#facc15"
                      : entry.inPit ? "#06b6d4" : "#f97316";
                    const markerStroke = entry.underYellow === true
                      ? "#fef08a"
                      : entry.inPit ? "#a5f3fc" : "#fed7aa";
                    return (
                      <g
                        key={`${entry.position}-${entry.driverName}`}
                        transform={`translate(${point.x} ${point.y})`}
                        aria-label={`Position ${marker} — ${entry.driverName}`}
                      >
                        <title>{`Position ${marker} — ${entry.driverName}${carNumber ? ` — voiture #${carNumber}` : ""}`}</title>
                        <g
                          data-marker-label="true"
                          transform={`rotate(${markerLabelRotation})`}
                        >
                          <circle
                            r={MARKER_LABEL_RADIUS}
                            fill={markerFill}
                            stroke={markerStroke}
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
                  {yellowFlagLabels.length > 0 && displayViewBox ? (
                    <g
                      data-sector-flag-overlay="true"
                      aria-label={`Drapeau jaune ${yellowFlagLabels.join(", ")}`}
                      pointerEvents="none"
                    >
                      {yellowFlagLabels.map((label, index) => {
                        const width = label === "JAUNE" ? 64 : 42;
                        const gap = 8;
                        const totalWidth = yellowFlagLabels.reduce(
                          (total, current, currentIndex) => total
                            + (currentIndex > 0 ? gap : 0)
                            + (current === "JAUNE" ? 64 : 42),
                          0,
                        );
                        const offset = yellowFlagLabels
                          .slice(0, index)
                          .reduce((total, current) => total + (current === "JAUNE" ? 64 : 42) + gap, 0);
                        const x = displayViewBox.x
                          + (displayViewBox.width - totalWidth) / 2
                          + offset;
                        const y = displayViewBox.y + displayViewBox.height / 2 - 14;
                        return (
                          <g
                            key={label}
                            data-sector-flag-marker={label}
                            aria-label={`Drapeau jaune ${label}`}
                            transform={`translate(${x} ${y})`}
                          >
                            <rect
                              width={width}
                              height="28"
                              rx="14"
                              fill="#facc15"
                              fillOpacity="0.96"
                              stroke="#fef08a"
                              strokeWidth="2"
                            />
                            <text
                              x={width / 2}
                              y="14"
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fill="#422006"
                              fontSize="11"
                              fontWeight="900"
                            >
                              {label}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  ) : null}
                </svg>
              </div>
            ) : (
              <>
                {fallbackLine(markers)}
                <p className="mt-2 text-[10px] text-gray-500">
                  {geometryStatus === "loading"
                    ? "Chargement du tracé AIW…"
                    : "Tracé AIW indisponible — ligne de secours temporaire."}
                </p>
              </>
            )}
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-gray-500">
              <span>Marqueur : position actuelle au classement</span>
              <span>Progression : vehicle.lapDistance / session.lapDistance</span>
              <span>Longueur affichée : {displaySource}</span>
              <span>
                Tracé AIW : {geometry ? geometry.technicalId : "indisponible"}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
