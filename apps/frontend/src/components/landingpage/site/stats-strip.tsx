export default function StatsStrip() {
  const stats = [
    { label: "Creators", value: "1,500+" },
    { label: "Images", value: "12M" },
    { label: "Avg time", value: "3.2s" },
  ];

  return (
    <section data-testid="stats" className="bg-[#0a0d14] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-3 gap-4 text-center">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 py-4">
              <div className="text-2xl font-extrabold text-white">{s.value}</div>
              <div className="text-white/60 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
