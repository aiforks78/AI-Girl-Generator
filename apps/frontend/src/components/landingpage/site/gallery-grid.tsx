"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

const images = [
  { src: "/resources/example1.webp", alt: "AI girl editorial portrait in soft studio light" },
  { src: "/resources/example2.webp", alt: "AI girl cyberpunk fashion pose with neon signage" },
  { src: "/resources/example3.webp", alt: "AI girl cinematic evening scene in urban cafe" },
  { src: "/resources/example5.webp", alt: "AI girl travel lifestyle shot on coastal boardwalk" },
  { src: "/resources/example1.webp", alt: "AI girl beauty close-up with shimmering makeup" },
  { src: "/resources/example2.webp", alt: "AI girl streetwear concept with dynamic motion" },
];

export default function GalleryGrid() {
  return (
    <section data-testid="gallery" className="bg-[#0a0d14] border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white">Recent creations</h3>
            <p className="text-white/70">See what’s possible with a single prompt</p>
          </div>
          <a href="#" className="text-sm font-semibold text-white hover:opacity-80">
            Explore gallery →
          </a>
        </div>

        <Swiper
          spaceBetween={16}
          slidesPerView={1.2}
          breakpoints={{
            640: { slidesPerView: 2.2 },
            1024: { slidesPerView: 3.2 },
          }}
          loop
        >
          {images.map(({ src, alt }, idx) => (
            <SwiperSlide key={idx}>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <img src={src} alt={alt} className="w-full h-64 object-cover" loading="lazy" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
