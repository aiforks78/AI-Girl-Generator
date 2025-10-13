"use client";

import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { cn } from "@heroui/react";

export default function FeaturesDropdown() {
  const [open, setOpen] = useState(false);

  const items = [
    {
      title: "Lucid Origin",
      desc: "Our new model for photoreal images.",
      href: "/text-to-image",
      img: "/resources/example3.webp",
    },
    {
      title: "Image to Image",
      desc: "Transform images with style transfers.",
      href: "/text-to-image",
      img: "/resources/example1.webp",
    },
    {
      title: "Prompt Magic",
      desc: "Get better results with prompt tools.",
      href: "/text-to-image",
      img: "/resources/example2.webp",
    },
  ];

  return (
    <Popover isOpen={open} onOpenChange={setOpen} placement="bottom" offset={12}>
      <PopoverTrigger>
        <button
          className={cn(
            "text-white/80 hover:text-white font-medium inline-flex items-center gap-1"
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          Features
          <svg className="inline-block ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" fill="none"><path d="M1.5 4 6 8l4.5-4" strokeWidth="1.5" stroke="currentColor"/></svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-0 bg-[#0b1220] border border-white/10 max-w-[720px] w-[92vw]"
      >
        <div className="grid md:grid-cols-3 gap-0">
          {items.map((it) => (
            <a
              key={it.title}
              href={it.href}
              className="group block border-r border-white/10 last:border-r-0"
            >
              <div className="relative h-28 overflow-hidden">
                <img
                  src={it.img}
                  alt={it.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-semibold text-sm">{it.title}</h4>
                  <span className="inline-flex w-6 h-6 items-center justify-center rounded-md bg-white/10 text-white/80 group-hover:bg-white group-hover:text-black transition-colors">→</span>
                </div>
                <p className="text-white/60 text-xs mt-1 line-clamp-2">{it.desc}</p>
              </div>
            </a>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-white/10 text-white/60 text-xs">
          Explore all features for creators and teams
        </div>
      </PopoverContent>
    </Popover>
  );
}
