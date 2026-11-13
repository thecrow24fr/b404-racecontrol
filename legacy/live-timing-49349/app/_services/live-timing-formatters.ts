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

/** Lit une durée rFactor (HH:MM:SS, MM:SS ou secondes numériques). */
export function parseRFactorDurationSeconds(value: LiveTimingDurationValue): number | null {
  if (value === null || value === undefined) return null;
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!text || text === "—") return null;
  const seconds = parseDurationText(text);
  return seconds !== null && Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

/** Décrémente un compteur depuis le dernier snapshot sans altérer la valeur source. */
export function subtractElapsedSeconds(
  value: LiveTimingDurationValue,
  elapsedSeconds: number,
): string {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    return formatRFactorDuration(value);
  }
  if (value === null || value === undefined) return "—";
  const text = typeof value === "string" ? value.trim() : String(value);
  if (!text || text === "—") return "—";
  const seconds = parseDurationText(text);
  if (seconds === null) return "—";
  return formatSeconds(Math.max(0, seconds - Math.floor(elapsedSeconds)));
}

/** Rebase une durée S20 sur l’instant où le navigateur reçoit le snapshot. */
export function rebaseSnapshotDurationAtReceipt(
  value: LiveTimingDurationValue,
  sampledAt: string,
  receivedAt: number,
): string {
  const sampledAtMs = Date.parse(sampledAt);
  if (
    !Number.isFinite(sampledAtMs)
    || !Number.isFinite(receivedAt)
    || receivedAt < sampledAtMs
  ) {
    return formatRFactorDuration(value);
  }
  return subtractElapsedSeconds(value, (receivedAt - sampledAtMs) / 1000);
}

export type MonotonicDurationAnchor = {
  key: string;
  remainingSeconds: number;
  anchoredAt: number;
};

export function advanceMonotonicDuration(
  value: LiveTimingDurationValue,
  key: string,
  now: number,
  current: MonotonicDurationAnchor | null,
): { value: string; seconds: number | null; anchor: MonotonicDurationAnchor | null } {
  const incoming = parseRFactorDurationSeconds(value);
  if (incoming === null && current?.key !== key) {
    return { value: formatRFactorDuration(value), seconds: null, anchor: null };
  }

  // Keep one monotonic origin for the whole session. Re-anchoring on every
  // lower SSE integer made the visible second inherit network/poll jitter.
  const anchor = current?.key === key
    ? current
    : incoming === null
      ? null
      : { key, remainingSeconds: incoming, anchoredAt: now };
  if (!anchor) return { value: formatRFactorDuration(value), seconds: null, anchor: null };

  const elapsed = Math.max(0, Math.floor((now - anchor.anchoredAt) / 1000));
  const seconds = Math.max(0, anchor.remainingSeconds - elapsed);
  return { value: formatSeconds(seconds), seconds, anchor };
}

/** Prochaine frontière entière de seconde sur l’horloge monotone de session. */
export function nextMonotonicSecondBoundary(anchorAt: number, now: number): number {
  const elapsed = Math.max(0, now - anchorAt);
  return anchorAt + (Math.floor(elapsed / 1000) + 1) * 1000;
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
