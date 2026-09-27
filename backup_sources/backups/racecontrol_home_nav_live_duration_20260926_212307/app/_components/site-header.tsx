"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ContactModal } from "./contact-modal";
import { siteLinks } from "../_config/site-links";

const navLinkClass =
  "inline-flex shrink-0 items-center rounded-full border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-300 transition hover:border-orange-300 hover:bg-orange-500/10 hover:text-orange-100";
const activeNavLinkClass = "border-orange-300/60 bg-orange-500/15 text-orange-100";
const disabledNavLinkClass =
  "inline-flex shrink-0 cursor-not-allowed items-center rounded-full border border-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-600";

const NAV_ITEMS = [
  { label: "RESULTS VIEWER", href: siteLinks.results, match: "/resultats", enabled: true },
  { label: "RECORDS", href: siteLinks.records, match: "/records", enabled: false },
  { label: "CHAMPIONSHIP MGR", href: siteLinks.championship, match: "/championnat", enabled: false },
  { label: "COMPETITIONS", href: siteLinks.competitions, match: "/competitions", enabled: false },
  { label: "OPTIONS", href: "#", match: "/options", enabled: false },
  { label: "LIVE", href: siteLinks.liveTiming, match: "/live-timing", enabled: true },
  { label: "ABOUT", href: siteLinks.about, match: "/a-propos", enabled: false },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

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
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6">
          <a
            href={siteLinks.raceControlHome}
            aria-label="Accueil RaceControl"
            className="group shrink-0"
          >
            <p className="text-3xl font-black tracking-widest text-orange-400 transition group-hover:text-orange-300">
              B404
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-400 transition group-hover:text-gray-300">
              RaceControl
            </p>
          </a>

          <nav
            aria-label="Navigation principale RaceControl"
            className="min-w-0 flex-1 overflow-x-auto"
          >
            <div className="flex min-w-max items-center justify-end gap-2 text-gray-300">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.match) ?? false;
                if (!item.enabled) {
                  return (
                    <span
                      key={item.label}
                      aria-disabled="true"
                      title="Indisponible — cette partie sera réalisée après validation de la partie précédente"
                      className={disabledNavLinkClass}
                    >
                      {item.label}
                    </span>
                  );
                }
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`${navLinkClass} ${isActive ? activeNavLinkClass : ""}`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsContactOpen(true)}
              className="inline-flex shrink-0 items-center rounded-full border border-orange-400/40 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10"
            >
              Contact
            </button>

            <a
              href={siteLinks.siteVitrine}
              target="_blank"
              rel="noopener noreferrer"
              className={navLinkClass}
            >
              B404
            </a>
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
