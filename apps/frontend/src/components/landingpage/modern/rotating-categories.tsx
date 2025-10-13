"use client";

import React, { useState, useEffect } from "react";

const categories = [
  "Inspiration",
  "Character Design", 
  "Game Assets",
  "Concept Art",
  "Graphic Design",
  "Fashion",
  "Marketing",
  "Advertising", 
  "Product Photography",
  "Architecture",
  "Interior Design",
  "And much more"
];

const categoryImages = [
  ["/resources/example1.webp", "/resources/example2.webp", "/resources/example3.webp"],
  ["/resources/example2.webp", "/resources/example3.webp", "/resources/example1.webp"],
  ["/resources/example3.webp", "/resources/example1.webp", "/resources/example2.webp"],
  ["/resources/example1.webp", "/resources/example3.webp", "/resources/example2.webp"],
  ["/resources/example2.webp", "/resources/example1.webp", "/resources/example3.webp"],
  ["/resources/example3.webp", "/resources/example2.webp", "/resources/example1.webp"],
  ["/resources/example1.webp", "/resources/example2.webp", "/resources/example3.webp"],
  ["/resources/example2.webp", "/resources/example3.webp", "/resources/example1.webp"],
  ["/resources/example3.webp", "/resources/example1.webp", "/resources/example2.webp"],
  ["/resources/example1.webp", "/resources/example3.webp", "/resources/example2.webp"],
  ["/resources/example2.webp", "/resources/example1.webp", "/resources/example3.webp"],
  ["/resources/example3.webp", "/resources/example2.webp", "/resources/example1.webp"]
];

export default function RotatingCategories() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % categories.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-[#000000] py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Use Girl Generator today for
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Categories List */}
          <div className="space-y-4">
            {categories.map((category, index) => (
              <div
                key={index}
                className={`relative px-6 py-4 rounded-lg cursor-pointer transition-all duration-300 ${
                  index === activeIndex
                    ? "bg-purple-600/20 border border-purple-500/30"
                    : "hover:bg-slate-800/30"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <h3 className={`text-lg font-medium transition-colors ${
                  index === activeIndex ? "text-purple-300" : "text-white/80 hover:text-white"
                }`}>
                  {category}
                </h3>
                
                {index === activeIndex && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-pink-400 rounded-r" />
                )}
              </div>
            ))}
          </div>

          {/* Image Grid */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {categoryImages[activeIndex]?.slice(0, 3).map((image, imgIndex) => (
                <div
                  key={imgIndex}
                  className={`relative overflow-hidden rounded-xl border border-purple-500/20 ${
                    imgIndex === 0 ? "col-span-2 aspect-video" : "aspect-square"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${categories[activeIndex]} example ${imgIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                </div>
              ))}
            </div>

            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 blur-xl -z-10 scale-110" />
          </div>
        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center mt-12 gap-2">
          {categories.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === activeIndex ? "bg-purple-400" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}