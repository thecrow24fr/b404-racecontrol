/**
 * Service de découverte des serveurs rFactor 2
 *
 * B404 RaceControl
 *
 * Détecte les serveurs dédiés rF2 en scannant les ports WebUI
 * (pattern : port_jeu - 100, incrément de 3 par profil).
 *
 * Mode débogage intégré — chaque appel API est tracé avec
 * URL, méthode, code HTTP, temps de réponse et erreur.
 *
 * @module server-discovery
 */

// ─── Types ────────────────────────────────────────────────────────────

export interface ServerProfile {
  index: number;
  profile: string;
  gamePort: number;
  webPort: number;
  configPath: string;
  configFiles: string[];
}

export interface DebugLog {
  /** Horodatage */
  time: string;
  /** URL complète appelée */
  url: string;
  /** Méthode HTTP */
  method: string;
  /** Code HTTP retourné (0 = pas de réponse) */
  httpCode: number;
  /** Temps de réponse en ms */
  responseTimeMs: number;
  /** Message d'erreur (null si succès) */
  error: string | null;
  /** Aperçu de la réponse JSON (premiers 200 caractères) */
  responsePreview: string | null;
}

export interface ServerInstance extends ServerProfile {
  status: "online" | "offline";
  serverName: string | null;
  trackName: string | null;
  session: string | null;
  vehicleCount: number | null;
  apiAvailable: boolean;
  driverCount: number | null;
  bestLap: number | null;
  /** Journal de débogage pour ce serveur */
  debug: DebugLog[];
}

// ─── Profils prédéfinis ──────────────────────────────────────────────

const BASE_GAME_PORT = 5397;
const WEBUI_OFFSET = -100;
const PORT_INCREMENT = 3;
const MAX_PROFILES = 7;
export const RF2_INSTALL_PATH = "C:\\Serveur_RF2";

/**
 * Génère la liste de tous les profils de serveurs possibles.
 */
export function getServerProfiles(): ServerProfile[] {
  const profiles: ServerProfile[] = [];
  for (let i = 1; i <= MAX_PROFILES; i++) {
    const gamePort = BASE_GAME_PORT + (i - 1) * PORT_INCREMENT;
    const webPort = gamePort + WEBUI_OFFSET;
    const profileName = `Serveur ${i}`;
    profiles.push({
      index: i,
      profile: profileName,
      gamePort,
      webPort,
      configPath: `UserData/${profileName}/`,
      configFiles: [
        `Dedicated${profileName.toLowerCase()}.ini`,
        "Dedicatedspa.ini",
        "Dedicatedtest.ini",
      ],
    });
  }
  return profiles;
}

// ─── Appel API avec débogage ──────────────────────────────────────────

const API_TIMEOUT = 5000;

interface ProxyResponse<T> {
  success: boolean;
  httpCode: number;
  url: string;
  method: string;
  elapsedMs: number;
  data: T | null;
  error?: string;
}

interface ApiResult<T> {
  data: T | null;
  log: DebugLog;
}

/**
 * URL du proxy API.
 *
 * Utilise le meme domaine que la page (relatif), donc fonctionne
 * dans les deux modes :
 *   - Local  : http://localhost:3001/api/rf2
 *   - Public : https://racecontrol.b404ldc.fr/api/rf2
 *
 * Cloudflare achemine /api/rf2 vers le Tunnel (VM) et le reste
 * vers OVH (pages + emails PHP) — le visiteur ne voit qu'une seule URL.
 */
const PROXY_URL = "/api/rf2";

async function callApi<T>(
  url: string,
  method: string,
  _timeoutMs: number = API_TIMEOUT,
): Promise<ApiResult<T>> {
  const startTime = performance.now();
  const log: DebugLog = {
    time: new Date().toISOString(),
    url,
    method,
    httpCode: 0,
    responseTimeMs: 0,
    error: null,
    responsePreview: null,
  };

  try {
    // Appel via le proxy Next.js (même origine → pas de CORS)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), _timeoutMs + 3000);

    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, method }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    log.responseTimeMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      log.httpCode = res.status;
      log.error = `Proxy HTTP ${res.status}`;
      return { data: null, log };
    }

    const proxyRes = (await res.json()) as ProxyResponse<T>;
    log.httpCode = proxyRes.httpCode;
    log.responseTimeMs = proxyRes.elapsedMs;
    log.responsePreview = JSON.stringify(proxyRes.data).slice(0, 200);

    if (!proxyRes.success) {
      log.error = proxyRes.error || `Erreur proxy (HTTP ${proxyRes.httpCode})`;
      return { data: null, log };
    }

    return { data: proxyRes.data, log };
  } catch (err: unknown) {
    log.responseTimeMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : String(err);
    log.error = `❌ ÉCHEC — ${msg}`;
    return { data: null, log };
  }
}

// ─── Découverte des serveurs ──────────────────────────────────────────

/**
 * Scanne tous les profils de serveurs et retourne leur état
 * avec un journal de débogage complet pour chaque appel.
 *
 * Pour chaque profil, tente deux URLs (localhost puis 127.0.0.1)
 * pour contourner d'éventuels problèmes de résolution DNS.
 */
export async function discoverServers(): Promise<ServerInstance[]> {
  const profiles = getServerProfiles();
  const results: ServerInstance[] = [];

  // Traiter les profils 2 par 2 (pour lisibilité des logs)
  const chunks = chunkArray(profiles, 2);

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (profile) => {
        const debug: DebugLog[] = [];

        // Tentative 1 : localhost
        const url1 = `http://localhost:${profile.webPort}/rest/watch/sessionInfo`;
        const result1 = await callApi<Record<string, unknown>>(url1, "GET");
        debug.push(result1.log);

        // Si localhost a échoué, tentative 2 : 127.0.0.1
        let sessionInfo = result1.data;
        if (!sessionInfo) {
          const url2 = `http://127.0.0.1:${profile.webPort}/rest/watch/sessionInfo`;
          const result2 = await callApi<Record<string, unknown>>(url2, "GET");
          debug.push(result2.log);
          sessionInfo = result2.data;
        }

        // Si les deux ont échoué, retourner inactif
        if (!sessionInfo) {
          return {
            ...profile,
            status: "offline" as const,
            serverName: null,
            trackName: null,
            session: null,
            vehicleCount: null,
            apiAvailable: false,
            driverCount: null,
            bestLap: null,
            debug,
          };
        }

        // Succès ! Récupérer le classement
        const standingsUrl = `http://localhost:${profile.webPort}/rest/watch/standings`;
        const standingsResult = await callApi<Record<string, unknown>[]>(
          standingsUrl,
          "GET",
        );
        debug.push(standingsResult.log);

        let bestLap: number | null = null;
        let driverCount = 0;
        if (standingsResult.data && standingsResult.data.length > 0) {
          driverCount = standingsResult.data.length;
          for (const v of standingsResult.data) {
            const bt = v.bestLapTime as number;
            if (bt > 0 && (bestLap === null || bt < bestLap)) {
              bestLap = bt;
            }
          }
        }

        const playerFileName =
          (sessionInfo.playerFileName as string) || profile.profile;

        return {
          ...profile,
          profile: playerFileName,
          status: "online" as const,
          serverName: (sessionInfo.serverName as string) || null,
          trackName: (sessionInfo.trackName as string) || null,
          session: (sessionInfo.session as string) || null,
          vehicleCount: (sessionInfo.numberOfVehicles as number) || null,
          apiAvailable: true,
          driverCount,
          bestLap,
          debug,
        };
      }),
    );

    results.push(...chunkResults);
  }

  results.sort((a, b) => a.index - b.index);
  return results;
}

// ─── Utilitaires ──────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function formatLapTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3);
  return `${m}:${s.padStart(6, "0")}`;
}

export function getStatusLabel(status: "online" | "offline"): {
  label: string;
  color: string;
  dot: string;
} {
  if (status === "online") {
    return {
      label: "Actif",
      color: "text-emerald-400",
      dot: "bg-emerald-400",
    };
  }
  return {
    label: "Inactif",
    color: "text-gray-500",
    dot: "bg-gray-500",
  };
}
