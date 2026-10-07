export const VISUAL_MARKER_ANIMATION_DURATION_MS = 760;
export const MAX_MARKER_ANIMATION_DISTANCE = 450;
const STATIC_DISTANCE_EPSILON = 0.5;

export type MarkerMotionMode = "initial" | "smooth" | "static" | "snap" | "pit";

export interface MarkerMotionInput {
  lapDistance: number | null;
  inPit: boolean;
  status: string;
}

export interface MarkerMotionPlan {
  mode: MarkerMotionMode;
  fromDistance: number;
  toDistance: number;
  durationMs: number;
  /** Visual speed in metres per millisecond at the beginning of the plan. */
  initialVelocity: number;
}

export interface ActiveMarkerMotion {
  input: MarkerMotionInput;
  plan: MarkerMotionPlan;
  startedAt: number;
}

function normalizeDistance(distance: number, lapLength: number): number {
  const normalized = distance % lapLength;
  return normalized < 0 ? normalized + lapLength : normalized;
}

function signedForwardDelta(fromDistance: number, toDistance: number, lapLength: number): number {
  const forwardDelta = normalizeDistance(toDistance - fromDistance, lapLength);
  return forwardDelta <= lapLength / 2
    ? forwardDelta
    : forwardDelta - lapLength;
}

function staticPlan(mode: MarkerMotionMode, targetDistance: number): MarkerMotionPlan {
  return {
    mode,
    fromDistance: targetDistance,
    toDistance: targetDistance,
    durationMs: 0,
    initialVelocity: 0,
  };
}

function boundedInitialVelocity(
  initialVelocity: number,
  displacement: number,
  durationMs: number,
): number {
  if (!Number.isFinite(initialVelocity) || durationMs <= 0 || Math.abs(displacement) <= STATIC_DISTANCE_EPSILON) {
    return 0;
  }
  const direction = Math.sign(displacement);
  if (Math.sign(initialVelocity) !== direction) return 0;
  // Keep the Hermite curve monotonic: a very short next target must not make
  // a marker overshoot and reverse across the circuit.
  return direction * Math.min(Math.abs(initialVelocity), (Math.abs(displacement) * 3) / durationMs);
}

/**
 * Creates a visual-only plan between two already received SSE observations.
 * Large corrections and state changes snap so a marker never sweeps across the map.
 */
export function planMarkerMotion(
  previous: MarkerMotionInput | null,
  next: MarkerMotionInput,
  lapLength: number,
  initialVelocity = 0,
): MarkerMotionPlan {
  if (!Number.isFinite(next.lapDistance) || !Number.isFinite(lapLength) || lapLength <= 0) {
    return staticPlan("snap", 0);
  }

  const targetDistance = normalizeDistance(next.lapDistance as number, lapLength);
  if (!previous || !Number.isFinite(previous.lapDistance)) {
    return staticPlan("initial", targetDistance);
  }

  if (next.inPit || previous.inPit) {
    return staticPlan("pit", targetDistance);
  }

  const previousDistance = normalizeDistance(previous.lapDistance as number, lapLength);
  const delta = signedForwardDelta(previousDistance, targetDistance, lapLength);
  const maxAnimatedDistance = Math.min(MAX_MARKER_ANIMATION_DISTANCE, lapLength * 0.12);

  if (Math.abs(delta) <= STATIC_DISTANCE_EPSILON) {
    return staticPlan("static", targetDistance);
  }
  if (Math.abs(delta) > maxAnimatedDistance) {
    return staticPlan("snap", targetDistance);
  }

  return {
    mode: "smooth",
    fromDistance: previousDistance,
    toDistance: previousDistance + delta,
    durationMs: VISUAL_MARKER_ANIMATION_DURATION_MS,
    initialVelocity: boundedInitialVelocity(
      initialVelocity,
      delta,
      VISUAL_MARKER_ANIMATION_DURATION_MS,
    ),
  };
}

export function retargetMarkerMotion(
  active: ActiveMarkerMotion | null,
  next: MarkerMotionInput,
  lapLength: number,
  nowMs: number,
): MarkerMotionPlan {
  if (!active) return planMarkerMotion(null, next, lapLength);
  const elapsedMs = nowMs - active.startedAt;
  const displayedDistance = getAnimatedLapDistance(active.plan, elapsedMs);
  const displayedVelocity = getAnimatedLapVelocity(active.plan, elapsedMs);
  return planMarkerMotion(
    { ...active.input, lapDistance: displayedDistance },
    next,
    lapLength,
    displayedVelocity,
  );
}

/**
 * Cubic Hermite interpolation keeps both the rendered distance and its speed
 * continuous when the next 500 ms SSE observation retargets a marker.
 */
export function getAnimatedLapDistance(plan: MarkerMotionPlan, elapsedMs: number): number {
  if (plan.durationMs <= 0 || !Number.isFinite(elapsedMs)) return plan.toDistance;
  const progress = Math.max(0, Math.min(1, elapsedMs / plan.durationMs));
  const progressSquared = progress * progress;
  const progressCubed = progressSquared * progress;
  const startTangent = (plan.initialVelocity ?? 0) * plan.durationMs;
  return (
    (2 * progressCubed - 3 * progressSquared + 1) * plan.fromDistance
    + (progressCubed - 2 * progressSquared + progress) * startTangent
    + (-2 * progressCubed + 3 * progressSquared) * plan.toDistance
  );
}

export function getAnimatedLapVelocity(plan: MarkerMotionPlan, elapsedMs: number): number {
  if (plan.durationMs <= 0 || !Number.isFinite(elapsedMs)) return 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / plan.durationMs));
  if (progress >= 1) return 0;
  const progressSquared = progress * progress;
  const startTangent = (plan.initialVelocity ?? 0) * plan.durationMs;
  return (
    ((6 * progressSquared - 6 * progress) * plan.fromDistance
      + (3 * progressSquared - 4 * progress + 1) * startTangent
      + (-6 * progressSquared + 6 * progress) * plan.toDistance)
    / plan.durationMs
  );
}
