import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { ScrollTopButton } from "./scroll-top-button";

interface ModulePageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function ModulePageShell({
  eyebrow,
  title,
  description,
  children,
}: ModulePageShellProps) {
  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />
      <main>
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_78%_0%,rgba(255,122,0,0.16),transparent_36%),linear-gradient(180deg,#09111d_0%,#06101d_100%)]">
          <div className="mx-auto max-w-7xl px-6 py-14 sm:py-18">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-300">
              {description}
            </p>
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
