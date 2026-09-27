export type LiveTimingDurationValue = string | number | null | undefined;

/**
 * Formate une durée rFactor 2 en HH:MM:SS.
 *
 * Les valeurs numériques rF2 sont exprimées en minutes. Les chaînes peuvent
 * encore provenir d'un adaptateur déjà chargé et être sous la forme MM:SS,
 * MM:SS.s ou HH:MM:SS ; elles sont toutes normalisées vers le même format.
 */
export function formatRFactorDuration(value: LiveTimingDurationValue): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "number") {
    return formatMinutes(value);
  }

  const text = value.trim();
  if (!text || text === "—") return "—";

  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0) || parts.length > 3) {
    return "—";
  }

  if (parts.length === 3) {
    return formatSeconds(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  if (parts.length === 2) {
    return formatSeconds(parts[0] * 60 + parts[1]);
  }
  return formatMinutes(parts[0]);
}

function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "—";
  return formatSeconds(minutes * 60);
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const totalSeconds = Math.floor(seconds + Number.EPSILON);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSeconds = totalSeconds % 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const wholeSeconds = remainingSeconds % 60;
  return [hours, minutes, wholeSeconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
