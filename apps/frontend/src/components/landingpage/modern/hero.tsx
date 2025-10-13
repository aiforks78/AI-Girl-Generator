import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buildImageUrl, resolvePublicAssetUrl } from "@/lib/url-utils";

// Use CDN directly for static sample video to enable browser caching
const SAMPLE_VIDEO_URL = (() => {
  const cdnBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (cdnBase) {
    return `${cdnBase}/public/Sample/sample_video.mp4`;
  }
  return buildImageUrl({ base: resolvePublicAssetUrl('public/Sample/sample_video.mp4'), raw: true });
})();

interface ModernHeroProps {
  getStartedHref?: string;
}

export default function ModernHero({ getStartedHref }: ModernHeroProps) {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-hidden">
      {/* Background Effects - Leonardo AI Style */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#6d28d9]/40 to-[#ec4899]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/30 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-[#a855f7]/5 to-[#d946ef]/5 blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-52 pb-20">
        {/* Top Content - Text */}
        <div className="text-center mb-16 space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">Girl Generator</span>
            <br />
            <span className="text-white">
              Free AI Image Generator Platform
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto font-light">
            Generate photorealistic portraits, branded scenes, and cinematic clips in minutes. Our AI girl generator platform pairs neural rendering with credit-based pricing so your team ships campaigns faster—no prompt engineering degree required.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <Link
              href={getStartedHref ?? "/text-to-image"}
              className="inline-flex items-center justify-center bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white hover:from-[#9333ea] hover:to-[#db2777] font-semibold px-12 py-5 text-xl rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
              aria-label="Start using the AI girl generator from Girl Generator to create your next character"
            >
              Try the AI Girl Generator Free
            </Link>
          </div>
        </div>

        {/* Bottom Content - Large Featured Video */}
        <div className="relative flex justify-center">
          <div className="relative group w-full max-w-5xl">
            {/* Main Featured Video - Matching image-to-video sample */}
            <video
              src={SAMPLE_VIDEO_URL}
              className="w-full aspect-[4/5] md:aspect-[16/10] object-cover rounded-3xl shadow-2xl"
              autoPlay
              muted
              playsInline
              loop
              controls
              preload="auto"
              poster="/resources/example3.png"
              width="1280"
              height="1024"
              aria-label="AI girl generator demo video showcasing photorealistic portraits and motion"
            />

            {/* Background Glow Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30 blur-3xl -z-10 scale-110 group-hover:scale-115 transition-transform duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-tl from-blue-600/20 to-cyan-600/20 blur-2xl -z-20 scale-125 opacity-50"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
