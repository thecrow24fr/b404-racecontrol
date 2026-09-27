"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ContactModal } from "./contact-modal";
import { siteLinks } from "../_config/site-links";

export function SiteHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const isLiveTimingPage = pathname?.startsWith("/live-timing") ?? false;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b border-white/10 bg-[#071426]/90 backdrop-blur-xl transition-all duration-300 ${
          isScrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6">
          <a href={siteLinks.raceControlHome} className="group">
            <p className="text-3xl font-black tracking-widest text-orange-400 transition group-hover:text-orange-300">
              B404
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400 transition group-hover:text-gray-300">
              RaceControl
            </p>
          </a>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 md:hidden">
              <a
                href={siteLinks.raceControlHome}
                className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-300 transition hover:border-orange-300 hover:text-orange-200"
              >
                Accueil RaceControl
              </a>
              <a
                href={siteLinks.liveTiming}
                className="rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/20"
              >
                Live Timing
              </a>
              <a
                href={siteLinks.siteVitrine}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-gray-300 transition hover:border-orange-300 hover:text-orange-200"
              >
                B404.FR
              </a>
            </div>

            <nav className="hidden items-center gap-4 text-sm font-semibold uppercase tracking-wide text-gray-300 md:flex">
              <a href="#servers" className="transition hover:text-orange-300">
                Serveurs
              </a>
              <a href="#about" className="transition hover:text-orange-300">
                &Agrave; propos
              </a>
              <a
                href={siteLinks.raceControlHome}
                aria-current={!isLiveTimingPage ? "page" : undefined}
                className={`rounded-full border px-4 py-2 transition hover:border-orange-300 hover:bg-orange-500/20 hover:text-orange-100 ${
                  !isLiveTimingPage
                    ? "border-orange-300/60 bg-orange-500/15 text-orange-100"
                    : "border-white/10 text-gray-300"
                }`}
              >
                Accueil RaceControl
              </a>
              <a
                href={siteLinks.liveTiming}
                aria-current={isLiveTimingPage ? "page" : undefined}
                className={`rounded-full border px-4 py-2 transition hover:border-orange-300 hover:bg-orange-500/20 hover:text-orange-100 ${
                  isLiveTimingPage
                    ? "border-orange-300/60 bg-orange-500/15 text-orange-100"
                    : "border-orange-400/40 bg-orange-500/10 text-orange-200"
                }`}
              >
                Live Timing
              </a>
              <button
                type="button"
                onClick={() => setIsContactOpen(true)}
                className="rounded-full border border-orange-400/40 px-4 py-2 text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10"
              >
                Contact
              </button>
              <a
                href={siteLinks.siteVitrine}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-gray-300 transition hover:border-orange-300 hover:bg-orange-500/10 hover:text-orange-200"
              >
                B404.FR
              </a>
            </nav>
          </div>
        </div>
      </header>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </>
  );
}

