"use client";

import React from "react";
import { Button, Input } from "@heroui/react";
import { Play } from "lucide-react";
import { useAppContext } from "@/contexts/app";

interface HeroProps {
  onGetStarted?: () => void;
  getStartedHref?: string;
}

export default function HomeHero({ onGetStarted, getStartedHref }: HeroProps) {
  const { setIsLoginOpen } = useAppContext();
  return (
    <section data-testid="hero" className="relative overflow-hidden bg-gradient-to-b from-[#0a0d14] via-[#0c1220] to-[#0a0d14]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-[480px] h-[480px] rounded-full bg-gradient-to-tr from-pink-500/20 to-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Now with daily free credits
            </div>
            <h1 className="mt-4 text-[40px] md:text-[56px] lg:text-[64px] leading-[1.05] font-extrabold tracking-tight text-white">
              AI Image Generator — Create Art, Images & Video
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/70 leading-relaxed max-w-xl">
              Generate consistent characters and stunning visuals in seconds. Free to start, watermark‑free downloads, simple workflow.
            </p>

            {/* Email / CTA row */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Input
                aria-label="Email"
                placeholder="Enter your email"
                type="email"
                size="lg"
                radius="sm"
                classNames={{
                  input: "text-base text-white placeholder:text-white/60",
                  inputWrapper: "h-12 bg-white/10 border border-white/20",
                }}
              />
              <Button
                size="lg"
                radius="sm"
                className="h-12 px-6 bg-white text-black font-semibold hover:opacity-90"
                as={getStartedHref ? "a" : undefined}
                href={getStartedHref}
                onPress={getStartedHref ? undefined : (onGetStarted || (() => setIsLoginOpen(true)))}
              >
                Get started free
              </Button>
              <Button
                size="lg"
                radius="sm"
                variant="bordered"
                className="h-12 px-6 text-white border-white/30 hover:border-white/60"
              >
                Watch demo
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400">●</span>
                <span>Commercial-ready exports</span>
                <span className="text-white/30">•</span>
                <span>No watermark downloads</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative rounded-2xl border border-white/10 bg-white/5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-sm">
              <img
                src="/resources/example3.webp"
                alt="AI girl lifestyle composite with cinematic lighting"
                className="w-full h-auto"
                loading="eager"
              />
            </div>

            {/* Floating thumbnails */}
            <div className="hidden md:block">
              <img
                src="/resources/example1.webp"
                alt="AI girl portrait close-up with soft glamour lighting"
                className="absolute -left-8 -bottom-8 w-40 rounded-xl border border-white/10 shadow-md bg-white/10 backdrop-blur-md"
                loading="lazy"
              />
              <img
                src="/resources/example2.webp"
                alt="AI girl dynamic streetwear pose in neon alley"
                className="absolute -right-8 -top-8 w-44 rounded-xl border border-white/10 shadow-md bg-white/10 backdrop-blur-md"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Avatar marquee */}
        <div className="mt-12">
          <p className="text-white/70 text-sm mb-4">Built for consistent AI characters at scale</p>
          <div className="relative overflow-hidden">
            <div className="grid grid-cols-3 gap-6 h-16">
              {Array.from({length: 3}).map((_, col) => (
                <div key={col} className={`relative overflow-hidden`}> 
                  <div className={`absolute inset-0 flex flex-col gap-3 animate-avatars-${col%2===0? 'up':'down'}`}>
                    {Array.from({length: 12}).map((__, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="inline-block w-7 h-7 rounded-full bg-white/10 border border-white/10" />
                        <span className="text-white/70 text-xs">Creator</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
