import type { Metadata } from "next";
import { LiveTimingClient } from "../_components/live-timing-client";
import { mockLiveTimingData } from "../_data/live-timing-data";

export const metadata: Metadata = {
  title: "Live Timing Premium — B404 RaceControl",
  description:
    "Suivez les sessions B404 en direct : classements en temps réel, temps au tour, informations serveur et météo.",
};

/**
 * Page Live Timing Premium — B404 RaceControl
 *
 * Affiche les données de course en direct.
 *
 * Architecture DataProvider :
 * - Priorité 1 : API native rFactor 2 (localhost:5397) si le jeu est lancé
 * - Fallback  : Données simulées (mock) pour le développement / static export
 *
 * La page reste un composant serveur pour le metadata SEO.
 * Le composant LiveTimingClient gère toute la logique de
 * détection de source et polling côté client.
 *
 * @see LiveTimingClient pour la logique de sélection de source
 * @see data-provider.ts pour l'interface IDataProvider
 */
export default function LiveTimingPage() {
  return <LiveTimingClient initialData={mockLiveTimingData} />;
}
