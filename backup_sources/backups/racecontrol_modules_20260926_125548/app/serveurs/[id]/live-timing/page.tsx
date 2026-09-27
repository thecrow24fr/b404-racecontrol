import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveTimingClient } from "../../../_components/live-timing-client";
import { emptyLiveTimingData } from "../../../_data/empty-live-timing-data";

/** Phase actuelle : seule la source réelle s1_vm est autorisée. */
export function generateStaticParams() {
  return [{ id: "1" }];
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Live Timing S1 VM — Serveur ${id} — B404 RaceControl`,
    description:
      `Suivez la session du S1 VM sur la route serveur ${id} : classement temps réel, temps au tour, informations serveur et météo.`,
  };
}

/**
 * Route Live Timing explicitement limitée à s1_vm pendant cette phase.
 * Les anciennes routes hôte ne sont pas transformées en alias silencieux.
 */
export default async function ServerLiveTimingPage({ params }: Props) {
  const { id } = await params;
  if (id !== "1") notFound();

  return (
    <LiveTimingClient
      sourceId="s1_vm"
      initialData={emptyLiveTimingData}
    />
  );
}
