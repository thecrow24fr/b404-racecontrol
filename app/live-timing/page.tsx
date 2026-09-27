import type { Metadata } from "next";
import { LiveTimingClient } from "../_components/live-timing-client";
import { emptyLiveTimingData } from "../_data/empty-live-timing-data";

export const metadata: Metadata = {
  title: "Live Timing — B404 RaceControl",
  description:
    "Suivez les sessions B404 en direct : classement, temps au tour, informations serveur et météo.",
};

/**
 * Page publique Live Timing.
 *
 * La page ne contient aucun snapshot fictif : elle commence dans un état neutre
 * puis interroge uniquement l’API publique RaceControl pour s20_vm.
 */
export default function LiveTimingPage() {
  return <LiveTimingClient initialData={emptyLiveTimingData} sourceId="s20_vm" />;
}
