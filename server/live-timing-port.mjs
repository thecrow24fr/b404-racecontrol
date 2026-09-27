const DEFAULT_LIVE_TIMING_PORT = 3101;

export function resolveLiveTimingPort(value) {
  if (value === undefined || value.trim() === "") return DEFAULT_LIVE_TIMING_PORT;
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 65535) return parsed;
  return DEFAULT_LIVE_TIMING_PORT;
}
