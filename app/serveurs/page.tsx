import type { Metadata } from "next";
import { ModulePageShell } from "../_components/module-page-shell";
import { ServersSection } from "../_components/servers-section";

export const metadata: Metadata = {
  title: "Serveurs — B404 RaceControl",
  description: "État et accès aux serveurs RaceControl B404.",
};

export default function ServersPage() {
  return (
    <ModulePageShell
      eyebrow="RaceControl"
      title="Serveurs"
      description="Accédez aux serveurs RaceControl disponibles et à leur module Live lorsqu’une source de données est configurée."
    >
      <ServersSection />
    </ModulePageShell>
  );
}
