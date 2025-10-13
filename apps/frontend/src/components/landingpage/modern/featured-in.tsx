import React from "react";

const logos = [
  { name: "Forbes", logo: "/logo-forbes.svg" },
  { name: "TechCrunch", logo: "/logo-techcrunch.svg" },
  { name: "Wired", logo: "/logo-wired.svg" },
  { name: "VentureBeat", logo: "/logo-venturebeat.svg" },
  { name: "The Verge", logo: "/logo-theverge.svg" },
  { name: "Mashable", logo: "/logo-mashable.svg" }
];

export default function FeaturedIn() {
  return (
    <section className="bg-[#000000] py-16 border-t border-purple-500/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-white/60 text-sm uppercase tracking-wider font-medium">
            As Featured In
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center opacity-60">
          {logos.map((item, index) => (
            <div key={index} className="flex items-center justify-center">
              <div className="w-24 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="text-white/60 text-xs font-medium">
                  {item.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}