import type { Metadata } from "next";
import { Award } from "lucide-react";
import { ModulePageShell } from "../_components/module-page-shell";
import { RecordsModuleClient } from "../_components/records-module-client";

export const metadata: Metadata = {
  title: "Records — B404 RaceControl",
  description: "Meilleurs temps réellement observés par RaceControl.",
};

export default function RecordsPage() {
  return (
    <ModulePageShell
      eyebrow="Module Records"
      title="Records"
      description="Une page indépendante pour les meilleurs temps observés par RaceControl, sans confondre l’historique courant avec une archive officielle."
    >
      <div className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex items-center gap-3 rounded-2xl border border-orange-400/20 bg-orange-500/5 px-5 py-4">
          <Award className="h-5 w-5 text-orange-400" aria-hidden="true" />
          <p className="text-sm text-gray-300">
            Les données sont lues via l’API publique RaceControl ; le navigateur ne contacte jamais le WebUI S20.
          </p>
        </div>
      </div>
      <RecordsModuleClient />
    </ModulePageShell>
  );
}
