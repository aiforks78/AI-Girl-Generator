import React from "react";
import Link from "next/link";

export default function CommunityStats() {
  return (
    <section className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  +18 Million Creators
                </span>
                <br />
                <span className="text-white">using Girl Generator</span>
              </h2>
              
              <p className="text-xl text-white/70 leading-relaxed">
                Our users love using Girl Generator to build their creative assets. We empower them to create visuals at scale, faster than ever, with cutting-edge technology.
              </p>
            </div>

            <Link
              href="/text-to-image"
              className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-4 text-lg rounded-lg transition-colors"
              aria-label="Join millions of creators and start generating"
            >
              Join them today
            </Link>
          </div>

          {/* Right Content - Testimonial Card */}
          <div className="relative">
            <div className="bg-slate-800/50 border border-purple-500/20 rounded-2xl p-8 backdrop-blur-sm">
              {/* Quote Mark */}
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-6">
                <span className="text-purple-300 text-2xl">"</span>
              </div>
              
              {/* Testimonial Text */}
              <blockquote className="text-white/90 text-lg leading-relaxed mb-6">
                I like to describe it as "photoshop on steroids." Girl Generator's advanced capabilities enable us to seamlessly blend and enhance images. These stills are then seamlessly integrated back into the workflow, resulting in highly detailed and expressive visual assets.
              </blockquote>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CM</span>
                </div>
                <div>
                  <div className="text-white font-semibold">Christophe Mes</div>
                  <div className="text-white/60 text-sm">Chief of Staff, Creative Agency</div>
                </div>
              </div>
            </div>

            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-xl -z-10 scale-110" />
          </div>
        </div>
      </div>
    </section>
  );
}
