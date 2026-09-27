import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveTimingClient } from "../../../_components/live-timing-client";
import { emptyLiveTimingData } from "../../../_data/empty-live-timing-data";

export const metadata: Metadata = {
  title: "Live Timing S20 — B404 RaceControl",
  description: "Live Timing du serveur S20 B404 RaceControl.",
};

export function generateStaticParams() {
  return [{ id: "20" }];
}

export default async function ServerLiveTimingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id !== "20") notFound();

  return <LiveTimingClient initialData={emptyLiveTimingData} sourceId="s20_vm" />;
}
