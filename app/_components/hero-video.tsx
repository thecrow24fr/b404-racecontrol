"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Composant vidéo de fond pour le Hero.
 *
 * Source publique vérifiée : /videos/hero.mp4 (H.264)
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Détection prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      videoRef.current?.pause();
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      if (event.matches) {
        videoRef.current?.pause();
      }
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

      {/* Vidéo MP4 vérifiée dans l’export public. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 motion-reduce:hidden ${
          isLoaded ? "opacity-80" : ""
        } ${isLoaded ? "animate-ken-burns" : ""}`}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
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

