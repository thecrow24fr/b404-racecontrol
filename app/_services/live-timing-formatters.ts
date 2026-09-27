export type LiveTimingDurationValue = string | number | null | undefined;

/**
 * Le DTO public courant transporte des durées déjà formatées depuis les
 * secondes natives rFactor 2. Les nombres restent interprétés comme des
 * secondes pour les fixtures et les appels directs.
 */
export function formatRFactorDuration(value: LiveTimingDurationValue): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "number") {
    return formatSeconds(value);
  }

  const text = value.trim();
  if (!text || text === "—") return "—";

  const seconds = parseDurationText(text);
  return seconds === null ? "—" : formatSeconds(seconds);
}

/**
 * Décode uniquement le format produit par l'ancien processus 3001 : il avait
 * traité les secondes natives comme des minutes avant de sérialiser HH:MM:SS.
 * Le marqueur `durationFormat` du nouveau DTO évite d'emprunter ce chemin
 * lorsque le backend corrigé est chargé.
 */
export function decodeLegacyRFactorDuration(value: LiveTimingDurationValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return formatSeconds(value);

  const text = value.trim();
  if (!text || text === "—") return "—";

  const parts = text.split(":").map(Number);
  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isFinite(part) || part < 0)
  ) {
    return formatRFactorDuration(value);
  }

  const serializedSeconds =
    parts[0] * 3600 + parts[1] * 60 + parts[2];
  return formatSeconds(serializedSeconds / 60);
}

function parseDurationText(text: string): number | null {
  const parts = text.split(":").map(Number);
  if (
    parts.some((part) => !Number.isFinite(part) || part < 0) ||
    parts.length > 3
  ) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0];
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
