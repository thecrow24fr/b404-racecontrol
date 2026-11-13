export const VISUAL_MARKER_ANIMATION_DURATION_MS = 760;
const MARKER_RETARGET_BUFFER_MS = 500;
export const MAX_MARKER_ANIMATION_DISTANCE = 100;
const MAX_TIME_AWARE_MARKER_ANIMATION_DISTANCE = 200;
export const MAX_MARKER_SPEED_METERS_PER_SECOND = 90;
export const MAX_MARKER_ACCELERATION_METERS_PER_SECOND2 = 8;
const STATIC_DISTANCE_EPSILON = 0.5;

export type MarkerMotionMode = "initial" | "smooth" | "static" | "snap" | "pit" | "pit-transition";

export interface MarkerMotionInput {
  lapDistance: number | null;
  /** Completed laps from the same standings row; used only to disambiguate long forward gaps. */
  completedLaps?: number | null;
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
  /** Source-timeline speed ceiling retained through late retargets (m/ms). */
  maxVelocity: number;
  /** Use bounded constant-speed interpolation for plausible running SSE samples. */
  linear?: boolean;
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

/**
 * A shortest-arc guess points backward when a forward snapshot gap exceeds half
 * a lap. The lap counter is authoritative only for that ambiguous running-track
 * case; ordinary updates, pits, and inconsistent counters keep the existing path.
 */
function confirmedForwardGap(
  previous: MarkerMotionInput,
  next: MarkerMotionInput,
  lapLength: number,
): number | null {
  if (
    previous.inPit || next.inPit
    || previous.status !== "running" || next.status !== "running"
    || !Number.isFinite(previous.completedLaps) || !Number.isFinite(next.completedLaps)
    || !Number.isFinite(previous.lapDistance) || !Number.isFinite(next.lapDistance)
  ) return null;

  const previousDistance = normalizeDistance(previous.lapDistance as number, lapLength);
  const nextDistance = normalizeDistance(next.lapDistance as number, lapLength);
  const lapDelta = (next.completedLaps as number) - (previous.completedLaps as number);
  if (lapDelta < 0 || (lapDelta > 0 && nextDistance >= previousDistance)) return null;

  const sourceDelta = lapDelta * lapLength + nextDistance - previousDistance;
  return sourceDelta > lapLength / 2 ? sourceDelta : null;
}

function staticPlan(mode: MarkerMotionMode, targetDistance: number): MarkerMotionPlan {
  return {
    mode,
    fromDistance: targetDistance,
    toDistance: targetDistance,
    durationMs: 0,
    initialVelocity: 0,
    maxVelocity: 0,
  };
}

export function freezeMarkerMotionAtCurrentPosition(
  active: ActiveMarkerMotion,
  now: number,
): ActiveMarkerMotion {
  const elapsedMs = Math.max(0, now - active.startedAt);
  const currentDistance = getAnimatedLapDistance(active.plan, elapsedMs);
  return {
    input: active.input,
    plan: staticPlan("static", currentDistance),
    // Keep the last trusted source time so recovery speed uses the full gap.
    startedAt: active.startedAt,
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
 * Creates a visual-only plan between two received SSE observations. Direct plans
 * keep a conservative snap threshold; live retargets may widen the forward bound,
 * while their velocity and duration remain capped to prevent catch-up bursts.
 */
export function planMarkerMotion(
  previous: MarkerMotionInput | null,
  next: MarkerMotionInput,
  lapLength: number,
  initialVelocity = 0,
  durationMs = VISUAL_MARKER_ANIMATION_DURATION_MS,
  maxVelocityMetersPerSecond = MAX_MARKER_SPEED_METERS_PER_SECOND,
  maxAnimatedDistanceOverride: number | null = null,
  directedDistanceOverride: number | null = null,
): MarkerMotionPlan {
  if (!Number.isFinite(next.lapDistance) || !Number.isFinite(lapLength) || lapLength <= 0) {
    return staticPlan("snap", 0);
  }

  const targetDistance = normalizeDistance(next.lapDistance as number, lapLength);
  if (!previous || !Number.isFinite(previous.lapDistance)) {
    return staticPlan("initial", targetDistance);
  }

  const previousDistance = normalizeDistance(previous.lapDistance as number, lapLength);
  const delta = Number.isFinite(directedDistanceOverride)
    ? directedDistanceOverride as number
    : signedForwardDelta(previousDistance, targetDistance, lapLength);
  const pitTransition = previous.inPit !== next.inPit;
  const pitRelated = previous.inPit || next.inPit;
  const mode: MarkerMotionMode = pitTransition
    ? "pit-transition"
    : pitRelated
      ? "pit"
      : "smooth";
  const baseMaxAnimatedDistance = pitTransition
    ? Math.min(900, lapLength * 0.2)
    : Math.min(MAX_MARKER_ANIMATION_DISTANCE, lapLength * 0.12);
  const maxAnimatedDistance = Number.isFinite(maxAnimatedDistanceOverride)
    ? Math.min(
      Number.isFinite(directedDistanceOverride) ? lapLength : lapLength * 0.5,
      Math.max(baseMaxAnimatedDistance, maxAnimatedDistanceOverride as number),
    )
    : baseMaxAnimatedDistance;

  if (Math.abs(delta) <= STATIC_DISTANCE_EPSILON) {
    return staticPlan(pitRelated ? "pit" : "static", targetDistance);
  }
  if (Math.abs(delta) > maxAnimatedDistance) {
    return staticPlan(pitTransition ? "pit-transition" : "snap", targetDistance);
  }

  const speedLimit = Math.max(
    0.1,
    Math.min(MAX_MARKER_SPEED_METERS_PER_SECOND, maxVelocityMetersPerSecond),
  ) / 1000;
  let safeDuration = Math.max(
    durationMs,
    Math.ceil((Math.abs(delta) * 1.6) / speedLimit),
  );
  let boundedVelocity = boundedInitialVelocity(
    Math.sign(delta) * Math.min(Math.abs(initialVelocity), speedLimit),
    delta,
    safeDuration,
  );
  let plan: MarkerMotionPlan = {
    mode,
    fromDistance: previousDistance,
    toDistance: previousDistance + delta,
    durationMs: safeDuration,
    initialVelocity: boundedVelocity,
    maxVelocity: speedLimit,
  };

  // Hermite tangents plus a distant target can still create a speed peak above
  // the source rate. Lengthen, never shorten, until the full curve is bounded.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    let peakVelocity = 0;
    for (let sample = 0; sample <= 32; sample += 1) {
      peakVelocity = Math.max(
        peakVelocity,
        Math.abs(getAnimatedLapVelocity(plan, safeDuration * sample / 32)),
      );
    }
    if (peakVelocity <= speedLimit + 1e-9) break;
    safeDuration = Math.ceil(safeDuration * (peakVelocity / speedLimit) * 1.03);
    boundedVelocity = boundedInitialVelocity(
      Math.sign(delta) * Math.min(Math.abs(initialVelocity), speedLimit),
      delta,
      safeDuration,
    );
    plan = {
      ...plan,
      durationMs: safeDuration,
      initialVelocity: boundedVelocity,
    };
  }
  return plan;
}

export function retargetMarkerMotion(
  active: ActiveMarkerMotion | null,
  next: MarkerMotionInput,
  lapLength: number,
  nowMs: number,
): MarkerMotionPlan {
  if (!active) return planMarkerMotion(null, next, lapLength);
  const elapsedMs = Number.isFinite(nowMs - active.startedAt)
    ? Math.max(0, nowMs - active.startedAt)
    : 0;
  const durationMs = Math.max(
    VISUAL_MARKER_ANIMATION_DURATION_MS,
    Math.ceil(elapsedMs) + MARKER_RETARGET_BUFFER_MS,
  );
  const displayedDistance = getAnimatedLapDistance(active.plan, elapsedMs);
  const displayedVelocity = getAnimatedLapVelocity(active.plan, elapsedMs);
  const previousSourceDistance = Number.isFinite(active.input.lapDistance)
    ? normalizeDistance(active.input.lapDistance as number, lapLength)
    : displayedDistance;
  const nextSourceDistance = Number.isFinite(next.lapDistance)
    ? normalizeDistance(next.lapDistance as number, lapLength)
    : displayedDistance;
  const sourceForwardGap = confirmedForwardGap(active.input, next, lapLength);
  const runningOnTrack =
    !active.input.inPit
    && !next.inPit
    && active.input.status === "running"
    && next.status === "running";
  if (
    sourceForwardGap === null
    && runningOnTrack
    && signedForwardDelta(displayedDistance, nextSourceDistance, lapLength) < -STATIC_DISTANCE_EPSILON
  ) {
    // The received source position is authoritative; never hold an out-of-date
    // marker waiting for it to catch up. Reposition to the newest sample.
    return staticPlan("snap", nextSourceDistance);
  }
  const forwardDisplacement = sourceForwardGap === null
    ? null
    : sourceForwardGap - (displayedDistance - previousSourceDistance);
  const directedDistanceOverride = Number.isFinite(forwardDisplacement)
      && (forwardDisplacement as number) > STATIC_DISTANCE_EPSILON
    ? forwardDisplacement as number
    : null;
  const sourceDelta = directedDistanceOverride !== null && sourceForwardGap !== null
    ? sourceForwardGap
    : signedForwardDelta(previousSourceDistance, nextSourceDistance, lapLength);
  const plausibleForwardSample = runningOnTrack
    && elapsedMs > 0
    && sourceDelta > STATIC_DISTANCE_EPSILON
    && sourceDelta <= MAX_MARKER_SPEED_METERS_PER_SECOND * elapsedMs / 1000;
  const currentSpeed = Math.abs(displayedVelocity);
  const observedSpeed = elapsedMs > 0 && Math.abs(sourceDelta) > STATIC_DISTANCE_EPSILON
    ? Math.abs(sourceDelta) / elapsedMs
    : currentSpeed;
  const isFirstMovingObservation = active.plan.mode === "initial" && !active.input.inPit;
  const accelerationAllowance = MAX_MARKER_ACCELERATION_METERS_PER_SECOND2 * elapsedMs / 1_000_000;
  const maximumSpeed = MAX_MARKER_SPEED_METERS_PER_SECOND / 1000;
  const allowedSpeed = isFirstMovingObservation
    ? Math.min(observedSpeed, maximumSpeed)
    : Math.min(observedSpeed, currentSpeed + accelerationAllowance, maximumSpeed);

  const initialVelocity = isFirstMovingObservation
    ? Math.sign(
      directedDistanceOverride
        ?? signedForwardDelta(displayedDistance, nextSourceDistance, lapLength),
    ) * allowedSpeed
    : displayedVelocity;
  // Bound the newly received source movement by its elapsed-time/speed budget,
  // but include any lag already accumulated by the visible animation. Without
  // that allowance, a normal next sample can exceed the budget from the displayed
  // point and be misclassified as a stale correction, causing a visible snap.
  const sameLapSnapshot = active.input.completedLaps === next.completedLaps;
  const timeAwareDistanceBudget = runningOnTrack && (sameLapSnapshot || plausibleForwardSample)
    ? Math.min(
      MAX_TIME_AWARE_MARKER_ANIMATION_DISTANCE,
      MAX_MARKER_SPEED_METERS_PER_SECOND * elapsedMs / 1000,
    )
    : 0;
  const animationLag = runningOnTrack && (sameLapSnapshot || plausibleForwardSample)
    ? Math.max(0, signedForwardDelta(displayedDistance, previousSourceDistance, lapLength))
    : 0;
  const maxAnimatedDistance = Math.min(
    lapLength * 0.5,
    Math.max(MAX_MARKER_ANIMATION_DISTANCE, timeAwareDistanceBudget + animationLag),
  );

  const plan = planMarkerMotion(
    { ...active.input, lapDistance: displayedDistance },
    next,
    lapLength,
    initialVelocity,
    durationMs,
    allowedSpeed * 1000,
    maxAnimatedDistance,
    directedDistanceOverride,
  );
  if (!plausibleForwardSample || plan.mode !== "smooth") return plan;

  // The Hermite ease-out made every received target decelerate to zero, and its
  // conservative duration could exceed the SSE interval. That repeatedly
  // restarted a slow catch-up and accumulated hundreds of metres of lag. For
  // plausible running samples, interpolate only to the newest authoritative
  // point over the observed interval; never project beyond it. The hard speed
  // ceiling also bounds recovery if a prior plan was already behind.
  const displacement = plan.toDistance - plan.fromDistance;
  const sampleDurationMs = Math.max(
    1,
    Math.ceil(elapsedMs),
    Math.ceil((Math.abs(displacement) * 1000) / MAX_MARKER_SPEED_METERS_PER_SECOND),
  );
  return {
    ...plan,
    durationMs: sampleDurationMs,
    initialVelocity: displacement / sampleDurationMs,
    maxVelocity: MAX_MARKER_SPEED_METERS_PER_SECOND / 1000,
    linear: true,
  };
}

/**
 * Cubic Hermite interpolation preserves rendered distance and speed across SSE
 * retargets; its duration follows the observed snapshot interval so the marker
 * does not finish its animation and sit still while waiting for the next sample.
 */
export function getAnimatedLapDistance(plan: MarkerMotionPlan, elapsedMs: number): number {
  if (plan.durationMs <= 0 || !Number.isFinite(elapsedMs)) return plan.toDistance;
  const progress = Math.max(0, Math.min(1, elapsedMs / plan.durationMs));
  if (plan.linear) return plan.fromDistance + (plan.toDistance - plan.fromDistance) * progress;
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
  if (plan.linear) return (plan.toDistance - plan.fromDistance) / plan.durationMs;
  const progressSquared = progress * progress;
  const startTangent = (plan.initialVelocity ?? 0) * plan.durationMs;
  return (
    ((6 * progressSquared - 6 * progress) * plan.fromDistance
      + (3 * progressSquared - 4 * progress + 1) * startTangent
      + (-6 * progressSquared + 6 * progress) * plan.toDistance)
    / plan.durationMs
  );
}
