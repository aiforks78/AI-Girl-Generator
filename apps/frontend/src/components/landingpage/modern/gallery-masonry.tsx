"use client";

import React, { useState } from "react";
import { Button } from "@heroui/react";

const galleryImages = [
  {
    id: 1,
    src: "/resources/example1.webp",
    alt: "AI girl lifestyle studio portrait with soft window light",
    aspectRatio: "square"
  },
  {
    id: 2,
    src: "/resources/example2.webp", 
    alt: "AI girl cyberpunk street fashion pose at night",
    aspectRatio: "portrait"
  },
  {
    id: 3,
    src: "/resources/example3.webp",
    alt: "AI girl cinematic cafe scene at golden hour",
    aspectRatio: "landscape"
  },
  {
    id: 4,
    src: "/resources/example5.webp",
    alt: "AI girl runway fashion photography look",
    aspectRatio: "square"
  },
  {
    id: 5,
    src: "/resources/example1.webp",
    alt: "AI girl artistic close-up with hand-painted texture",
    aspectRatio: "portrait"
  },
  {
    id: 6,
    src: "/resources/example2.webp",
    alt: "AI girl character design concept with reference poses",
    aspectRatio: "square"
  },
  {
    id: 7,
    src: "/resources/example3.webp",
    alt: "AI girl digital art landscape shot with neon reflections",
    aspectRatio: "landscape"
  },
  {
    id: 8,
    src: "/resources/example5.webp", 
    alt: "AI girl creative portrait with neon rim lighting",
    aspectRatio: "square"
  }
];

export default function GalleryMasonry() {
  const [visibleImages, setVisibleImages] = useState(8);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Close on Escape for accessibility
  React.useEffect(() => {
    if (!selectedImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedImage]);

  const loadMore = () => {
    setVisibleImages(prev => Math.min(prev + 4, galleryImages.length));
  };

  const getGridClass = (aspectRatio: string) => {
    switch (aspectRatio) {
      case "landscape":
        return "col-span-2 row-span-1";
      case "portrait":
        return "col-span-1 row-span-2";
      case "square":
      default:
        return "col-span-1 row-span-1";
    }
  };

  const getAspectClass = (aspectRatio: string) => {
    switch (aspectRatio) {
      case "landscape":
        return "aspect-[2/1]";
      case "portrait":
        return "aspect-[1/2]";
      case "square":
      default:
        return "aspect-square";
    }
  };

  return (
    <section className="bg-[#000000] py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Platform
              </span>
              <span className="text-white"> Gallery</span>
            </h2>
            <p className="text-white/70 text-lg">
              Discover what's possible with our AI image generation
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-purple-400/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
              <div className="w-2 h-2 bg-purple-400/40 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
            </div>
            <span className="text-white/60 text-sm ml-2">Live generations</span>
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[200px]">
          {galleryImages.slice(0, visibleImages).map((image, index) => (
            <div
              key={image.id}
              className={`group relative overflow-hidden rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 cursor-pointer ${getGridClass(image.aspectRatio)}`}
              onClick={() => setSelectedImage(image.src)}
            >
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading={index < 6 ? "eager" : "lazy"}
                decoding="async"
                sizes="(min-width:1280px) 16.6vw, (min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-white text-sm font-medium truncate">
                    {image.alt}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">AI</span>
                    </div>
                    <span className="text-white/70 text-xs">Generated</span>
                  </div>
                </div>
              </div>

              {/* Loading shimmer effect on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transform bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-in-out" />
            </div>
          ))}
        </div>

        {/* Load More Button */}
        {visibleImages < galleryImages.length && (
          <div className="text-center mt-12">
            <Button
              onClick={loadMore}
              size="lg"
              variant="bordered"
              className="border-purple-500/30 text-white hover:border-purple-400 hover:bg-purple-500/10 px-8"
              radius="sm"
            >
              Load More Creations
            </Button>
          </div>
        )}

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-[#000000]/90 flex items-center justify-center z-50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Expanded gallery image"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedImage}
                alt="Expanded gallery image"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button
                type="button"
                aria-label="Close lightbox"
                onClick={() => setSelectedImage(null)}
                className="absolute -top-4 -right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
