import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveTimingClient } from "../../../_components/live-timing-client";
import { mockLiveTimingData } from "../../../_data/live-timing-data";

/** Genere les pages statiques pour les serveurs 1-7 */
export function generateStaticParams() {
  return Array.from({ length: 7 }, (_, i) => ({ id: String(i + 1) }));
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Live Timing Serveur ${id} — B404 RaceControl`,
    description:
      `Suivez la session en direct du Serveur ${id} : classement temps reel, temps au tour, informations serveur et meteo.`,
  };
}

/**
 * Page Live Timing d'un serveur — B404 RaceControl
 * Route : /serveurs/[id]/live-timing
 */
export default async function ServerLiveTimingPage({ params }: Props) {
  const { id } = await params;
  const serverId = parseInt(id, 10);

  if (isNaN(serverId) || serverId < 1 || serverId > 7) {
    notFound();
  }

  return <LiveTimingClient serverId={serverId} initialData={mockLiveTimingData} />;
}
