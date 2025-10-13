const cards = [
  {
    title: "Consistent Characters",
    desc: "Create once and reuse across scenes.",
    img: "/resources/example1.webp",
  },
  {
    title: "Production Quality",
    desc: "High‑resolution, watermark‑free downloads.",
    img: "/resources/example2.webp",
  },
  {
    title: "Simple Workflow",
    desc: "Prompt, refine and iterate fast.",
    img: "/resources/example5.webp",
  },
];

export default function FeaturesGrid() {
  return (
    <section data-testid="features" className="bg-[#0a0d14]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white">
            Powerful tools for creators
          </h2>
          <p className="mt-3 text-white/70 text-lg">
            Everything you need to create stunning visuals
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="relative h-44">
                <img src={c.img} alt={c.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-white/70 leading-relaxed">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
