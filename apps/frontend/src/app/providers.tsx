"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ThemeProviderProps } from "next-themes/dist/types";
import { ThemeProvider as ColorThemeProvider } from "@/contexts/theme";
import { Toaster } from "sonner";
import { AuthProvider } from "@/providers/auth-provider";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export function Providers({ children }: any) {
  const router = useRouter();
  const [globalLoading, setGlobalLoading] = React.useState(false);

  React.useEffect(() => {
    const onLoading = (e: Event) => {
      try {
        const d = (e as CustomEvent).detail;
        setGlobalLoading(!!d);
      } catch { setGlobalLoading(false); }
    };
    try { window.addEventListener('global:loading', onLoading as EventListener); } catch {}
    return () => { try { window.removeEventListener('global:loading', onLoading as EventListener); } catch {} };
  }, []);

  return (
    <HeroUIProvider navigate={router.push}>
      <ColorThemeProvider>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
          {globalLoading && (
            <div className="fixed top-4 right-4 z-[70]">
              <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-label="Loading" />
            </div>
          )}
        </AuthProvider>
      </ColorThemeProvider>
    </HeroUIProvider>
  );
}
