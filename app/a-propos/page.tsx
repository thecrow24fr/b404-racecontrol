import type { Metadata } from "next";
import { Info } from "lucide-react";
import { ModulePageShell } from "../_components/module-page-shell";

export const metadata: Metadata = {
  title: "À propos — B404 RaceControl",
  description: "À propos du portail RaceControl B404.",
};

export default function AboutPage() {
  return (
    <ModulePageShell
      eyebrow="RaceControl"
      title="À propos"
      description="RaceControl est le portail séparé de contrôle et de suivi des modules B404."
    >
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-[#0a1420] p-7">
          <div className="flex items-start gap-4">
            <Info className="mt-1 h-6 w-6 shrink-0 text-orange-400" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-black text-white">Un portail, des modules séparés</h2>
              <p className="mt-4 text-sm leading-7 text-gray-300">
                B404 désigne le site public officiel. RaceControl reste le portail
                distinct qui expose ses propres fonctions : Serveurs, Résultats,
                Records, Championnat, Compétitions et Live.
              </p>
              <p className="mt-4 text-sm leading-7 text-gray-400">
                Le module Live utilise actuellement S20 via l’identifiant public
                <span className="mx-1 font-mono text-orange-200">s20_vm</span>.
                R2LA reste un service parallèle et n’est pas remplacé par cette interface.
              </p>
            </div>
          </div>
        </div>
      </section>
    </ModulePageShell>
  );
}
