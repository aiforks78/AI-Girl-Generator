"use client";

import React, { useState } from "react";
import { Button } from "@heroui/react";

const tools = [
  {
    id: "generation",
    name: "Image Generation",
    title: "Envision The Extraordinary",
    description: "Take creativity a step further with the transformative power of our AI Image Generation tool. It's not just about bringing your concepts to life — redefine the impossible.",
    features: [
      "Professional quality outputs",
      "Style-consistent results", 
      "Lightning-fast generation",
      "Intuitive controls"
    ],
    image: "/resources/example3.webp"
  },
  {
    id: "canvas", 
    name: "AI Canvas",
    title: "Edit With Precision",
    description: "Perfect your creations with our advanced AI Canvas. Make precise edits, add elements, and refine every detail with intelligent assistance.",
    features: [
      "Precise inpainting",
      "Object removal/addition",
      "Style transfer",
      "Real-time editing"
    ],
    image: "/resources/example1.webp"
  },
  {
    id: "upscale",
    name: "HD Enhancement", 
    title: "Crystal Clear Results",
    description: "Transform your images to stunning HD quality with our advanced upscaling technology. Every detail preserved and enhanced.",
    features: [
      "4K upscaling",
      "Detail enhancement",
      "Noise reduction", 
      "Batch processing"
    ],
    image: "/resources/example2.webp"
  }
];

export default function ToolkitTabs() {
  const [activeTab, setActiveTab] = useState("generation");
  const activeTool = tools.find(tool => tool.id === activeTab) || tools[0];

  return (
    <section className="bg-[#000000] py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Girl Generator's
            </span>
            <span className="text-white"> Toolkit</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Tabs and Content */}
          <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    activeTab === tool.id
                      ? "bg-purple-600 text-white"
                      : "bg-slate-800/50 text-white/70 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  {tool.name}
                </button>
              ))}
            </div>

            {/* Active Tool Content */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-white">
                  {activeTool.title}
                </h3>
                <p className="text-xl text-white/70 leading-relaxed">
                  {activeTool.description}
                </p>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTool.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8"
                radius="sm"
              >
                Try {activeTool.name}
              </Button>
            </div>
          </div>

          {/* Right - Visual */}
          <div className="relative">
            <div className="relative bg-slate-800/30 border border-purple-500/20 rounded-2xl overflow-hidden backdrop-blur-sm">
              <img
                src={activeTool.image}
                alt={activeTool.name}
                className="w-full h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Overlay UI Elements */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-[#000000]/40 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-white/60 text-sm mb-1">Currently Active</div>
                  <div className="text-white font-medium">{activeTool.name}</div>
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
