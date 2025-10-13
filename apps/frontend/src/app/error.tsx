"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-24 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Error 500</p>
          <h1 className="text-4xl font-semibold">Something broke on our side</h1>
          <p className="text-white/70">
            We&apos;re logging this incident automatically. Please try again or let us know what you were doing when this happened.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold shadow-lg transition hover:scale-105"
          >
            Try again
          </button>
          <Link href="/" className="text-sm text-purple-300 hover:text-purple-200 font-medium">
            Return to homepage
          </Link>
          <Link href="/contact" className="text-sm text-purple-300 hover:text-purple-200 font-medium">
            Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}

