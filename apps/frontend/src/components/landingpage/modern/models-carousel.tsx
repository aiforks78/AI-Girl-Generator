"use client";

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const models = [
  {
    name: "Girl Generator XL",
    description: "Our flagship model optimized for creating beautiful and diverse female characters with exceptional detail.",
    category: "Character"
  },
  {
    name: "Lightning Fast",
    description: "High-speed generalist model. Great at everything from photorealism to artistic styles.",
    category: "Speed"
  },
  {
    name: "Cinematic Vision",
    description: "A model with strong focus on cinematic outputs. Excels at wider aspect ratios and dramatic lighting.",
    category: "Cinema"
  },
  {
    name: "PhotoRealistic Pro", 
    description: "Hyper-realistic photo generation with lifelike portraits and natural lighting.",
    category: "Photo"
  },
  {
    name: "Anime Style",
    description: "Specialized in anime and illustration styles with vibrant colors and detailed character work.",
    category: "Anime"
  },
  {
    name: "Fantasy Art",
    description: "Perfect for creating fantasy characters, environments, and magical scenes.",
    category: "Fantasy"
  },
  {
    name: "Fashion Forward",
    description: "Optimized for fashion photography, clothing design, and style-focused imagery.",
    category: "Fashion"
  },
  {
    name: "Artistic Vision",
    description: "Create stunning artistic renditions with various painting and illustration styles.",
    category: "Art"
  }
];

const categoryColors = {
  Character: "from-purple-500 to-pink-500",
  Speed: "from-blue-500 to-cyan-500", 
  Cinema: "from-orange-500 to-red-500",
  Photo: "from-green-500 to-emerald-500",
  Anime: "from-pink-500 to-rose-500",
  Fantasy: "from-violet-500 to-purple-500",
  Fashion: "from-yellow-500 to-orange-500",
  Art: "from-indigo-500 to-blue-500"
};

export default function ModelsCarousel() {
  return (
    <section className="bg-[#000000] py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Unveil New Creative Horizons with </span>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fine-tuned Models
            </span>
          </h2>
        </div>

        {/* Models Carousel */}
        <div className="relative">
          <Swiper
            modules={[Navigation, Autoplay]}
            spaceBetween={24}
            slidesPerView={1}
            navigation={{
              nextEl: '.models-next',
              prevEl: '.models-prev',
            }}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
              },
              1024: {
                slidesPerView: 3,
              },
              1280: {
                slidesPerView: 4,
              },
            }}
            loop={true}
            className="models-swiper"
          >
            {models.map((model, index) => (
              <SwiperSlide key={index}>
                <div className="group relative bg-slate-800/30 border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/40 transition-all duration-300 hover:scale-[1.02]">
                  {/* Category Badge */}
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${categoryColors[model.category as keyof typeof categoryColors]} mb-4`}>
                    {model.category}
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                      {model.name}
                    </h3>
                    
                    <p className="text-white/70 leading-relaxed text-sm">
                      {model.description}
                    </p>
                  </div>

                  {/* Sample Image Placeholder */}
                  <div className="mt-6 aspect-video bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg border border-purple-500/10 flex items-center justify-center">
                    <div className="text-white/40 text-sm">Model Sample</div>
                  </div>

                  {/* Hover Glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 pointer-events-none rounded-2xl" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          <button className="models-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <button className="models-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
