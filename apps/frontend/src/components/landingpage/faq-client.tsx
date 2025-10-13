"use client";

import React from "react";

export default function FAQClientWrapper({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;

    // Ensure all FAQ items start closed by default
    const items = Array.from(root.querySelectorAll<HTMLDetailsElement>("details"));
    items.forEach((el) => {
      el.open = false;
    });
  }, []);

  return <div ref={ref}>{children}</div>;
}

