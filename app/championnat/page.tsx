import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { ModuleEmptyState } from "../_components/module-empty-state";
import { ModulePageShell } from "../_components/module-page-shell";

export const metadata: Metadata = {
  title: "Championnat — B404 RaceControl",
  description: "Module Championnat B404 RaceControl.",
};

export default function ChampionshipPage() {
  return (
    <ModulePageShell
      eyebrow="Module Championship"
      title="Championnat"
      description="Le module de championnat est séparé du Live Timing et pourra présenter les points, manches et classements lorsqu’une source B404 sera publiée."
    >
      <section className="mx-auto max-w-7xl px-6 py-10">
        <ModuleEmptyState
          title="Aucune donnée de championnat"
          message="B404 ne fournit pas encore de championnat publié dans RaceControl."
          detail="Aucun pilote, point, manche ou classement n’est inventé dans cet état vide."
          icon={Trophy}
        />
      </section>
    </ModulePageShell>
  );
}
