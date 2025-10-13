"use client";

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE?.trim();

function normalizeBase(base?: string | null): string {
  if (!base) return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

const API_BASE = normalizeBase(DEFAULT_API_BASE || "");

function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  if (!base) return path;
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

type ApiFetchOptions = RequestInit & { rawUrl?: boolean };

export async function apiFetch(path: string, init: ApiFetchOptions = {}): Promise<Response> {
  const { rawUrl, headers, credentials, ...rest } = init;
  const url = rawUrl ? path : resolveUrl(path);
  const mergedHeaders = new Headers(headers || {});
  if (!mergedHeaders.has("Accept")) mergedHeaders.set("Accept", "application/json");
  const response = await fetch(url, {
    credentials: credentials ?? "include",
    ...rest,
    headers: mergedHeaders
  });
  return response;
}

export function getApiBase(): string {
  if (API_BASE) return API_BASE;
  if (typeof window !== "undefined") return window.location.origin;
  throw new Error("NEXT_PUBLIC_API_BASE is not configured");
}

export function buildApiUrl(path: string): string {
  return resolveUrl(path);
}
