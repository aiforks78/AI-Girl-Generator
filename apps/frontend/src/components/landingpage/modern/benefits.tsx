import React from "react";
import { Zap, Image, ArrowRight, DollarSign, Shield, Clock } from "lucide-react";
import Link from "next/link";

const benefits: Array<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: React.ReactNode;
  gradient: string;
}> = [
  {
    icon: Zap,
    title: "One-Sentence Magic",
    description: "Describe your girl in plain English—our prompt engine does the heavy lifting.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: Image,
    title: "True-to-Life Quality",
    description: "Powered by a curated stack of starter, premium, and max-tier generators—plus dedicated remix and video engines—so every AI girl keeps rich skin texture, natural lighting, and accurate ethnicity.",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    icon: ArrowRight,
    title: "Straight-Through Workflow",
    description: (
      <>
        From the very first AI girl{" "}
        <Link href="/text-to-image" className="link-primary" title="Generate AI portraits with text to image">
          portrait
        </Link>
        {" "}→{" "}
        <Link href="/image-to-image" className="link-primary" title="Create lifestyle variations with image to image">
          lifestyle photos
        </Link>
        {" "}→{" "}
        <Link href="/image-to-video" className="link-primary" title="Convert images to 8-second videos">
          8-second videos
        </Link>
        , your girl grows from one prompt to a full content library.
      </>
    ),
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    icon: DollarSign,
    title: "Cost-Controlled",
    description: (
      <>
        Predictable pay-as-you-go{" "}
        <Link href="/pricing" className="link-primary" title="View transparent pricing plans">
          pricing
        </Link>
        —no hidden tiers or credit traps.
      </>
    ),
    gradient: "from-green-500 to-emerald-600",
  },
  {
    icon: Shield,
    title: "Commercial-Ready",
    description: "Every girl asset is uniquely generated and watermark-tracked for safe monetization.",
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    icon: Clock,
    title: "Lightning Fast",
    description: "Generate AI girl portraits in 30 seconds, lifestyle scenes in 45 seconds, videos under 3 minutes.",
    gradient: "from-rose-500 to-pink-600",
  },
];

export default function Benefits() {
  return (
    <section className="relative py-24 bg-gradient-to-br from-slate-900 via-gray-900 to-black overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-600/10 to-pink-600/5 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-blue-600/10 to-cyan-600/5 blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Why <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI Girl Generator?</span>
          </h2>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Meet the all-in-one AI girl engine built for creators who need consistent quality, fast turnarounds, and predictable workflows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 hover:transform hover:scale-105"
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/80 group-hover:bg-clip-text transition-all duration-300">
                  {benefit.title}
                </h3>
                
                <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                  {benefit.description}
                </p>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10`} />
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-4 bg-gradient-to-r from-white/5 to-white/10 border border-white/20 rounded-2xl px-8 py-4 backdrop-blur-sm">
            <span className="text-white font-medium">Ready to generate your next AI girl?</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
