import type { Metadata } from "next";
import { Link2, List } from "lucide-react";
import Link from "next/link";
import { ModuleEmptyState } from "../_components/module-empty-state";
import { ModulePageShell } from "../_components/module-page-shell";

export const metadata: Metadata = {
  title: "Résultats — B404 RaceControl",
  description: "Results Viewer RaceControl pour les sessions B404 publiées.",
};

export default function ResultsPage() {
  return (
    <ModulePageShell
      eyebrow="Module Results Viewer"
      title="Résultats"
      description="Consultez les sessions publiées et ouvrez le détail d’une session lorsqu’un résultat réel est disponible."
    >
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-[#0a1420] p-6">
          <div className="mb-6 flex items-center gap-3">
            <List className="h-5 w-5 text-orange-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
                Sessions
              </p>
              <h2 className="mt-1 text-2xl font-black text-white">Results Viewer B404</h2>
            </div>
          </div>
          <ModuleEmptyState
            title="Aucune session de résultat publiée"
            message="RaceControl ne dispose pas encore d’un index Results Viewer indépendant. Aucun résultat, temps ou classement historique n’est généré artificiellement."
            detail="La page de détail est prête mais reste vide tant qu’une session réelle n’est pas publiée dans une source autorisée."
            icon={List}
          />
          <Link
            href="/resultats/detail"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-gray-300 transition hover:border-orange-300 hover:bg-orange-500/10 hover:text-orange-100"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Ouvrir la page détail
          </Link>
        </div>
      </section>
    </ModulePageShell>
  );
}
