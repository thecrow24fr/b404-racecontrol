import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { ModulePageShell } from "../../_components/module-page-shell";

export const metadata: Metadata = {
  title: "Détail compétition — B404 RaceControl",
  description: "Fiche détaillée d’une compétition B404.",
};

const FIELDS = [
  ["Dates", "Non disponible"],
  ["Circuit", "Non disponible"],
  ["Catégorie", "Non disponible"],
  ["Aides", "Non disponible"],
  ["Résultats", "Non disponible"],
] as const;

export default function CompetitionDetailPage() {
  return (
    <ModulePageShell
      eyebrow="Competitions"
      title="Fiche compétition"
      description="La fiche détaillée séparée est prête à recevoir les dates, le circuit, la catégorie, les aides autorisées et les résultats d’une compétition B404 réelle."
    >
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/competitions"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-orange-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux compétitions
        </Link>
        <div className="rounded-3xl border border-white/10 bg-[#0a1420] p-6">
          <div className="flex items-center gap-3">
            <CalendarRange className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Détail
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">Aucune compétition sélectionnée</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {FIELDS.map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-[#0d1b2e] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</p>
                <p className="mt-2 text-sm font-bold text-gray-400">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-6 text-gray-500">
            Cette fiche n’affiche aucune donnée de substitution et ne copie pas les captures ou contenus d’autres équipes.
          </p>
        </div>
      </section>
    </ModulePageShell>
  );
}
