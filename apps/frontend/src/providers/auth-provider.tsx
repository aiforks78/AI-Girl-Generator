"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, getApiBase } from "@/lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  provider?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (options?: { returnTo?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOGIN_EVENT = "GG_LOGIN_OK";
const DEFAULT_POPUP_DIMENSIONS = { width: 560, height: 680 };

interface AuthResponse {
  user?: AuthUser;
  sessionExpiresAt?: number;
  error?: string;
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await apiFetch("/auth/me", { cache: "no-store" });
    if (response.ok) {
      const data = (await response.json()) as AuthResponse;
      return data.user ?? null;
    }
  } catch (error) {
    console.warn("[auth] fetchCurrentUser failed", error);
  }
  return null;
}

function openCenteredPopup(url: string): Window | null {
  if (typeof window === "undefined") return null;
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;

  const width = window.outerWidth ?? window.innerWidth;
  const height = window.outerHeight ?? window.innerHeight;

  const left = dualScreenLeft + (width - DEFAULT_POPUP_DIMENSIONS.width) / 2;
  const top = dualScreenTop + (height - DEFAULT_POPUP_DIMENSIONS.height) / 2;

  const features = [
    `width=${DEFAULT_POPUP_DIMENSIONS.width}`,
    `height=${DEFAULT_POPUP_DIMENSIONS.height}`,
    `left=${Math.max(left, 0)}`,
    `top=${Math.max(top, 0)}`,
    "resizable=yes",
    "scrollbars=yes"
  ].join(",");

  return window.open(url, "gg-auth", features);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      setStatus("loading");
      const current = await fetchCurrentUser();
      if (current) {
        setUser(current);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    })()
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = promise;
    await promise;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allowedOrigins = useMemo(() => {
    const origins = new Set<string>();
    if (typeof window !== "undefined" && window.location?.origin) {
      origins.add(window.location.origin);
    }
    try {
      const apiOrigin = new URL(getApiBase()).origin;
      origins.add(apiOrigin);
    } catch (error) {
      console.warn("[auth] Failed to resolve API origin", error);
    }
    return origins;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.warn("[auth] logout failed", error);
    }
    setUser(null);
    setStatus("unauthenticated");
    try {
      window.dispatchEvent(new CustomEvent("credits:update", { detail: { force: true } }));
    } catch {}
  }, []);

  const login = useCallback(async (options?: { returnTo?: string }) => {
    if (typeof window === "undefined") return;

    const base = getApiBase();
    const returnUrl = options?.returnTo ?? window.location.href;
    const loginUrl = new URL("/auth/login", base);
    loginUrl.searchParams.set("mode", "popup");
    loginUrl.searchParams.set("return_to", returnUrl);

    const popup = openCenteredPopup(loginUrl.toString());
    if (!popup) {
      console.warn("[auth] Failed to open login popup");
      return;
    }

    setStatus("loading");

    await new Promise<void>((resolve) => {
      let resolved = false;

      const cleanup = () => {
        resolved = true;
        window.removeEventListener("message", onMessage);
        window.clearInterval(pollTimer);
        window.clearTimeout(timeoutId);
      };

      // Timeout fallback: if user closes popup manually after 2 minutes
      const timeoutId = window.setTimeout(() => {
        if (!resolved) {
          cleanup();
          setStatus(user ? "authenticated" : "unauthenticated");
          resolve();
        }
      }, 120000); // 2 minutes

      const onMessage = (event: MessageEvent) => {
        if (!allowedOrigins.has(event.origin)) return;
        if (event.data?.type === LOGIN_EVENT) {
          cleanup();
          popup.close();
          void refresh().then(() => {
            try {
              window.dispatchEvent(new CustomEvent("credits:update", { detail: { force: true } }));
            } catch {}
            resolve();
          });
        }
      };

      const pollTimer = window.setInterval(() => {
        try {
          if (popup.closed && !resolved) {
            cleanup();
            setStatus(user ? "authenticated" : "unauthenticated");
            resolve();
          }
        } catch (e) {
          // COOP policy blocks popup.closed access, ignore and rely on postMessage
        }
      }, 500);

      window.addEventListener("message", onMessage);
    });
  }, [allowedOrigins, refresh, user]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!allowedOrigins.has(event.origin)) return;
      if (event.data?.type === LOGIN_EVENT) {
        void refresh();
      }
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, [allowedOrigins, refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    login,
    logout,
    refresh
  }), [status, user, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthStatus(): AuthStatus {
  return useAuth().status;
}

export function useAuthUser(): AuthUser | null {
  return useAuth().user;
}
