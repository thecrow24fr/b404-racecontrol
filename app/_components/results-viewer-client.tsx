"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PublicResultsProvider,
  RESULTS_VIEWER_SOURCE_ID,
} from "../_services/public-results-provider";
import type {
  ResultDriverEntry,
  ResultSession,
  ResultsViewerData,
} from "../_types/results-viewer";

function statusLabel(session: ResultSession): string {
  return session.status === "current" ? "Observation en cours" : "Session observée";
}

function driverStatusLabel(entry: ResultDriverEntry): string {
  switch (entry.status) {
    case "pit":
      return "Pit lane";
    case "finished":
      return "Terminé";
    case "dnf":
      return "Abandon";
    case "running":
      return "En piste";
    default:
      return "Observé";
  }
}

function observedTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non disponible";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function DataCell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className={`whitespace-nowrap px-4 py-3 text-sm ${muted ? "text-gray-500" : "text-gray-200"}`}>
      {children}
    </td>
  );
}

function SessionRow({
  session,
  selected,
  onSelect,
}: {
  session: ResultSession;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        selected
          ? "border-orange-300/70 bg-orange-500/15"
          : "border-white/10 bg-[#0b1725] hover:border-orange-300/40 hover:bg-orange-500/10"
      }`}
      aria-pressed={selected}
    >
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-xs font-black uppercase tracking-[0.18em] text-orange-300">
            {session.name}
          </span>
          <span className="mt-1 block text-sm font-bold text-white">
            {session.circuit ?? "Circuit non disponible"}
          </span>
          <span className="mt-1 block text-xs text-gray-500">
            {session.participants} participant{session.participants === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronRight className={`mt-1 h-4 w-4 ${selected ? "text-orange-200" : "text-gray-600"}`} />
      </span>
    </button>
  );
}

function ResultsTable({ entries }: { entries: ResultDriverEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-[#0a1420] px-5 py-10 text-center">
        <FileSearch className="mx-auto h-8 w-8 text-gray-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-gray-300">Aucun participant observé</p>
        <p className="mt-1 text-xs text-gray-500">
          La source n’a fourni aucun classement exploitable pour cette session.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0a1420]">
      <table className="min-w-[860px] w-full border-collapse text-left">
        <caption className="sr-only">Classement Results Viewer B404</caption>
        <thead className="border-b border-white/10 bg-white/[0.03]">
          <tr className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
            <th className="px-4 py-3">Pos.</th>
            <th className="px-4 py-3">Pilote</th>
            <th className="px-4 py-3">Voiture</th>
            <th className="px-4 py-3">Tours</th>
            <th className="px-4 py-3">Meilleur tour</th>
            <th className="px-4 py-3">Dernier tour</th>
            <th className="px-4 py-3">Écart</th>
            <th className="px-4 py-3">État</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {entries.map((entry) => (
            <tr key={`${entry.driverName}-${entry.carNumber ?? ""}`} className="hover:bg-white/[0.025]">
              <DataCell muted={entry.position === null}>
                {entry.position ?? "—"}
              </DataCell>
              <DataCell>
                <span className="font-bold text-white">{entry.driverName}</span>
                {entry.team && <span className="mt-1 block text-xs text-gray-500">{entry.team}</span>}
              </DataCell>
              <DataCell muted={!entry.car}>
                {entry.car ?? "Non disponible"}
                {entry.carNumber && <span className="ml-2 text-xs text-orange-300">#{entry.carNumber}</span>}
              </DataCell>
              <DataCell muted={entry.laps === null}>{entry.laps ?? "—"}</DataCell>
              <DataCell muted={!entry.bestLap}>{entry.bestLap ?? "Non disponible"}</DataCell>
              <DataCell muted={!entry.lastLap}>{entry.lastLap ?? "Non disponible"}</DataCell>
              <DataCell muted={!entry.gapToLeader}>{entry.gapToLeader ?? "—"}</DataCell>
              <DataCell>
                <span className="inline-flex rounded-full border border-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-300">
                  {driverStatusLabel(entry)}
                </span>
              </DataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResultsViewerClient() {
  const [data, setData] = useState<ResultsViewerData | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<PublicResultsProvider | null>(null);

  if (providerRef.current === null) {
    providerRef.current = new PublicResultsProvider(RESULTS_VIEWER_SOURCE_ID);
  }

  const refresh = useCallback(async () => {
    if (!providerRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const nextData = await providerRef.current.fetch();
      setData(nextData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Results Viewer indisponible");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const effectiveSessionId =
    data?.sessions.some((session) => session.id === selectedSessionId)
      ? selectedSessionId
      : data?.currentSessionId ?? data?.sessions[0]?.id ?? null;
  const selectedSession =
    data?.sessions.find((session) => session.id === effectiveSessionId) ?? null;

  return (
    <section className="border-b border-white/10 bg-[#06101d]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0a1420] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-orange-300/30 bg-orange-500/10 p-2.5">
              <FileSearch className="h-5 w-5 text-orange-200" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                B404 RaceControl
              </p>
              <p className="mt-1 text-sm font-bold text-white">Results Viewer</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-gray-300">
              <span className="h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
              S20 / <span className="font-mono text-orange-200">s20_vm</span>
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 px-3 py-2 font-bold text-orange-200 transition hover:bg-orange-500/10 disabled:cursor-wait disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Actualiser
            </button>
          </div>
        </div>

        {error && !data && (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden="true" />
              <div>
                <p className="font-bold text-red-100">Source Results Viewer indisponible</p>
                <p className="mt-1 text-sm text-red-200/80">{error}</p>
                <p className="mt-3 text-xs leading-5 text-red-200/60">
                  Le navigateur reste connecté uniquement à RaceControl. Aucune origine S20 ou R2LA n’est appelée directement.
                </p>
              </div>
            </div>
          </div>
        )}

        {!data && !error && (
          <div className="rounded-2xl border border-white/10 bg-[#0a1420] px-5 py-12 text-center text-sm text-gray-400">
            Chargement de la source Results Viewer…
          </div>
        )}

        {data && (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#0a1420] p-5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  Source observée
                </div>
                <p className="mt-3 text-lg font-black text-white">{data.sourceName}</p>
                <p className="mt-1 text-xs text-gray-500">Lecture via la façade RaceControl</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0a1420] p-5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  <Clock3 className="h-4 w-4 text-orange-300" aria-hidden="true" />
                  Dernière observation
                </div>
                <p className="mt-3 text-lg font-black text-white">{observedTime(data.fetchedAt)}</p>
                <p className="mt-1 text-xs text-gray-500">Actualisation manuelle uniquement dans cette partie</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0a1420] p-5">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  <ShieldCheck className="h-4 w-4 text-sky-300" aria-hidden="true" />
                  Nature des données
                </div>
                <p className="mt-3 text-lg font-black text-white">{data.sessions.length} session{data.sessions.length === 1 ? "" : "s"}</p>
                <p className="mt-1 text-xs text-gray-500">Observations réelles, pas d’archive inventée</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside aria-label="Sessions Results Viewer" className="space-y-3">
                <div className="mb-2 px-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Sessions</p>
                  <p className="mt-1 text-sm text-gray-500">Sélectionnez une observation reçue par B404.</p>
                </div>
                {data.sessions.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-gray-500">
                    Aucune session disponible.
                  </div>
                )}
                {data.sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    selected={session.id === effectiveSessionId}
                    onSelect={() => setSelectedSessionId(session.id)}
                  />
                ))}
              </aside>

              <div className="min-w-0">
                {selectedSession ? (
                  <div>
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                          {selectedSession.code}
                        </p>
                        <h2 className="mt-2 text-3xl font-black text-white">{selectedSession.name}</h2>
                        <p className="mt-2 text-sm text-gray-400">
                          {selectedSession.circuit ?? "Circuit non disponible"}
                          {selectedSession.eventName ? ` · ${selectedSession.eventName}` : ""}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-bold ${selectedSession.status === "current" ? "border-orange-300/40 bg-orange-500/10 text-orange-100" : "border-white/10 text-gray-300"}`}>
                        {statusLabel(selectedSession)}
                      </span>
                    </div>

                    <div className="mb-4 rounded-2xl border border-orange-300/20 bg-orange-500/[0.06] px-4 py-3 text-sm leading-6 text-gray-300">
                      {data.archive.message}
                    </div>
                    <ResultsTable entries={selectedSession.entries} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-[#0a1420] px-5 py-12 text-center">
                    <FileSearch className="mx-auto h-8 w-8 text-gray-600" aria-hidden="true" />
                    <p className="mt-3 font-bold text-gray-300">Aucune session sélectionnée</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
