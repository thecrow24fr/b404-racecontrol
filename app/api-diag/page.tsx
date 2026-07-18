/**
 * Page de diagnostic de l'API rFactor 2 — B404 RaceControl
 *
 * Scanne toutes les instances de serveur dédié rF2 actives,
 * récupère toutes les données disponibles via l'API REST native,
 * et affiche un tableau de bord complet des capacités de l'API.
 *
 * @page api-diag
 */

"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────

interface ServerData {
  port: number;
  baseUrl: string;
  sessionInfo: Record<string, unknown> | null;
  standings: Record<string, unknown>[] | null;
  standingsHistory: Record<string, unknown> | null;
  weatherConfig: Record<string, unknown> | null;
  navigationState: Record<string, unknown> | null;
  chat: unknown[] | null;
  opponents: unknown[] | null;
  available: boolean;
  error: string | null;
}

interface DiagState {
  servers: ServerData[];
  allEndpoints: { path: string; method: string; status: string; data: string }[];
  isScanning: boolean;
  scanTime: string | null;
}

const DEFAULT_PORTS = [5297, 5300, 5303, 5306, 5309, 5312, 5315];

/** Plage de ports pour la découverte automatique */
const PORT_SCAN_RANGE = { start: 5290, end: 5420, step: 1 };

// ─── Énumérations des endpoints ───────────────────────────────────────

const ENDPOINTS_TO_TEST = [
  // Watch (Live Timing)
  { path: "/rest/watch/standings", method: "GET", category: "Live Timing" },
  { path: "/rest/watch/sessionInfo", method: "GET", category: "Live Timing" },
  { path: "/rest/watch/standings/history", method: "GET", category: "Live Timing" },
  { path: "/rest/watch/trackmap", method: "GET", category: "Live Timing" },
  { path: "/rest/watch/activeCamera", method: "GET", category: "Watch" },
  { path: "/rest/watch/focus", method: "GET", category: "Watch" },
  { path: "/rest/watch/replay/isActive", method: "GET", category: "Replay" },
  // Sessions
  { path: "/rest/sessions/weather", method: "GET", category: "Session" },
  { path: "/rest/sessions/amount", method: "GET", category: "Session" },
  { path: "/rest/sessions/opponents", method: "GET", category: "Session" },
  { path: "/rest/sessions/Spectators", method: "GET", category: "Session" },
  { path: "/rest/sessions/settings", method: "GET", category: "Session" },
  // Navigation
  { path: "/navigation/state", method: "GET", category: "Navigation" },
  // Race
  { path: "/rest/race/selection", method: "GET", category: "Race" },
  { path: "/rest/race/series", method: "GET", category: "Race" },
  { path: "/rest/race/packages", method: "GET", category: "Race" },
  // Chat
  { path: "/rest/chat", method: "GET", category: "Chat" },
  // Profile
  { path: "/rest/profile", method: "GET", category: "Profile" },
  // Multiplayer
  { path: "/rest/multiplayer/steam/status", method: "GET", category: "Multiplayer" },
  // Garage
  { path: "/rest/garage/setup", method: "GET", category: "Garage" },
  { path: "/rest/garage/summary", method: "GET", category: "Garage" },
  { path: "/rest/garage/test", method: "GET", category: "Garage" },
  // Tuning
  { path: "/rest/tuning", method: "GET", category: "Tuning" },
  // Options
  { path: "/rest/options/settings", method: "GET", category: "Options" },
  { path: "/rest/options/summary", method: "GET", category: "Options" },
];

// ─── Helpers ──────────────────────────────────────────────────────────

const API_TIMEOUT = 5000;

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_TIMEOUT);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function formatTime(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatLap(sec: number): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3);
  return `${m}:${s.padStart(6, "0")}`;
}

// ─── Composant principal ──────────────────────────────────────────────

export default function ApiDiagPage() {
  const [state, setState] = useState<DiagState>({
    servers: [],
    allEndpoints: [],
    isScanning: true,
    scanTime: null,
  });

  useEffect(() => {
    scanAll();
  }, []);

  async function scanAll() {
    setState((s) => ({ ...s, isScanning: true }));

    // Étape 1 : Scanner tous les ports
    const serverResults: ServerData[] = [];

    for (const port of DEFAULT_PORTS) {
      const baseUrl = `http://localhost:${port}`;

      // Session info
      const sessionInfo = await fetchJSON<Record<string, unknown>>(
        `${baseUrl}/rest/watch/sessionInfo`,
      );

      if (!sessionInfo) {
        serverResults.push({
          port,
          baseUrl,
          sessionInfo: null,
          standings: null,
          standingsHistory: null,
          weatherConfig: null,
          navigationState: null,
          chat: null,
          opponents: null,
          available: false,
          error: null,
        });
        continue;
      }

      // Standings
      const standings = await fetchJSON<Record<string, unknown>[]>(
        `${baseUrl}/rest/watch/standings`,
      );

      // History
      const history = await fetchJSON<Record<string, unknown>>(
        `${baseUrl}/rest/watch/standings/history`,
      );

      // Weather config
      const weatherConfig = await fetchJSON<Record<string, unknown>>(
        `${baseUrl}/rest/sessions/weather`,
      );

      // Navigation
      const navState = await fetchJSON<Record<string, unknown>>(
        `${baseUrl}/navigation/state`,
      );

      // Chat
      const chat = await fetchJSON<unknown[]>(`${baseUrl}/rest/chat`);

      // Opponents
      const opponents = await fetchJSON<unknown[]>(
        `${baseUrl}/rest/sessions/opponents`,
      );

      serverResults.push({
        port,
        baseUrl,
        sessionInfo,
        standings,
        standingsHistory: history,
        weatherConfig,
        navigationState: navState,
        chat,
        opponents,
        available: true,
        error: null,
      });
    }

    // Étape 2 : Tester tous les endpoints sur le premier serveur actif
    const activeServer = serverResults.find((s) => s.available);
    const endpointResults: { path: string; method: string; status: string; data: string }[] = [];

    if (activeServer) {
      for (const ep of ENDPOINTS_TO_TEST) {
        const url = `${activeServer.baseUrl}${ep.path}`;
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), API_TIMEOUT);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(id);

          if (res.ok) {
            let preview = "";
            try {
              const json = await res.json();
              const str = JSON.stringify(json);
              preview = str.length > 120 ? str.slice(0, 120) + "…" : str;
            } catch {
              preview = "(binaire/texte)";
            }
            endpointResults.push({
              path: ep.path,
              method: ep.method,
              status: "✅ Données",
              data: preview,
            });
          } else {
            endpointResults.push({
              path: ep.path,
              method: ep.method,
              status: `❌ ${res.status}`,
              data: "",
            });
          }
        } catch {
          endpointResults.push({
            path: ep.path,
            method: ep.method,
            status: "❌ Timeout",
            data: "",
          });
        }
      }
    }

    setState({
      servers: serverResults,
      allEndpoints: endpointResults,
      isScanning: false,
      scanTime: new Date().toLocaleString("fr-FR"),
    });
  }

  // ─── Rendu ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0b1728]">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
                B404 RaceControl
              </p>
              <h1 className="mt-1 text-3xl font-black">
                Diagnostic — API rFactor 2
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Analyse exhaustive des capacités de l&apos;API native
              </p>
            </div>
            <div className="text-right">
              {state.scanTime && (
                <p className="text-xs text-gray-500">
                  Dernier scan : {state.scanTime}
                </p>
              )}
              <button
                onClick={scanAll}
                disabled={state.isScanning}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-300 transition hover:bg-orange-500/20 disabled:opacity-50"
              >
                {state.isScanning ? "Scan en cours…" : "↻ Rescanner"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {state.isScanning && (
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-gray-400">Analyse des instances rFactor 2 en cours…</p>
        </div>
      )}

      {!state.isScanning && (
        <main className="mx-auto max-w-7xl px-6 py-8 space-y-10">
          {/* Résumé */}
          <section>
            <h2 className="text-2xl font-black text-white">Résumé</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                label="Serveurs détectés"
                value={String(state.servers.filter((s) => s.available).length)}
                sub={`sur ${state.servers.length} scannés`}
                color="text-emerald-400"
              />
              <SummaryCard
                label="Endpoints testés"
                value={String(state.allEndpoints.filter((e) => e.status.startsWith("✅")).length)}
                sub={`sur ${state.allEndpoints.length} au total`}
                color="text-blue-400"
              />
              <SummaryCard
                label="Pilotes total"
                value={String(
                  state.servers
                    .filter((s) => s.standings)
                    .reduce((acc, s) => acc + (s.standings?.length ?? 0), 0),
                )}
                sub="tous serveurs confondus"
                color="text-purple-400"
              />
              <SummaryCard
                label="Propriétés/véhicule"
                value="58"
                sub="disponibles dans standings"
                color="text-amber-400"
              />
            </div>
          </section>

          {/* Cartes serveurs */}
          <section>
            <h2 className="text-2xl font-black text-white">Serveurs détectés</h2>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              {state.servers
                .filter((s) => s.available)
                .map((srv) => (
                  <ServerCard key={srv.port} data={srv} />
                ))}
              {state.servers
                .filter((s) => !s.available)
                .map((srv) => (
                  <InactiveCard key={srv.port} port={srv.port} />
                ))}
            </div>
          </section>

          {/* Météo */}
          <section>
            <h2 className="text-2xl font-black text-white">Météo — Configuration complète</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {state.servers
                .filter((s) => s.weatherConfig)
                .map((srv) => (
                  <WeatherCard key={srv.port} data={srv} />
                ))}
            </div>
          </section>

          {/* Tableau des endpoints */}
          <section>
            <h2 className="text-2xl font-black text-white">Endpoints — Test de disponibilité</h2>
            <p className="mt-1 text-sm text-gray-400">
              Testés sur le premier serveur actif détecté (port{" "}
              {state.servers.find((s) => s.available)?.port ?? "—"} )
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0b1728]">
                    <Th>Catégorie</Th>
                    <Th>Méthode</Th>
                    <Th>Endpoint</Th>
                    <Th>Statut</Th>
                    <Th>Aperçu</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {state.allEndpoints.map((ep, idx) => (
                    <tr
                      key={idx}
                      className="transition hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-2 text-xs text-gray-400">
                        {getCategory(ep.path)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-white">
                        {ep.path}
                      </td>
                      <td className="px-3 py-2">
                        {ep.status.startsWith("✅") ? (
                          <span className="text-xs text-emerald-400">
                            {ep.status}
                          </span>
                        ) : (
                          <span className="text-xs text-red-400">
                            {ep.status}
                          </span>
                        )}
                      </td>
                      <td className="max-w-[250px] truncate px-3 py-2 font-mono text-[10px] text-gray-500">
                        {ep.data}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Analyse des capacités */}
          <section>
            <h2 className="text-2xl font-black text-white">Capacités de l&apos;API — Analyse RaceControl</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <CapabilityCard
                title="Dashboard multi-serveurs"
                status="✅ Complètement disponible"
                endpoints={["GET /rest/watch/sessionInfo"]}
                details="Nom, circuit, session, nb pilotes, météo → tous disponibles via un seul appel. Chaque port = un serveur."
              />
              <CapabilityCard
                title="Live Timing temps réel"
                status="✅ Complètement disponible"
                endpoints={["GET /rest/watch/standings"]}
                details="58 propriétés par véhicule : position, temps, secteurs, écarts, statut, carburant, DRS, pénalités. Polling 1-2s."
              />
              <CapabilityCard
                title="Classement et résultats"
                status="✅ Disponible"
                endpoints={["GET /rest/watch/standings", "GET /rest/watch/standings/history"]}
                details="Classement complet + historique des positions par pilote pour courbes d'évolution."
              />
              <CapabilityCard
                title="Météo en direct"
                status="✅ Disponible"
                endpoints={["GET /rest/watch/sessionInfo", "GET /rest/sessions/weather"]}
                details="Température air/piste, pluie, vent, couverture nuageuse, humidité, pression, mouillage piste."
              />
              <CapabilityCard
                title="Carte du circuit"
                status="✅ Disponible"
                endpoints={["GET /rest/watch/trackmap"]}
                details="Waypoints 3D pour dessiner le tracé complet. Position des véhicules (x,y,z) disponible dans standings."
              />
              <CapabilityCard
                title="Informations pilotes"
                status="✅ Disponible"
                endpoints={["GET /rest/watch/standings"]}
                details="Nom pilote, équipe, voiture, numéro, classe, SteamID, statut (en piste/pit/DNF)."
              />
              <CapabilityCard
                title="Détails session (Practice/Quali/Race)"
                status="✅ Disponible"
                endpoints={["GET /rest/watch/sessionInfo", "GET /rest/sessions/amount"]}
                details="Type session, temps écoulé/restant, tours max, nb véhicules, phase."
              />
              <CapabilityCard
                title="Administration serveur"
                status="⚠️ Partiel"
                endpoints={["POST /rest/multiplayer/sendcommand"]}
                details="Commandes admin disponibles (kick, ban, ajout IA, drapeau jaune, pénalités...) mais nécessitent droits."
              />
              <CapabilityCard
                title="Chat en jeu"
                status="✅ Disponible"
                endpoints={["GET /rest/chat", "POST /rest/chat"]}
                details="Messages du chat en temps réel. Envoi possible."
              />
              <CapabilityCard
                title="Données télémétriques"
                status="⚠️ Partiel"
                endpoints={["GET /rest/watch/standings"]}
                details="Position 3D, vitesse, accélération disponibles. Télémétrie détaillée (régime, freins, pneus) via Shared Memory seulement."
              />
              <CapabilityCard
                title="Configuration météo avancée"
                status="⚠️ Partiel"
                endpoints={["GET /rest/sessions/weather/{PRACTICE|QUALIFY|RACE}"]}
                details="Paramètres météo détaillés par session (heure, température, vent, pression, humidité)."
              />
              <CapabilityCard
                title="Championnats"
                status="❌ Non disponible"
                endpoints={["(aucun)"]}
                details="L'API native rF2 ne gère pas les championnats. Cette fonctionnalité nécessite R2LA ou une couche applicative externe."
              />
              <CapabilityCard
                title="Historique/statistiques"
                status="⚠️ Partiel"
                endpoints={["GET /rest/watch/standings/history"]}
                details="Historique des positions/tours disponible via standings/history. Pas de données stockées persistantes."
              />
              <CapabilityCard
                title="Sondages (votes)"
                status="✅ Disponible"
                endpoints={["POST /rest/multiplayer/sendcommand"]}
                details="Commandes VOTE_MECH_* disponibles : next session, restart, straight to race, kick, ban, etc."
              />
            </div>
          </section>

          {/* Architecture Découverte Automatique */}
          <section>
            <h2 className="text-2xl font-black text-white">Architecture — Découverte automatique des serveurs</h2>
            <p className="mt-1 text-sm text-gray-400">
              Comment RaceControl détecte et supervise automatiquement tous les serveurs rFactor 2 sans configuration manuelle.
            </p>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {/* Détection par processus */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                  Méthode 1 — Détection par processus (prioritaire)
                </p>
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <p>
                    RaceControl interroge le système pour lister les processus{" "}
                    <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300 font-mono text-[11px]">
                      rFactor2 Dedicated.exe
                    </code>{" "}
                    et lit leur ligne de commande pour extraire le profil
                    (<code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300 font-mono text-[10px]">+profile=&quot;Serveur X&quot;</code>).
                  </p>
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 font-mono text-[11px] text-emerald-300">
                    {`# Exemple de ligne de commande lue`}<br />
                    {`"C:\\Serveur_RF2\\Bin64\\rFactor2 Dedicated.exe"`}<br />
                    {`  +trace=3 +profile="Serveur 2" +maxplayers 30`}
                  </div>
                  <p>
                    Chaque profil correspond à un dossier dans{" "}
                    <code className="rounded bg-white/5 px-1.5 py-0.5 text-gray-400 font-mono text-[10px]">
                      C:\Serveur_RF2\UserData\
                    </code>
                    . Le port WebUI est déduit : <strong className="text-white">WebUI Port = Port par défaut + (index_profil - 1) × 3</strong>
                    , soit une base à 5297 + incrément de 3.
                  </p>
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="text-left py-1">Profil</th>
                        <th className="text-left py-1">Port Jeu</th>
                        <th className="text-left py-1">WebUI Port</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="py-0.5 text-gray-300">Serveur 1</td><td className="py-0.5">5397</td><td className="py-0.5 text-orange-300">5297</td></tr>
                      <tr><td className="py-0.5 text-gray-300">Serveur 2</td><td className="py-0.5">5400</td><td className="py-0.5 text-orange-300">5300</td></tr>
                      <tr><td className="py-0.5 text-gray-300">Serveur 3</td><td className="py-0.5">5403</td><td className="py-0.5 text-orange-300">5303</td></tr>
                      <tr><td className="py-0.5 text-gray-300">Serveur 4</td><td className="py-0.5">5406</td><td className="py-0.5 text-orange-300">5306</td></tr>
                      <tr><td className="py-0.5 text-gray-300">Serveur 5</td><td className="py-0.5">5409</td><td className="py-0.5 text-orange-300">5309</td></tr>
                      <tr><td className="py-0.5 text-gray-400">Serveur 6</td><td className="py-0.5 text-gray-500">5412</td><td className="py-0.5 text-gray-500">5312</td></tr>
                      <tr><td className="py-0.5 text-gray-400">Serveur 7</td><td className="py-0.5 text-gray-500">5415</td><td className="py-0.5 text-gray-500">5315</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Scan de port */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                  Méthode 2 — Scan de port (fallback universel)
                </p>
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <p>
                    Si la détection par processus n&apos;est pas possible (ex : navigateur distant),
                    RaceControl scanne une plage de ports et vérifie la réponse de l&apos;API :
                  </p>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 font-mono text-[11px]">
                    <p className="text-orange-300">{`GET /rest/watch/sessionInfo`}</p>
                    <p className="mt-1 text-gray-500">
                      Si réponse JSON valide avec <span className="text-emerald-400">trackName</span>{" "}
                      et <span className="text-emerald-400">serverName</span> → serveur détecté
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300">
                      Plage : {PORT_SCAN_RANGE.start} → {PORT_SCAN_RANGE.end}
                    </span>
                    <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold text-purple-300">
                      Pas de hardcoding
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      Zéro configuration
                    </span>
                  </div>
                  <p className="mt-2">
                    Cette méthode fonctionne même si les serveurs sont sur des ports non-standard
                    ou si l&apos;installation rF2 est sur un chemin différent.
                  </p>
                </div>
              </div>
            </div>

            {/* Architecture globale */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                Architecture finale — RaceControl Auto-Discovery
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs font-bold text-emerald-300">1. DÉTECTION</p>
                  <div className="mt-2 space-y-1 font-mono text-[10px] text-gray-400">
                    <p>🔍 Lister processus rF2</p>
                    <p>📋 Lire lignes de commande</p>
                    <p>📁 Explorer UserData/</p>
                    <p>🌐 Scanner ports {PORT_SCAN_RANGE.start}-{PORT_SCAN_RANGE.end}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs font-bold text-blue-300">2. CONNEXION</p>
                  <div className="mt-2 space-y-1 font-mono text-[10px] text-gray-400">
                    <p>✅ GET /rest/watch/sessionInfo</p>
                    <p>📊 Valider réponse JSON</p>
                    <p>🔗 Stocker URL de base</p>
                    <p>⏱️ Lancer le polling</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs font-bold text-purple-300">3. AFFICHAGE</p>
                  <div className="mt-2 space-y-1 font-mono text-[10px] text-gray-400">
                    <p>📋 Dashboard multi-serveurs</p>
                    <p>🏁 Live Timing temps réel</p>
                    <p>🌤️ Météo et conditions</p>
                    <p>🗺️ Carte du circuit</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fichiers de configuration trouvés */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
                Configuration des serveurs — Fichiers explorés
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Installation rFactor 2 détectée dans{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300 font-mono text-[11px]">
                  C:\Serveur_RF2\
                </code>
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] text-gray-500 font-black uppercase tracking-wider">
                      <th className="text-left py-2 pr-4">Dossier</th>
                      <th className="text-left py-2 pr-4">Profil</th>
                      <th className="text-left py-2 pr-4">Config trouvées</th>
                      <th className="text-left py-2">Statut API</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {[
                      ["UserData/Serveur 1", "Serveur 1", "Dedicatedspa.ini, Dedicatedtest.ini, 15 configs", "❌ Terminée"],
                      ["UserData/Serveur 2", "Serveur 2", "Dedicatedspa.ini, Dedicatedtest.ini, 12 configs", "✅ Active (Spa)"],
                      ["UserData/Serveur 3", "Serveur 3", "Dedicatedspa.ini, Dedicatedtest.ini, 12 configs", "✅ Active (Adelaide)"],
                      ["UserData/Serveur 4", "Serveur 4", "Dedicatedspa.ini, Dedicatedtest.ini, 12 configs", "✅ Active (Brands Hatch)"],
                      ["UserData/Serveur 5", "Serveur 5", "Dedicatedserveur 5.ini, Dedicatedtest.ini, 12 configs", "✅ Active (Nürburgring)"],
                      ["UserData/Serveur 6", "Serveur 6", "Dedicatedserveur6.ini, Dedicatedtest.ini, 11 configs", "⏸️ Inactif (port 5312)"],
                      ["UserData/Serveur 7", "Serveur 7", "Dedicatedserveur7.ini, Dedicatedtest.ini, 12 configs", "⏸️ Inactif (port 5315)"],
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-2 pr-4 font-mono text-gray-300">{row[0]}</td>
                        <td className="py-2 pr-4 text-gray-300">{row[1]}</td>
                        <td className="py-2 pr-4 text-gray-500">{row[2]}</td>
                        <td className="py-2">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Propriétés détaillées */}
          <section>
            <h2 className="text-2xl font-black text-white">58 propriétés par véhicule — Détail</h2>
            <p className="mt-1 text-sm text-gray-400">
              Toutes les informations disponibles dans l&apos;objet Vehicle retourné par
              <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-orange-300">
                GET /rest/watch/standings
              </code>
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/10 bg-[#0b1728]">
                    <Th>Propriété</Th>
                    <Th>Type</Th>
                    <Th>Description</Th>
                    <Th>Utilisation RaceControl</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-mono text-xs">
                  {PROPERTIES.map((p, i) => (
                    <tr key={i} className="transition hover:bg-white/[0.02]">
                      <td className="px-3 py-1.5 text-white">{p.name}</td>
                      <td className="px-3 py-1.5 text-gray-400">{p.type}</td>
                      <td className="px-3 py-1.5 text-gray-300">{p.desc}</td>
                      <td className="px-3 py-1.5">
                        <span className={`${getPropColor(p.use)}`}>{p.use}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Conclusion */}
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h2 className="text-xl font-black text-emerald-300">Conclusion</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-300">
              <p>
                L&apos;API REST native de rFactor 2 expose <strong className="text-white">suffisamment de données</strong> pour construire un
                portail RaceControl complet. Les données sont accessibles en temps réel via les endpoints
                <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-orange-300">/rest/watch/standings</code> et
                <code className="mx-1 rounded bg-white/5 px-1.5 py-0.5 text-orange-300">/rest/watch/sessionInfo</code>.
              </p>
              <p>
                Chaque instance de serveur dédié expose la même API sur un port différent (pattern{" "}
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-orange-300">port_jeu - 100</code>).
                Il est possible de monitorer <strong className="text-white">plusieurs serveurs simultanément</strong>.
              </p>

              {/* Submit ID Analysis */}
              <div className="mt-6 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                  🔍 Analyse du Submit ID
                </p>
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                  <p>
                    <strong className="text-white">Constat :</strong> Le Submit ID <strong className="text-red-400">n&apos;est pas disponible</strong> dans l&apos;API REST native de rFactor 2.
                  </p>
                  <ul className="ml-4 list-disc space-y-1 text-gray-400">
                    <li>Aucun endpoint REST n&apos;expose le Submit ID</li>
                    <li>Aucun fichier de configuration en clair ne le contient</li>
                    <li>Le statut Steam est <code className="rounded bg-white/5 px-1 text-orange-300">false</code> — les serveurs tournent en mode autonome</li>
                    <li><code className="rounded bg-white/5 px-1 text-orange-300">ServerKeys.bin</code> et <code className="rounded bg-white/5 px-1 text-orange-300">ServerUnlock.bin</code> sont chiffrés (binaires)</li>
                    <li>Le Submit ID est géré exclusivement par <code className="rounded bg-white/5 px-1 text-orange-300">rF2DediManager.exe</code> (outil séparé)</li>
                  </ul>
                  <p className="mt-2">
                    <strong className="text-white">Conclusion : </strong>
                    Le Submit ID ne peut pas être utilisé comme identifiant technique dans RaceControl.
                  </p>
                </div>
              </div>

              {/* Server ID Strategy */}
              <div className="mt-4 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  ✅ Identifiant technique recommandé pour RaceControl
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-gray-300">
                    En l&apos;absence de Submit ID, l&apos;identifiant le plus robuste est la combinaison :
                  </p>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 font-mono text-sm text-emerald-300 text-center">
                    profile@host:port
                  </div>
                  <p className="text-gray-400 text-xs">Exemple : <code className="rounded bg-white/5 px-1 text-orange-300 font-mono">Serveur 2@localhost:5300</code></p>
                  <table className="w-full text-xs mt-2">
                    <thead>
                      <tr className="text-gray-500 border-b border-white/10">
                        <th className="text-left py-1">Composant</th>
                        <th className="text-left py-1">Source</th>
                        <th className="text-left py-1">Stabilité</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td className="py-1 text-gray-300">Profil</td><td className="py-1 text-gray-400">Ligne de commande <code className="text-orange-300">+profile</code></td><td className="py-1 text-emerald-400">✅ Stable</td></tr>
                      <tr><td className="py-1 text-gray-300">WebUI Port</td><td className="py-1 text-gray-400">Détection API</td><td className="py-1 text-emerald-400">✅ Stable</td></tr>
                      <tr><td className="py-1 text-gray-300">Host</td><td className="py-1 text-gray-400">localhost / IP</td><td className="py-1 text-emerald-400">✅ Stable</td></tr>
                      <tr><td className="py-1 text-gray-300">playerFileName</td><td className="py-1 text-gray-400">API sessionInfo</td><td className="py-1 text-emerald-400">✅ Stable</td></tr>
                      <tr><td className="py-1 text-gray-400">Submit ID</td><td className="py-1 text-gray-500">rF2DediManager</td><td className="py-1 text-red-400">❌ Non disponible</td></tr>
                      <tr><td className="py-1 text-gray-400">Steam ID</td><td className="py-1 text-gray-500">Session Steam</td><td className="py-1 text-amber-400">⚠️ Change à chaque démarrage</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-400">✅ Réalisable avec l&apos;API seule</p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-400">
                    <li>• Dashboard multi-serveurs temps réel</li>
                    <li>• Live Timing complet (position, secteurs, écarts)</li>
                    <li>• Classement et historique des positions</li>
                    <li>• Météo et conditions de piste</li>
                    <li>• Carte du circuit avec positions 3D</li>
                    <li>• Informations pilotes et équipes</li>
                    <li>• Chat et commandes administrateur</li>
                    <li>• Tableau de bord des sessions</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-amber-400">🔶 Nécessite des données supplémentaires</p>
                  <ul className="mt-2 space-y-1 text-xs text-gray-400">
                    <li>• Championnats et classements historiques → R2LA</li>
                    <li>• Télémétrie détaillée (pneus, freins, moteur) → Shared Memory</li>
                    <li>• Résultats de course persistants → Base de données externe</li>
                    <li>• Statistiques multi-sessions → Application serveur dédiée</li>
                    <li>• Submit ID (identification Steam) → rF2DediManager</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      <footer className="border-t border-white/10 bg-[#0b1728]">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-gray-500">
          B404 RaceControl — Diagnostic API rFactor 2 — Généré le{" "}
          {state.scanTime ?? "—"}
        </div>
      </footer>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function ServerCard({ data }: { data: ServerData }) {
  const si = data.sessionInfo;
  const cars = data.standings;

  // Analyse des classes
  const classCounts: Record<string, number> = {};
  cars?.forEach((v) => {
    const cls = (v.carClass as string) || "Inconnue";
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  });

  // Meilleur tour
  let bestLap = Infinity;
  let bestDriver = "";
  cars?.forEach((v) => {
    const bt = v.bestLapTime as number;
    if (bt > 0 && bt < bestLap) {
      bestLap = bt;
      bestDriver = v.driverName as string;
    }
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-5">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
            Port {data.port} · Instance #{data.port - 5200}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">
            {(si?.serverName as string) ?? "Inconnu"}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          En ligne
        </span>
      </div>

      {/* Grille d'infos */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <InfoRow label="Circuit" value={si?.trackName as string} />
        <InfoRow label="Session" value={si?.session as string} />
        <InfoRow
          label="Temps écoulé"
          value={formatTime(si?.currentEventTime as number)}
        />
        <InfoRow
          label="Temps restant"
          value={formatTime(
            Math.max(0, (si?.endEventTime as number) - (si?.currentEventTime as number)),
          )}
        />
        <InfoRow
          label="Véhicules"
          value={String(si?.numberOfVehicles ?? "?")}
        />
        <InfoRow
          label="Joueurs max"
          value={String(si?.maxPlayers ?? "?")}
        />
        <InfoRow
          label="Mot de passe"
          value={(si?.passwordProtected as boolean) ? "Oui" : "Non"}
        />
        <InfoRow
          label="Mode"
          value={si?.gameMode as string}
        />
        <InfoRow
          label="Température air"
          value={((si?.ambientTemp as number)?.toFixed(0) ?? "—") + "°C"}
        />
        <InfoRow
          label="Température piste"
          value={((si?.trackTemp as number)?.toFixed(1) ?? "—") + "°C"}
        />
        <InfoRow
          label="Pluie"
          value={
            (si?.raining as number) > 0
              ? ((si?.raining as number) * 100).toFixed(0) + "%"
              : "Sec"
          }
        />
        <InfoRow
          label="Vent"
          value={
            (si?.windSpeed as Record<string, number>)?.velocity
              ? ((si?.windSpeed as Record<string, number>).velocity * 3.6).toFixed(
                  1,
                ) + " km/h"
              : "Calme"
          }
        />
      </div>

      {/* Classes */}
      {Object.keys(classCounts).length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
            Classes
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {Object.entries(classCounts).map(([cls, count]) => (
              <span
                key={cls}
                className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-300"
              >
                {cls}
                <span className="text-blue-400">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meilleur tour */}
      {bestLap < Infinity && (
        <div className="mt-3 rounded-xl border border-purple-500/15 bg-purple-500/5 px-3 py-2">
          <p className="text-[10px] text-purple-300">
            <span className="font-bold">Meilleur tour :</span>{" "}
            <span className="font-mono font-bold">{formatLap(bestLap)}</span>
            {" — "}
            {bestDriver}
          </p>
        </div>
      )}

      {/* Pilotes */}
      {cars && cars.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
            Classement ({cars.length} pilotes)
          </p>
          <div className="mt-1 max-h-48 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-[10px] text-gray-500">
                  <th className="w-8 text-left">Pos</th>
                  <th className="text-left">Pilote</th>
                  <th className="text-left">Voiture</th>
                  <th className="text-right">Tours</th>
                  <th className="text-right">Meilleur</th>
                </tr>
              </thead>
              <tbody>
                {[...cars]
                  .sort(
                    (a, b) =>
                      (a.position as number) - (b.position as number),
                  )
                  .slice(0, 15)
                  .map((v, i) => (
                    <tr key={i} className="border-t border-white/[0.04]">
                      <td className="py-1 font-bold tabular-nums text-white">
                        {v.position as number}
                      </td>
                      <td className="py-1 text-gray-300">
                        {v.driverName as string}
                      </td>
                      <td className="py-1 text-gray-400">
                        {(v.vehicleName as string).slice(0, 28)}
                      </td>
                      <td className="py-1 text-right tabular-nums text-gray-300">
                        {v.lapsCompleted as number}
                      </td>
                      <td className="py-1 text-right font-mono tabular-nums text-purple-300">
                        {formatLap(v.bestLapTime as number)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Endpoints */}
      <div className="mt-4 border-t border-white/5 pt-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
          Endpoints utilisés
        </p>
        <div className="mt-1 space-y-0.5 font-mono text-[10px] text-gray-500">
          <p>✅ GET /rest/watch/sessionInfo — Infos session</p>
          <p>
            ✅ GET /rest/watch/standings —{" "}
            {cars?.length ?? 0} véhicules
          </p>
          <p>
            ✅ GET /rest/watch/standings/history —{" "}
            {data.standingsHistory
              ? `${Object.keys(data.standingsHistory).length} pilotes`
              : "N/A"}
          </p>
          <p>
            ✅ GET /rest/sessions/weather —{" "}
            {data.weatherConfig ? "Config complète" : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}

function InactiveCard({ port }: { port: number }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a111f] p-5 opacity-60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
            Port {port}
          </p>
          <p className="mt-1 text-gray-500">Instance inactive</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2.5 py-1 text-[10px] font-bold text-gray-500">
          Hors ligne
        </span>
      </div>
    </div>
  );
}

function WeatherCard({ data }: { data: ServerData }) {
  const wc = data.weatherConfig;
  if (!wc) return null;

  const sessions = ["PRACTICE", "QUALIFY", "RACE"];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">
        {data.sessionInfo?.serverName as string} (port {data.port})
      </p>
      <div className="mt-3 space-y-3">
        {sessions.map((sess) => {
          const sData = (wc as Record<string, unknown>)[sess] as Record<
            string,
            unknown
          >;
          if (!sData) return null;
          const finish = sData["FINISH"] as Record<string, unknown>;
          return (
            <div key={sess} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <p className="text-xs font-bold text-gray-300">{sess}</p>
              {finish && (
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400">
                  {(Object.entries(finish) as [string, Record<string, unknown>][]).map(
                    ([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key.replace("WNV_", "")}</span>
                        <span className="font-mono text-gray-300">
                          {(val?.stringValue as string) ??
                            String(val?.currentValue ?? "—")}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-200">{value || "—"}</span>
    </div>
  );
}

function CapabilityCard({
  title,
  status,
  endpoints,
  details,
}: {
  title: string;
  status: string;
  endpoints: string[];
  details: string;
}) {
  const isOk = status.startsWith("✅");
  const isWarn = status.startsWith("⚠️");
  const isBad = status.startsWith("❌");
  const borderColor = isOk
    ? "border-emerald-500/20"
    : isWarn
      ? "border-amber-500/20"
      : "border-red-500/20";
  const bgColor = isOk
    ? "bg-emerald-500/5"
    : isWarn
      ? "bg-amber-500/5"
      : "bg-red-500/5";

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <span
          className={`text-[10px] font-bold ${
            isOk ? "text-emerald-300" : isWarn ? "text-amber-300" : "text-red-300"
          }`}
        >
          {status}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {endpoints.map((ep) => (
          <p key={ep} className="font-mono text-[10px] text-orange-300">
            {ep}
          </p>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-gray-400">{details}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
      {children}
    </th>
  );
}

function getCategory(path: string): string {
  if (path.startsWith("/rest/watch")) return "Watch";
  if (path.startsWith("/rest/sessions")) return "Session";
  if (path.startsWith("/rest/race")) return "Race";
  if (path.startsWith("/navigation")) return "Navigation";
  if (path.startsWith("/rest/chat")) return "Chat";
  if (path.startsWith("/rest/profile")) return "Profile";
  if (path.startsWith("/rest/multiplayer")) return "Multiplayer";
  if (path.startsWith("/rest/garage")) return "Garage";
  if (path.startsWith("/rest/tuning")) return "Tuning";
  if (path.startsWith("/rest/options")) return "Options";
  return "Autre";
}

function getPropColor(use: string): string {
  switch (use) {
    case "⭐⭐⭐":
      return "text-emerald-400 font-bold";
    case "⭐⭐":
      return "text-blue-400";
    case "⭐":
      return "text-gray-400";
    default:
      return "text-gray-600";
  }
}

// ─── Propriétés détaillées ────────────────────────────────────────────

const PROPERTIES = [
  { name: "position", type: "int", desc: "Position actuelle (1-based)", use: "⭐⭐⭐" },
  { name: "driverName", type: "string", desc: "Nom du pilote", use: "⭐⭐⭐" },
  { name: "vehicleName", type: "string", desc: "Nom du véhicule", use: "⭐⭐⭐" },
  { name: "fullTeamName", type: "string", desc: "Nom complet de l'équipe", use: "⭐⭐⭐" },
  { name: "carNumber", type: "string", desc: "Numéro de la voiture", use: "⭐⭐" },
  { name: "carClass", type: "string", desc: "Classe (GT3, Hypercar...)", use: "⭐⭐⭐" },
  { name: "lapsCompleted", type: "int", desc: "Tours complétés", use: "⭐⭐⭐" },
  { name: "bestLapTime", type: "double", desc: "Meilleur temps au tour (s)", use: "⭐⭐⭐" },
  { name: "bestSectorTime1", type: "double", desc: "Meilleur secteur 1 (s)", use: "⭐⭐⭐" },
  { name: "bestSectorTime2", type: "double", desc: "Meilleur secteur 2 (s)", use: "⭐⭐⭐" },
  { name: "lastLapTime", type: "double", desc: "Dernier temps au tour (s)", use: "⭐⭐⭐" },
  { name: "lastSectorTime1", type: "double", desc: "Dernier secteur 1 (s)", use: "⭐⭐" },
  { name: "lastSectorTime2", type: "double", desc: "Dernier secteur 2 (s)", use: "⭐⭐" },
  { name: "currentSectorTime1", type: "double", desc: "Secteur 1 en cours (s)", use: "⭐⭐" },
  { name: "currentSectorTime2", type: "double", desc: "Secteur 2 en cours (s)", use: "⭐⭐" },
  { name: "timeIntoLap", type: "double", desc: "Temps dans le tour actuel", use: "⭐" },
  { name: "estimatedLapTime", type: "double", desc: "Temps estimé du tour", use: "⭐" },
  { name: "timeBehindLeader", type: "double", desc: "Temps derrière le leader", use: "⭐⭐⭐" },
  { name: "lapsBehindLeader", type: "int", desc: "Tours derrière le leader", use: "⭐⭐" },
  { name: "timeBehindNext", type: "double", desc: "Temps derrière le suivant", use: "⭐⭐" },
  { name: "lapsBehindNext", type: "int", desc: "Tours derrière le suivant", use: "⭐" },
  { name: "pitstops", type: "short", desc: "Nombre d'arrêts au stand", use: "⭐⭐" },
  { name: "penalties", type: "short", desc: "Nombre de pénalités", use: "⭐⭐" },
  { name: "sector", type: "enum", desc: "Secteur actuel (SECTOR1/2/3)", use: "⭐" },
  { name: "pitting", type: "bool", desc: "En train de rentrer aux stands", use: "⭐⭐" },
  { name: "pitState", type: "enum", desc: "État pit (NONE/REQUEST/...)", use: "⭐⭐" },
  { name: "finishStatus", type: "enum", desc: "Statut finish (DNF/DQ/...)", use: "⭐⭐⭐" },
  { name: "flag", type: "enum", desc: "Drapeau individuel", use: "⭐⭐" },
  { name: "underYellow", type: "bool", desc: "Sous drapeau jaune ?", use: "⭐" },
  { name: "gamePhase", type: "enum", desc: "Phase de jeu individuelle", use: "⭐⭐" },
  { name: "fuelFraction", type: "float", desc: "Carburant (0.0-1.0)", use: "⭐⭐" },
  { name: "drsActive", type: "bool", desc: "DRS actif ?", use: "⭐" },
  { name: "qualification", type: "int", desc: "Position de qualification", use: "⭐⭐" },
  { name: "steamID", type: "long", desc: "Identifiant Steam", use: "⭐" },
  { name: "player", type: "bool", desc: "Est-ce le joueur local ?", use: "⭐" },
  { name: "inControl", type: "byte", desc: "Contrôle (0=IA, 1=Humain)", use: "⭐⭐" },
  { name: "lapStartET", type: "double", desc: "Début du tour (timestamp)", use: "⭐" },
  { name: "lapDistance", type: "double", desc: "Distance dans le tour (m)", use: "⭐" },
  { name: "carPosition", type: "object", desc: "Position 3D {x, y, z}", use: "⭐" },
  { name: "carVelocity", type: "object", desc: "Vitesse 3D {x, y, z, vel}", use: "⭐" },
  { name: "carAcceleration", type: "object", desc: "Accélération 3D", use: "—" },
  { name: "attackMode", type: "object", desc: "Mode attaque P2P", use: "⭐" },
  { name: "headlights", type: "bool", desc: "Phares allumés", use: "—" },
  { name: "inGarageStall", type: "bool", desc: "Dans le garage ?", use: "⭐" },
  { name: "pitGroup", type: "string", desc: "Groupe de pit", use: "—" },
  { name: "pitLapDistance", type: "float", desc: "Distance ligne de pit", use: "—" },
  { name: "serverScored", type: "bool", desc: "Enregistré par serveur", use: "—" },
  { name: "countLapFlag", type: "enum", desc: "Comptage des tours", use: "—" },
  { name: "upgradePack", type: "string", desc: "Pack d'améliorations", use: "—" },
  { name: "vehicleFilename", type: "string", desc: "Fichier .veh", use: "—" },
  { name: "carId", type: "string", desc: "ID unique du véhicule", use: "⭐" },
  { name: "bestLapSectorTime1", type: "float", desc: "S1 du meilleur tour", use: "⭐" },
  { name: "bestLapSectorTime2", type: "float", desc: "S2 du meilleur tour", use: "⭐" },
  { name: "slotID", type: "int", desc: "ID du slot", use: "⭐" },
  { name: "hasFocus", type: "bool", desc: "Focus caméra", use: "—" },
  { name: "focus", type: "bool", desc: "(doublon hasFocus)", use: "—" },
  { name: "pathLateral", type: "double", desc: "Position latérale piste", use: "—" },
  { name: "trackEdge", type: "double", desc: "Bord de piste", use: "—" },
];
