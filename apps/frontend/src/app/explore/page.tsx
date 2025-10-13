export const metadata = {
  title: "Explore – Girl Generator",
  alternates: {
    canonical: "/explore",
  },
};

export default function ExplorePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-16 text-white">
      <h1 className="text-4xl font-extrabold mb-6">Explore</h1>
      <p className="text-white/70 mb-10">Discover recent creations and popular styles. More coming soon.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/10" />
        ))}
      </div>
    </main>
  );
}
