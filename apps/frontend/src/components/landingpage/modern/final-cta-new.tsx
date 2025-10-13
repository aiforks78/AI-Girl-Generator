import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

interface FinalCTAProps {
  getStartedHref?: string;
}

export default function FinalCTA({ getStartedHref }: FinalCTAProps) {
  return (
    <section className="relative py-24 bg-gradient-to-br from-black via-purple-950/20 to-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-600/20 to-pink-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-blue-600/15 to-cyan-600/10 blur-[100px]" />
        
        {/* Animated sparkles */}
        <div className="absolute inset-0">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <div className="w-1 h-1 bg-white/40 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl blur-xl opacity-50 -z-10" />
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8 mb-12">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Ready to generate your{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              AI girl?
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Join thousands of creators who craft signature AI girls—then expand them into lifestyle scenes and cinematic videos in minutes.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link
            href={getStartedHref ?? "/text-to-image"}
            className="group relative inline-flex items-center justify-center bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-bold px-12 py-6 text-xl rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 min-w-[280px]"
            aria-label="Generate your AI girl now"
          >
            <span className="relative z-10 flex items-center gap-3">
              Generate Your AI Girl Now
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </span>
            
            {/* Button glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 -z-10" />
            
            {/* Animated border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-20" style={{ padding: '1px' }}>
              <div className="w-full h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-2xl" />
            </div>
          </Link>

          {/* Secondary info */}
            <div className="flex items-center gap-3 text-white/60">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Free credits to get started</span>
            </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
              <span className="text-sm">Commercial License Included</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
              <span className="text-sm">Watermark Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full" />
              <span className="text-sm">Pay-as-you-go Pricing</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
