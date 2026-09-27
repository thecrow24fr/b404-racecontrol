import type { Metadata } from "next";
import { ModulePageShell } from "../_components/module-page-shell";
import { ResultsViewerClient } from "../_components/results-viewer-client";

export const metadata: Metadata = {
  title: "Results Viewer — B404 RaceControl",
  description: "Results Viewer B404 pour consulter les observations de sessions reçues par RaceControl.",
};

export default function ResultsPage() {
  return (
    <ModulePageShell
      eyebrow="RESULTS VIEWER · PARTIE 1/7"
      title="Results Viewer"
      description="Consultez les sessions et les classements réellement reçus par B404 RaceControl, dans une interface familière aux utilisateurs de rFactor 2."
    >
      <ResultsViewerClient />
    </ModulePageShell>
  );
}
