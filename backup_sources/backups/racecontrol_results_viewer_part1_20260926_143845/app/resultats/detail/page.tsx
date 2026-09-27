import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { ModuleEmptyState } from "../../_components/module-empty-state";
import { ModulePageShell } from "../../_components/module-page-shell";

export const metadata: Metadata = {
  title: "Détail résultat — B404 RaceControl",
  description: "Détail d’une session de résultat B404.",
};

export default function ResultDetailPage() {
  return (
    <ModulePageShell
      eyebrow="Results Viewer"
      title="Détail d’une session"
      description="Cette fiche affichera le circuit, la session, les participants, les tours et les résultats issus d’une session réellement publiée."
    >
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link
          href="/resultats"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-400 transition hover:text-orange-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux résultats
        </Link>
        <ModuleEmptyState
          title="Aucune session sélectionnée"
          message="Aucun identifiant de session réel n’est actuellement disponible pour remplir cette fiche."
          detail="Circuit, dates, tours et classements resteront indisponibles jusqu’à publication d’un résultat autorisé."
          icon={FileSearch}
        />
      </section>
    </ModulePageShell>
  );
}
