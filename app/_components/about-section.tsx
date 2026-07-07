import { AnimatedSection } from "./animated-section";

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative overflow-hidden border-y border-white/10 bg-[#09111d]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,122,0,0.14),transparent_32%),linear-gradient(180deg,#06101d_0%,#09111d_100%)]" />
      <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
        <AnimatedSection>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-orange-300">
            &Agrave; propos
          </p>
          <h2 className="text-4xl font-black sm:text-5xl">
            Plateforme de{" "}
            <span className="text-orange-400">contr&ocirc;le</span> des
            championnats B404
          </h2>
          <p className="mx-auto mt-5 max-w-2xl leading-7 text-gray-300">
            RaceControl est l&rsquo;outil central de la B404 pour suivre les
            sessions de simracing en direct. Consultez les temps, les
            classements et l&rsquo;&eacute;tat des serveurs depuis une
            interface unique.
          </p>
        </AnimatedSection>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              Version
            </p>
            <p className="mt-1 text-2xl font-black text-white">1.0.0</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              Statut
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              Op&eacute;rationnel
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">
              Mise &agrave; jour
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {new Date().toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
