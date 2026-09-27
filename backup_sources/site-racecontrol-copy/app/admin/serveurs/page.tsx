/**
 * Admin Serveurs — Gestionnaire d instances et diagnostic
 *
 * Utilise exclusivement le Merge Engine (:3002).
 * Plus de scan de ports direct — l'architecture est multi-instances.
 *
 * @page admin-serveurs
 */

"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "../../_components/site-header";
import { SiteFooter } from "../../_components/site-footer";

interface InstanceView {
  id: string;
  name: string;
  simulator: string;
  status: string;
  circuit: string;
  sessionType: string;
  sessionPhase: string;
  drivers: number;
  maxDrivers: number;
  capabilities: string[];
}

interface PageState {
  instances: InstanceView[];
  isLoading: boolean;
  error: string | null;
}

export default function AdminServeursPage() {
  const [state, setState] = useState<PageState>({
    instances: [],
    isLoading: true,
    error: null,
  });

  async function fetchInstances() {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MERGE_ENGINE_URL ?? "http://localhost:3002"}/api/merge/instances`
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      const views: InstanceView[] = (json.instances ?? []).map((inst: any) => ({
        id: inst.id ?? "?",
        name: inst.name ?? "?",
        simulator: inst.simulator ?? "?",
        status: inst.status ?? "offline",
        circuit: inst.circuit ?? "",
        sessionType: inst.session?.type ?? "",
        sessionPhase: inst.session?.sessionPhase ?? "",
        drivers: inst.drivers?.current ?? 0,
        maxDrivers: inst.drivers?.max ?? 0,
        capabilities: inst.capabilities ?? [],
      }));
      setState({ instances: views, isLoading: false, error: null });
    } catch (e: any) {
      setState({
        instances: [],
        isLoading: false,
        error: e.message ?? "Erreur de connexion",
      });
    }
  }

  useEffect(() => {
    fetchInstances();
  }, []);

  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-3xl font-black">Administration des serveurs</h1>
        <p className="mt-2 text-sm text-gray-400">
          Diagnostic depuis le Merge Engine (&ndash; instances découvertes par N&eacute;o)
        </p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Merge Engine</p>
            <p className="mt-1 text-lg font-black">{state.error ? "Erreur" : "OK"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Instances</p>
            <p className="mt-1 text-lg font-black tabular-nums">{state.instances.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">En ligne</p>
            <p className="mt-1 text-lg font-black tabular-nums text-emerald-400">
              {state.instances.filter((i) => i.status === "online").length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Moteurs</p>
            <p className="mt-1 text-sm font-black tabular-nums">
              {[...new Set(state.instances.map((i) => i.simulator))].join(", ")}
            </p>
          </div>
        </div>

        {/* Instances */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Instances ({state.instances.length})
            </h2>
            <button onClick={fetchInstances} disabled={state.isLoading}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-gray-400 transition hover:border-orange-400/30 hover:text-orange-200">
              {state.isLoading ? "..." : "Rafraichir"}
            </button>
          </div>

          {state.isLoading && (
            <p className="mt-4 text-sm text-gray-500">Chargement...</p>
          )}

          {state.instances.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-[#0b1728]">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Instance</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Simulateur</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Statut</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Circuit</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Session</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Phase</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Pilotes</th>
                    <th className="px-4 py-3 font-black uppercase tracking-wider text-gray-400">Capacites</th>
                  </tr>
                </thead>
                <tbody>
                  {state.instances.map((inst) => (
                    <tr key={inst.id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold">{inst.name}</td>
                      <td className="px-4 py-3 text-gray-400">{inst.simulator}</td>
                      <td className="px-4 py-3">
                        {inst.status === "online" ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ON</span>
                        ) : (
                          <span className="rounded-full bg-gray-500/15 px-2 py-0.5 text-[10px] font-bold text-gray-500">OFF</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{inst.circuit || "--"}</td>
                      <td className="px-4 py-3 text-gray-400">{inst.sessionType || "--"}</td>
                      <td className="px-4 py-3 text-gray-400">{inst.sessionPhase || "--"}</td>
                      <td className="px-4 py-3 tabular-nums text-gray-400">{inst.drivers}/{inst.maxDrivers}</td>
                      <td className="px-4 py-3 text-gray-400">{inst.capabilities.slice(0, 3).join(", ")}</td>
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
