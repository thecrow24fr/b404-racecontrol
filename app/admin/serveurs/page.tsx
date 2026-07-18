/**
 * Admin Serveurs — Gestionnaire d instances et diagnostic
 *
 * Outil d administration pour diagnostiquer les serveurs :
 * API, ports, Merge Engine, configuration, detection.
 *
 * @page admin-serveurs
 */

"use client";

import { useEffect, useState } from "react";
import {
  discoverServers,
  type ServerInstance,
  type DebugLog,
  RF2_INSTALL_PATH,
} from "../../_services/server-discovery";
import { SiteHeader } from "../../_components/site-header";
import { SiteFooter } from "../../_components/site-footer";

interface PageState {
  servers: ServerInstance[];
  isScanning: boolean;
  scanTime: Date | null;
  error: string | null;
}

export default function AdminServeursPage() {
  const [state, setState] = useState<PageState>({
    servers: [],
    isScanning: true,
    scanTime: null,
    error: null,
  });

  const [mergeStatus, setMergeStatus] = useState<string>("Verification...");

  useEffect(() => {
    checkMergeEngine();
    runDiscovery();
  }, []);

  async function checkMergeEngine() {
    try {
      const res = await fetch("http://localhost:3002/api/health");
      const data = await res.json();
      setMergeStatus(data.status === "ok" ? "OK" : "Degrade");
    } catch {
      setMergeStatus("Indisponible");
    }
  }

  async function runDiscovery() {
    setState((s) => ({ ...s, isScanning: true, error: null }));
    try {
      const instances = await discoverServers();
      setState({
        servers: instances,
        isScanning: false,
        scanTime: new Date(),
        error: null,
      });
    } catch (e: any) {
      setState((s) => ({
        ...s,
        isScanning: false,
        error: e.message ?? "Erreur inconnue",
      }));
    }
  }

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-black">Administration des serveurs</h1>
        <p className="mt-2 text-sm text-gray-400">
          Outil de diagnostic technique. Ports, API, configuration.
        </p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Merge Engine</p>
            <p className="mt-1 text-lg font-black">{mergeStatus}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Serveurs</p>
            <p className="mt-1 text-lg font-black tabular-nums">{state.servers.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">En ligne</p>
            <p className="mt-1 text-lg font-black tabular-nums text-emerald-400">
              {state.servers.filter((s) => s.apiAvailable).length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Scan</p>
            <p className="mt-1 text-lg font-black tabular-nums">
              {state.scanTime?.toLocaleTimeString() ?? "--"}
            </p>
          </div>
        </div>

        {/* Discovery */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Instances detectees</h2>
            <button onClick={runDiscovery} disabled={state.isScanning}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200">
              {state.isScanning ? "Scan..." : "Rescanner"}
            </button>
          </div>

          {state.servers.length === 0 && state.isScanning && (
            <p className="mt-4 text-sm text-gray-500">Scan en cours...</p>
          )}

          {state.servers.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-[#0b1728]">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Serveur</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Port Jeu</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Port API</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">API</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Session</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Circuit</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Pilotes</th>
                  </tr>
                </thead>
                <tbody>
                  {state.servers.map((srv) => (
                    <tr key={srv.index} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold">{srv.profile}</td>
                      <td className="px-4 py-3 tabular-nums text-gray-400">{srv.gamePort}</td>
                      <td className="px-4 py-3 tabular-nums text-gray-400">{srv.webPort}</td>
                      <td className="px-4 py-3">
                        {srv.apiAvailable ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">OK</span>
                        ) : (
                          <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold text-gray-500">OFF</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{srv.session ?? "--"}</td>
                      <td className="px-4 py-3 text-gray-400">{srv.trackName ?? "--"}</td>
                      <td className="px-4 py-3 tabular-nums text-gray-400">{srv.vehicleCount ?? "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {state.error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-300">
              {state.error}
            </div>
          )}
        </div>

        {/* Lien retour */}
        <div className="mt-12">
          <a href="/serveurs" className="text-sm text-orange-400 hover:text-orange-300">
            &larr; Retour a la vue d ensemble
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
