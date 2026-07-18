export function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden border-y border-white/10 bg-[#09111d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,122,0,0.14),transparent_32%),linear-gradient(180deg,#06101d_0%,#09111d_100%)]" />
      <div className="relative mx-auto max-w-4xl px-6 py-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
          A propos
        </p>
        <h2 className="text-2xl font-black sm:text-3xl">
          Plateforme de <span className="text-orange-400">controle</span> des championnats B404
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">
          RaceControl est l outil central de la B404 pour suivre les sessions de simracing en direct.
          Consultez les temps, les classements et l etat des serveurs depuis une interface unique.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-gray-500">
          <span>Version 1.0.0</span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400">Operationnel</span>
          <span className="text-gray-600">|</span>
          <span>18 juillet 2026</span>
        </div>
      </div>
    </section>
  );
}
