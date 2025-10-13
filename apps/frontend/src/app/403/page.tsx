import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Restricted | Girl Generator",
  description: "Access to this resource is restricted. If you believe this is an error, please contact Girl Generator support.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-24 flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60">Error 403</p>
          <h1 className="text-4xl font-semibold">This area is invite-only</h1>
          <p className="text-white/70">
            Your account doesn&apos;t currently have access to this section of Girl Generator. If you believe this is a mistake, contact our team and we&apos;ll review it quickly.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 text-left">
          <Link href="/pricing" className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 transition hover:border-white/25 hover:bg-white/[0.05]">
            <h2 className="font-medium text-white">Upgrade credits & plans</h2>
            <p className="mt-2 text-sm text-white/60">Compare credits and team plans to unlock additional features.</p>
          </Link>
          <Link href="/contact" className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5 transition hover:border-white/25 hover:bg-white/[0.05]">
            <h2 className="font-medium text-white">Contact support</h2>
            <p className="mt-2 text-sm text-white/60">We&apos;re able to review account permissions within one business day.</p>
          </Link>
        </div>

        <div className="pt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-semibold shadow-lg transition hover:scale-105"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}

