"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Composant vidéo de fond pour le Hero.
 *
 * Formats supportés par le navigateur :
 * - MP4 (H.264) : support universel ✅
 * - WebM (VP9)   : Chrome, Firefox, Edge ✅
 * - MOV          : Safari uniquement ❌
 *
 * TODO: Remplacer la vidéo de test .mov par un fichier .mp4 ou .webm
 * Vidéo attendue : /videos/hero.mp4 (H.264, ~10-15 Mo max)
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Détection prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || prefersReducedMotion) {
      return;
    }

    const handleReady = () => {
      setIsLoaded(true);
    };

    // Vérification synchrone : si la vidéo est déjà jouable au montage
    // (readyState: 0=rien, 1=metadata, 2=current, 3=future, 4=enough)
    if (video.readyState >= 3) {
      setIsLoaded(true);
      return;
    }

    // Sinon, on attend les événements de disponibilité
    video.addEventListener("canplay", handleReady, { once: true });
    video.addEventListener("loadeddata", handleReady, { once: true });

    return () => {
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("loadeddata", handleReady);
    };
  }, [prefersReducedMotion]);

  // Si l'utilisateur préfère réduire les mouvements, on n'affiche pas la vidéo
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <>
      {/* Fallback overlay tant que la vidéo n'est pas chargée */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#06101d] via-[#0a1828] to-[#06101d]" />
      )}

      {/*
       * Vidéo de fond
       *
       * Ordre des sources (le navigateur prend la première lisible) :
       *   1. hero.mp4  (H.264 — universel)   ✅ à privilégier
       *   2. hero.webm (VP9 — Chrome/FF/Edge) ✅ alternative
       *   3. test .mov (QuickTime — Safari)   ❌ temporaire
       */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 ${
          isLoaded ? "opacity-80" : ""
        } ${isLoaded ? "animate-ken-burns" : ""}`}
      >
        {/* Format universel (H.264) — à privilégier */}
        <source src="/videos/hero.mp4" type="video/mp4" />

        {/* Format alternatif (VP9) — Chrome, Firefox, Edge */}
        <source src="/videos/hero.webm" type="video/webm" />

        {/*
         * Vidéo de test temporaire — Le format .mov n'est pas supporté
         * par la balise <video> HTML5 sur Chrome/Firefox/Edge.
         * Seul Safari peut potentiellement le lire.
         * À remplacer par hero.mp4 dès que disponible.
         */}
        <source src="/depart%20spa.mov" type="video/quicktime" />
      </video>

      {/* Overlay sombre pour la lisibilité */}
      <div
        className={`absolute inset-0 bg-gradient-to-b from-[#06101d]/60 via-transparent to-[#06101d]/70 transition-opacity duration-700 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}

