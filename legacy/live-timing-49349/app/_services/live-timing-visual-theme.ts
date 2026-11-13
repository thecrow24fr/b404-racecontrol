/** Shared B404 visual palette for the standings table and Live Progression. */

export interface LiveTimingVisualPalette {
  fill: string;
  stroke: string;
  text: string;
  softBackground: string;
}

export const PIT_MARKER_PALETTE: LiveTimingVisualPalette = Object.freeze({
  fill: "#64748b",
  stroke: "#cbd5e1",
  text: "#e2e8f0",
  softBackground: "rgba(100, 116, 139, 0.18)",
});

export const FALLBACK_CAR_CLASS_PALETTE: LiveTimingVisualPalette = Object.freeze({
  fill: "#f97316",
  stroke: "#fed7aa",
  text: "#fdba74",
  softBackground: "rgba(249, 115, 22, 0.15)",
});

export const CAR_CLASS_PALETTES = Object.freeze({
  GT3: Object.freeze({
    fill: "#f97316",
    stroke: "#fed7aa",
    text: "#fdba74",
    softBackground: "rgba(249, 115, 22, 0.15)",
  }),
  GT4: Object.freeze({
    fill: "#2563eb",
    stroke: "#bfdbfe",
    text: "#93c5fd",
    softBackground: "rgba(37, 99, 235, 0.18)",
  }),
  LMP2: Object.freeze({
    fill: "#9333ea",
    stroke: "#e9d5ff",
    text: "#d8b4fe",
    softBackground: "rgba(147, 51, 234, 0.18)",
  }),
  HYPERCAR: Object.freeze({
    fill: "#16a34a",
    stroke: "#bbf7d0",
    text: "#86efac",
    softBackground: "rgba(22, 163, 74, 0.18)",
  }),
  PORSCHE_CUP: Object.freeze({
    fill: "#0891b2",
    stroke: "#a5f3fc",
    text: "#67e8f9",
    softBackground: "rgba(8, 145, 178, 0.18)",
  }),
  MULTI_CLASSE: Object.freeze({
    fill: "#db2777",
    stroke: "#fbcfe8",
    text: "#f9a8d4",
    softBackground: "rgba(219, 39, 119, 0.18)",
  }),
});

export function normalizeCarClass(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function getCarClassPalette(
  carClass: string | null | undefined,
): LiveTimingVisualPalette {
  const key = normalizeCarClass(carClass);
  return CAR_CLASS_PALETTES[key as keyof typeof CAR_CLASS_PALETTES]
    ?? FALLBACK_CAR_CLASS_PALETTE;
}

export function getMarkerPalette(
  carClass: string | null | undefined,
  inPit: boolean,
): LiveTimingVisualPalette {
  return inPit ? PIT_MARKER_PALETTE : getCarClassPalette(carClass);
}
