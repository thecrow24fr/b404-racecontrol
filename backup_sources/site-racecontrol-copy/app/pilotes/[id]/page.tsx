/**
 * Wrapper serveur pour la page Profil Pilote.
 * Fournit generateStaticParams pour le build statique.
 */

import { PilotProfileClient } from "./pilot-profile-client";

export function generateStaticParams() {
  // Valeur factice pour le build statique.
  // Le rendu réel se fait côté client.
  return [{ id: "placeholder" }];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PilotProfilePage({ params }: Props) {
  return <PilotProfileClient params={params} />;
}
