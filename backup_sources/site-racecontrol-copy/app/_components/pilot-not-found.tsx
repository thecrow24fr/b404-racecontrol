/**
 * PilotNotFound — État 404 pour un profil pilote inexistant.
 */
"use client";

import Link from "next/link";

export function PilotNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#06101d] text-white px-4">
      <div className="text-6xl mb-6">🔍</div>
      <h1 className="text-3xl font-black mb-3">Pilote introuvable</h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Ce pilote n&apos;a pas encore de profil B404 ou l&apos;identifiant
        est incorrect.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-full transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
