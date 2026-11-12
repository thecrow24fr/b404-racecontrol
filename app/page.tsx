import { SiteHeader } from "./_components/site-header";
import { HeroSection } from "./_components/hero-section";
import { AboutSection } from "./_components/about-section";
import { SiteFooter } from "./_components/site-footer";
import { ScrollTopButton } from "./_components/scroll-top-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <SiteHeader showPrimaryNavigation={false} />
      <main id="top">
        <HeroSection />
        <AboutSection />
      </main>
      <SiteFooter />
      <ScrollTopButton />
    </div>
  );
}
