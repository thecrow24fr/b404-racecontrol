import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTimingClient } from "../../../_components/live-timing-client";
import { SiteHeader } from "../../../_components/site-header";
import { SiteFooter } from "../../../_components/site-footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const isTestServer = id === "20";
  return {
    title: isTestServer
      ? "Live Timing S20 — B404 RaceControl"
      : `Live Timing S${id} en préparation — B404 RaceControl`,
    description: isTestServer
      ? "Préparation du Live Timing public du serveur S20 B404 RaceControl."
      : `Page du serveur S${id} réservée à la préparation du labo B404 RaceControl.`,
  };
}

export function generateStaticParams() {
  return [
    ...Array.from({ length: 8 }, (_, index) => ({ id: String(index + 1) })),
    { id: "20" },
  ];
}

export default async function ServerLiveTimingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serverId = Number(id);
  if (!Number.isInteger(serverId) || (serverId < 1 || serverId > 8) && serverId !== 20) {
    notFound();
  }

  if (serverId !== 20) {
    return (
      <main className="flex min-h-screen flex-col bg-[#06101d] text-white">
        <SiteHeader />
        <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="text-3xl font-black">Serveur {serverId} en préparation</h1>
          <p className="mt-3 max-w-xl text-sm text-gray-400">
            Les pages S1 à S8 sont réservées à la préparation du labo et ne présentent pas de données publiques.
          </p>
          <Link className="mt-6 rounded-full border border-white/15 px-5 py-2 text-sm font-bold text-gray-200 hover:border-orange-300" href="/">
            Retour à l’accueil
          </Link>
        </section>
        <SiteFooter />
      </main>
    );
  }

  return (
    <LiveTimingClient serverId={20} />
  );
}
