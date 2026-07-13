import { SiteHeader } from "./_components/site-header";
import { HeroSection } from "./_components/hero-section";
import { ServersSection } from "./_components/servers-section";
import { AboutSection } from "./_components/about-section";
import { SiteFooter } from "./_components/site-footer";
import { ScrollTopButton } from "./_components/scroll-top-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader />

      <main id="top">
        <HeroSection />
        <ServersSection />



















































        <AboutSection />
      </main>

      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}

