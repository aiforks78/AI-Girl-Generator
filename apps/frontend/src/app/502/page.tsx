import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Temporary Outage | Girl Generator",
  description: "Our upstream models are responding slowly right now. Please retry your Girl Generator request shortly.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function BadGatewayPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-24 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Error 502</p>
          <h1 className="text-4xl font-semibold">Upstream services are cooling off</h1>
          <p className="text-white/70">
            Our AI providers are taking longer than expected. We recommend retrying in a few minutes or checking the status dashboard.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/text-to-image"
            className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 font-semibold text-white/90 transition hover:border-white/40"
          >
            Try again now
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold shadow-lg transition hover:scale-105"
          >
            Back to homepage
          </Link>
        </div>

        <p className="text-sm text-white/50">
          Need help? <Link href="/contact" className="text-purple-300 hover:text-purple-200 font-medium">Reach out to support</Link>
        </p>
      </div>
    </main>
  );
}
