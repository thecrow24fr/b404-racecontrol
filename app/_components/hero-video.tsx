"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vidéo de fond fixe pour le Hero.
 *
 * La vidéo est positionnée en `fixed` derrière tout le contenu du site
 * (z-index: -1). Chaque section du site la recouvre avec son propre fond
 * opaque (bg-[#06101d] ou équivalent), ce qui supprime toute bande
 * résiduelle à la transition entre sections.
 *
 * Formats supportés par le navigateur :
 * - MP4 (H.264) : support universel ✅
 * - WebM (VP9)   : Chrome, Firefox, Edge ✅
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
        <div className="fixed inset-0 z-[-1] bg-[#06101d]" />
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`fixed inset-0 z-[-1] h-full w-full object-cover transition-opacity duration-700 ${
          isLoaded ? "opacity-80" : "opacity-0"
        }`}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
        <source src="/videos/hero.webm" type="video/webm" />
      </video>
    </>
  );
}

