"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 bg-[#071426]/90 backdrop-blur-xl transition-all duration-300 ${
        isScrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6">
        <Link href="/" className="group">
          <p className="text-3xl font-black tracking-widest text-orange-400 transition group-hover:text-orange-300">
            B404
          </p>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-400 transition group-hover:text-gray-300">
            RaceControl
          </p>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold uppercase tracking-wide text-gray-300 md:flex">
          <a href="#servers" className="transition hover:text-orange-300">
            Serveurs
          </a>
          <a href="#about" className="transition hover:text-orange-300">
            &Agrave; propos
          </a>
          <a
            href="https://b404ldc.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-orange-400/40 px-4 py-2 text-orange-200 transition hover:border-orange-300 hover:bg-orange-500/10"
          >
            B404.fr
          </a>
        </nav>
      </div>
    </header>
  );
}
