"use client";

interface ContactSuccessProps {
  onReset: () => void;
}

/**
 * Écran affiché après la soumission du formulaire.
 * Actuellement en placeholder, prêt à être connecté à l'envoi email.
 */
export function ContactSuccess({ onReset }: ContactSuccessProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      {/* Icône de confirmation */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10">
        <svg
          className="h-10 w-10 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="text-2xl font-black text-white">
        Message envoy&eacute;
      </h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-400">
        Merci de nous avoir contact&eacute;s. Nous vous r&eacute;pondrons
        dans les plus brefs d&eacute;lais.
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-8 rounded-full border border-orange-400/40 px-6 py-2.5 text-sm font-bold text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10"
      >
        Nouvelle demande
      </button>
    </div>
  );
}
