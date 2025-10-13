import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const columns = [
  {
    title: "For Creators",
    description: "Create production-quality visual assets for your projects with unprecedented quality, speed, and style-consistency.",
    href: "/text-to-image",
    image: "/resources/example1.webp"
  },
  {
    title: "Pricing", 
    description: "Bring your team's best ideas to life at scale, with our intuitive AI-first creative suite designed for collaboration and built for business.",
    href: "/pricing",
    image: "/resources/example2.webp"
  },
  {
    title: "For Developers",
    description: "Experience content creation excellence with Girl Generator's API. With unmatched scalability, effortlessly tailor outputs to your brand guidelines.",
    href: "/developers",
    image: "/resources/example3.webp"
  }
];

export default function ThreeColumns() {
  return (
    <section className="bg-[#0a0a0a] py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-3 gap-12">
          {columns.map((column, index) => (
            <Link
              key={index}
              href={column.href}
              aria-label={`${column.title} – ${column.description}`}
              className="group relative bg-gradient-to-br from-[#1a1a1a]/80 via-[#0f0f0f]/60 to-[#000000]/90 rounded-3xl border border-white/[0.08] overflow-hidden hover:border-white/20 transition-all duration-500 hover:scale-[1.01] backdrop-blur-sm"
            >
              {/* Image */}
              <div className="relative h-80 overflow-hidden">
                <img
                  src={column.image}
                  alt={column.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width:1024px) 33vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-10 space-y-6">
                <div className="flex items-start justify-between">
                  <h3 className="text-3xl font-bold text-white group-hover:text-white transition-colors leading-tight">
                    {column.title}
                  </h3>
                  <ArrowUpRight 
                    size={28} 
                    className="text-white/60 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 mt-1 flex-shrink-0" 
                  />
                </div>
                
                <p className="text-white/60 leading-relaxed text-lg font-light">
                  {column.description}
                </p>
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/[0.03] group-hover:to-pink-500/[0.03] transition-all duration-500 pointer-events-none rounded-3xl" />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
