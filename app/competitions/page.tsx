import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, Link2 } from "lucide-react";
import { ModuleEmptyState } from "../_components/module-empty-state";
import { ModulePageShell } from "../_components/module-page-shell";

export const metadata: Metadata = {
  title: "Compétitions — B404 RaceControl",
  description: "Compétitions B404 RaceControl.",
};

export default function CompetitionsPage() {
  return (
    <ModulePageShell
      eyebrow="Module Competitions"
      title="Compétitions"
      description="Les compétitions B404 seront présentées sous forme de cartes, avec une fiche indépendante pour chaque compétition publiée."
    >
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-[#0a1420] p-6">
          <div className="mb-6 flex items-center gap-3">
            <CalendarRange className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Calendrier B404
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">Compétitions publiées</h2>
            </div>
          </div>
          <ModuleEmptyState
            title="Aucune compétition publiée"
            message="Aucune carte de compétition B404 n’est actuellement alimentée par une source réelle."
            detail="Aucune date, circuit, catégorie, aide ou résultat d’une autre équipe n’est copié ici."
            icon={CalendarRange}
          />
          <Link
            href="/competitions/detail"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-orange-300 hover:bg-orange-500/10 hover:text-orange-100"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Ouvrir la fiche détaillée
          </Link>
        </div>
      </section>
    </ModulePageShell>
  );
}
