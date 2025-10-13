"use client";

import React from "react";
import { Button } from "@heroui/react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useAppContext } from "@/contexts/app";

export default function FinalCTA() {
  const { setIsLoginOpen } = useAppContext();
  return (
    <section className="bg-gradient-to-br from-purple-900 via-slate-900 to-black py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-tr from-blue-500/10 to-purple-500/20 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-500/30">
                <Sparkles size={16} className="text-purple-300" />
                <span className="text-purple-300 text-sm font-medium">Start Creating Today</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                <span className="text-white">Create your next </span>
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  artwork
                </span>
                <span className="text-white">, with the power of Girl Generator</span>
              </h2>
              
              <p className="text-xl text-white/70 leading-relaxed">
                Join millions of creators who are already transforming their ideas into stunning visuals. No credit card needed to get started.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-6 text-lg"
                  radius="sm"
                  endContent={<ArrowUpRight size={20} />}
                  onPress={() => setIsLoginOpen(true)}
                >
                  Start using Girl Generator
                </Button>
                
                <Button
                  size="lg"
                  variant="bordered"
                  className="border-purple-500/30 text-white hover:border-purple-400 hover:bg-purple-500/10 px-8 py-6 text-lg"
                  radius="sm"
                  as="a"
                  href="/pricing"
                >
                  View Pricing
                </Button>
              </div>
              
              <div className="flex items-center gap-1 text-white/60">
                <Sparkles size={16} className="text-purple-400" />
                <span className="text-sm">No credit card needed</span>
              </div>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
              {[
                "5 free daily generations",
                "HD quality downloads", 
                "Multiple art styles",
                "Commercial usage rights"
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-white/80">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Visual */}
          <div className="relative">
            {/* Main showcase image */}
            <div className="relative bg-slate-800/30 border border-purple-500/20 rounded-3xl overflow-hidden backdrop-blur-sm">
              <img
                src="/resources/example3.webp"
                alt="AI girl cinematic portrait with neon reflections"
                className="w-full h-96 object-cover"
              />
              
              {/* Overlay with generation UI */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                <div className="absolute bottom-6 left-6 right-6 space-y-4">
                  {/* Generation Status */}
                  <div className="bg-[#000000]/60 backdrop-blur-sm rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-sm">Generation Complete</span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full" />
                        <span className="text-green-400 text-xs">Ready</span>
                      </div>
                    </div>
                    <div className="text-white text-sm">
                      "Beautiful girl in futuristic attire, cyberpunk style, neon lighting..."
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 bg-purple-600/80 hover:bg-purple-600 text-white text-sm py-2 rounded-lg transition-colors">
                      Download HD
                    </button>
                    <button className="px-4 bg-slate-700/80 hover:bg-slate-700 text-white text-sm py-2 rounded-lg transition-colors">
                      ♥
                    </button>
                    <button className="px-4 bg-slate-700/80 hover:bg-slate-700 text-white text-sm py-2 rounded-lg transition-colors">
                      ↗
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -top-6 -left-6 w-20 h-20 bg-gradient-to-br from-purple-500/30 to-pink-500/20 rounded-full border border-purple-400/30 backdrop-blur-sm flex items-center justify-center">
              <Sparkles size={24} className="text-purple-300" />
            </div>
            
            <div className="absolute -bottom-6 -right-6 bg-[#000000]/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-500/20">
              <div className="text-white/80 text-xs font-medium">Generated in 3.2s</div>
            </div>

            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-xl -z-10 scale-110" />
          </div>
        </div>
      </div>
    </section>
  );
}
