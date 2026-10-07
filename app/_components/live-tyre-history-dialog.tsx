"use client";

import { useState } from "react";
import type { StandingEntry, TyreHistoryEntry } from "../_types/live-timing";
import { tyreConsumedThisLap } from "../_services/live-tyre-selected-lap.mjs";
import { tyreGaugeVisual } from "../_services/live-tyre-gauge-visual.mjs";
import { formatTyrePercent } from "../_services/live-tyre-display-percent.mjs";

const series = [
  ["AVG", "wearFrontLeft", "#22d3ee"], ["AVD", "wearFrontRight", "#a78bfa"],
  ["ARG", "wearRearLeft", "#34d399"], ["ARD", "wearRearRight", "#fbbf24"],
] as const;
function time(seconds: number) { const m = Math.floor(seconds / 60); return `${m}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
function formatObservedLapTime(value: string | null | undefined) { return typeof value === "string" && value.trim() && value.trim() !== "—" ? value : "—"; }

function TyreGauge({ label, remaining, consumed, color }: { label: string; remaining: number; consumed: number | null; color: string }) {
  const visual = tyreGaugeVisual(remaining);
  const remainingLabel = formatTyrePercent(visual.percent);
  const consumedLabel = consumed === null || formatTyrePercent(consumed) === "N/D"
    ? "—"
    : formatTyrePercent(consumed);
  const clipId = `tyre-gauge-${label}`;
  const blackTextClipId = `tyre-gauge-black-text-${label}`;
  const colourTextClipId = `tyre-gauge-colour-text-${label}`;
  return <div className="flex min-w-40 flex-col items-center gap-1 font-sans">
    <p className="text-xs font-bold text-slate-300">Usure ce tour</p>
    <p className="h-6 text-base font-black" style={{ color }}>{consumedLabel}</p>
    <svg viewBox="0 0 140 228" className="h-64 w-40" overflow="visible" role="img" aria-label={`${label} : ${remainingLabel} restant, ${consumedLabel === "—" ? "usure non disponible" : `${consumedLabel} consommés ce tour`}`}>
      <title>{label} — {remainingLabel} restant</title>
      <defs><clipPath id={clipId}><rect x="18" y="12" width="104" height="196" rx="25" /></clipPath><clipPath id={blackTextClipId}><rect x="18" y="12" width="104" height={Math.max(0, visual.fillY - 12)} /></clipPath><clipPath id={colourTextClipId}><rect x="18" y={visual.fillY} width="104" height={visual.fillHeight} /></clipPath></defs>
      <path d="M42 6 C23 9 15 24 15 47 V171 C15 195 27 210 48 215 H92 C113 210 125 195 125 171 V47 C125 24 117 9 98 6 C81 2 59 2 42 6 Z" fill="none" stroke="#242a2f" strokeWidth="0.65" />
      <rect x="17" y="10" width="106" height="200" rx="26" fill="#0a0d10" stroke="#0c1013" strokeWidth="0.65" />
      <g clipPath={`url(#${clipId})`}><rect x="18" y="12" width="104" height="196" fill="#12161a" /><rect x="18" y={visual.fillY} width="104" height={visual.fillHeight} fill={color} /><rect x="18" y={visual.fillY} width="104" height="3" fill="white" opacity=".22" />
        <g transform="translate(18 12) scale(1.06122449 1.18072289) translate(-21 -24)">
        <path d="M48 24 V72 M48 144 V190 M61 24 V72 M61 144 V190 M79 24 V72 M79 144 V190 M92 24 V72 M92 144 V190 M27 34 L42 44 M27 51 L42 61 M27 160 L42 170 M27 177 L42 187 M113 34 L98 44 M113 51 L98 61 M113 160 L98 170 M113 177 L98 187 M35 27 L43 36 M105 27 L97 36 M35 60 L43 69 M105 60 L97 69 M35 147 L43 156 M105 147 L97 156 M35 180 L43 189 M105 180 L97 189" fill="none" stroke="#030609" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M51 25 V70 M64 25 V70 M76 25 V70 M89 25 V70 M51 146 V189 M64 146 V189 M76 146 V189 M89 146 V189" fill="none" stroke="white" strokeWidth=".7" opacity=".17" />
        </g>
      </g>
      <rect x="18" y="12" width="104" height="196" rx="25" fill="none" stroke="#050709" strokeWidth="0.8" />
      <g clipPath={`url(#${blackTextClipId})`}><text x="70" y="105" textAnchor="middle" fill={color} stroke="#020407" strokeWidth="1.45" paintOrder="stroke fill" fontSize="20" fontWeight="900">{remainingLabel}</text><text x="70" y="128" textAnchor="middle" fill={color} stroke="#020407" strokeWidth="1.1" paintOrder="stroke fill" fontSize="14" fontWeight="900">restant</text></g>
      <g clipPath={`url(#${colourTextClipId})`}><text x="70" y="105" textAnchor="middle" fill="#06101d" stroke="rgba(255,255,255,.42)" strokeWidth="1.45" paintOrder="stroke fill" fontSize="20" fontWeight="900">{remainingLabel}</text><text x="70" y="128" textAnchor="middle" fill="#06101d" stroke="rgba(255,255,255,.42)" strokeWidth="1.1" paintOrder="stroke fill" fontSize="14" fontWeight="900">restant</text></g>
      <text x="70" y="226" textAnchor="middle" fill={color} fontSize="14" fontWeight="900">{label}</text>
    </svg>
  </div>;
}

function SelectedLapChart({ row, history }: { row: TyreHistoryEntry; history: TyreHistoryEntry[] }) {
  const consumed = tyreConsumedThisLap(history, row);
  return <div className="mt-4 rounded-xl border border-white/10 bg-[#06101d] px-3 py-2">
    <p className="text-xs font-bold text-white">Tour sélectionné : <span className="font-mono text-cyan-200">{row.lap}</span> · temps session <span className="font-mono text-cyan-200">{time(row.sessionSeconds)}</span> · temps au tour <span className="font-mono text-cyan-200">{formatObservedLapTime(row.lapTime)}</span></p>
    <div className="mt-2 flex justify-around gap-2 overflow-x-auto py-1" role="img" aria-label={`Jauges des quatre pneus du tour ${row.lap}`}>
      {series.map(([label, key, color], index) => <TyreGauge key={label} label={label} remaining={Number(row[key])} consumed={consumed[index]} color={color} />)}
    </div>
  </div>;
}

export function TyreHistoryDialog({ entry, onClose }: { entry: StandingEntry; onClose: () => void }) {
  const history = entry.tyreHistory ?? [];
  const typeLabel = entry.driverType === "ai" ? "IA confirmée (Shared Memory)"
    : entry.driverType === "human" ? "Humain confirmé (Shared Memory)"
      : "Type non prouvé par la source actuelle";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = history.find((row) => `${row.relay}-${row.lap}` === selectedKey) ?? history.at(-1) ?? null;
  return <div role="dialog" aria-modal="true" aria-label={`Historique pneus — ${entry.driverName}`} className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" onMouseDown={onClose}>
    <section className="mx-auto my-8 max-w-5xl rounded-2xl border border-cyan-300/30 bg-[#0b1728] p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Historique pneus</p><h2 className="text-xl font-black text-white">{entry.driverName}</h2><p data-driver-type={entry.driverType ?? "unclassified"} className="mb-1 text-xs font-semibold text-cyan-100">{typeLabel}</p><p className="text-xs text-gray-400">Mesures Shared Memory collectées depuis le démarrage du preview ; aucune donnée rétroactive. Relais fondés uniquement sur les changements de train observés (composés ou remise à niveau des quatre roues) : aucun identifiant natif de train n’est disponible.</p></div><button type="button" onClick={onClose} className="rounded border border-white/20 px-3 py-1 text-sm text-white">Fermer</button></div>
      {history.length === 0 ? <p className="mt-6 text-gray-400">Aucun tour complet collecté pour ce pilote.</p> : <>
        {selected ? <SelectedLapChart row={selected} history={history} /> : null}
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="text-left text-xs uppercase text-gray-400"><th>Relais</th><th>Tour</th><th>Temps du tour</th><th>Composé AV/AR</th><th>AVG</th><th>AVD</th><th>ARG</th><th>ARD</th><th>Événement</th></tr></thead><tbody>{history.map((row) => { const key = `${row.relay}-${row.lap}`; const active = selected?.relay === row.relay && selected?.lap === row.lap; return <tr key={key} onClick={() => setSelectedKey(key)} aria-pressed={active} className={`cursor-pointer border-t border-white/10 font-mono text-cyan-100 ${active ? "bg-cyan-400/10 outline outline-1 outline-cyan-300/60" : "hover:bg-white/5"}`}><td>{row.relay}</td><td>{row.lap}</td><td title={formatObservedLapTime(row.lapTime) === "—" ? "Temps au tour indisponible" : undefined}>{formatObservedLapTime(row.lapTime)}</td><td>{row.frontTyreCompound} / {row.rearTyreCompound}</td><td className="text-cyan-300">{formatTyrePercent(row.wearFrontLeft)}</td><td className="text-violet-300">{formatTyrePercent(row.wearFrontRight)}</td><td className="text-emerald-300">{formatTyrePercent(row.wearRearLeft)}</td><td className="text-amber-300">{formatTyrePercent(row.wearRearRight)}</td><td>{row.pitOrTyreChange ? "Arrêt ou changement" : "—"}</td></tr>; })}</tbody></table></div>
      </>}
    </section>
  </div>;
}
