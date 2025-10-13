"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

const slides = [
  { src: "/resources/example3.webp", alt: "AI girl city rooftop fashion film still" },
  { src: "/resources/example5.webp", alt: "AI girl sunrise jog along tropical beach" },
  { src: "/resources/example1.webp", alt: "AI girl editorial beauty portrait with studio haze" },
  { src: "/resources/example2.webp", alt: "AI girl music video concept in neon alley" },
  { src: "/resources/example3.webp", alt: "AI girl cocktail lounge scene with cinematic lighting" },
  { src: "/resources/example5.webp", alt: "AI girl travel content with drone perspective" },
];

export default function PlatformShowcase() {
  return (
    <section data-testid="platform" className="bg-[#0a0d14]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-14">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <Swiper spaceBetween={12} slidesPerView={1.1} breakpoints={{640:{slidesPerView:1.6}, 1024:{slidesPerView:2.2}}} loop>
            {slides.map(({ src, alt }, i) => (
              <SwiperSlide key={i}>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <img src={src} alt={alt} className="w-full h-[420px] object-cover" loading="lazy" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
