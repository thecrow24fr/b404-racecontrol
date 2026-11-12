const DEFAULT_PUBLIC_LIVE_TIMING_API_BASE_URL = "https://api.b404ldc.fr";

export function buildPublicLiveTimingApiUrl(path, configuredBaseUrl) {
  const configured = typeof configuredBaseUrl === "string" ? configuredBaseUrl.trim() : "";
  const baseUrl = (configured || DEFAULT_PUBLIC_LIVE_TIMING_API_BASE_URL).replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}/api/public/live-timing${suffix}`;
}
