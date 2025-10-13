import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Girl Generator",
  description: "We couldn't find the page you're looking for. Explore Girl Generator's features, prompts, and pricing instead.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  const suggestions = [
    {
      label: "Create AI girl images from text",
      href: "/text-to-image",
      description: "Use our flagship text-to-image generator to craft photorealistic AI girl portraits with our newest diffusion engines.",
    },
    {
      label: "Remix photos with image-to-image AI",
      href: "/image-to-image",
      description: "Upload an existing shot and restyle it instantly with our guided image-to-image workflow.",
    },
    {
      label: "Turn stills into cinematic AI video",
      href: "/image-to-video",
      description: "Generate smooth cinematic clips starting from a single frame and storyboard-ready prompt guidance.",
    },
    {
      label: "Browse trending AI girl gallery",
      href: "/gallery",
      description: "Study curated poses, lighting, and styling ideas from the Girl Generator inspiration gallery.",
    },
    {
      label: "Compare pricing & credit plans",
      href: "/pricing",
      description: "Review plan tiers, credit costs, and Pro-only features before upgrading your account.",
    },
    {
      label: "Talk with our team",
      href: "/contact",
      description: "Reach out for enterprise access, prompt coaching, or account support from Girl Generator experts.",
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-24 flex items-center justify-center">
      <div className="w-full max-w-3xl space-y-12">
        <section className="text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Error 404</p>
          <h1 className="text-4xl md:text-5xl font-semibold">We couldn&apos;t find that page</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            The link may be outdated or the page has moved. Use the links below to keep exploring Girl Generator or head back to the homepage.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {suggestions.map(({ label, href, description }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 text-left transition hover:border-white/30 hover:bg-white/[0.05]"
            >
              <span className="font-medium text-white flex items-center gap-2">
                {label}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
              <p className="mt-2 text-sm text-white/60">
                {description}
              </p>
            </Link>
          ))}
        </section>

        <div className="flex flex-col items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold shadow-lg transition hover:scale-105"
          >
            Return to homepage
          </Link>
          <p className="text-sm text-white/50">
            Still stuck? <Link href="/contact" className="text-purple-300 hover:text-purple-200 font-medium">Contact support</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
