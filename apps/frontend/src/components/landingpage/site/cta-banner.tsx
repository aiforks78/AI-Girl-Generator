"use client";

import { Button } from "@heroui/react";
import { useAppContext } from "@/contexts/app";

export default function CtaBanner() {
  const { setIsLoginOpen } = useAppContext();
  return (
    <section data-testid="cta" className="bg-[#0a0d14]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-8 md:p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">
            Start creating in minutes — free plan included
          </h3>
          <p className="mt-3 text-white/80 text-lg">
            5 daily credits. No watermark. Keep your creations forever.
          </p>
          <div className="mt-6 flex justify-center">
            <Button className="bg-white text-black font-semibold px-8 py-6 h-12" radius="sm" onPress={() => setIsLoginOpen(true)}>
              Get started free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
