"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vidéo de fond fixe pour le Hero.
 *
 * La vidéo est en `fixed inset-0` (sans z-index) : elle s'affiche au-dessus
 * du fond du body. Le conteneur principal `<div class="min-h-screen ...">`
 * est en `relative z-10` pour empiler tout le contenu du site au-dessus.
 *
 * Chaque section du site couvre la vidéo avec son propre fond opaque
 * (bg-[#06101d]), éliminant toute bande résiduelle.
 *
 * Formats supportés :
 * - MP4 (H.264) : universel ✅
 * - WebM (VP9)   : Chrome, Firefox, Edge ✅
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
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

    if (video.readyState >= 3) {
      setIsLoaded(true);
      return;
    }

    video.addEventListener("canplay", handleReady, { once: true });
    video.addEventListener("loadeddata", handleReady, { once: true });

    return () => {
      video.removeEventListener("canplay", handleReady);
      video.removeEventListener("loadeddata", handleReady);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <>
      {/* Fallback : même fixed sans z-index, remplacé par la vidéo au chargement */}
      {!isLoaded && <div className="fixed inset-0 bg-[#06101d]" />}

      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`fixed inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          isLoaded ? "opacity-80" : "opacity-0"
        }`}
      >
        <source src="/videos/hero.mp4" type="video/mp4" />
        <source src="/videos/hero.webm" type="video/webm" />
      </video>
    </>
  );
}

