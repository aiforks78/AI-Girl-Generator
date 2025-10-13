import "server-only";

interface ApiServerFetchOptions extends RequestInit {
  token?: string;
  rawUrl?: boolean;
}

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_BASE (or API_BASE) must be configured for server-side API calls");
  }
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function resolveUrl(path: string, rawUrl?: boolean): string {
  if (rawUrl) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

export async function apiServerFetch(path: string, options: ApiServerFetchOptions = {}): Promise<Response> {
  const { token, rawUrl, headers, ...init } = options;
  const url = resolveUrl(path, rawUrl);
  const mergedHeaders = new Headers(headers || {});
  if (!mergedHeaders.has("Accept")) mergedHeaders.set("Accept", "application/json");
  if (token) {
    mergedHeaders.set("Cookie", `GG_SESSION=${token}`);
  }

  return fetch(url, {
    ...init,
    headers: mergedHeaders,
    cache: init.cache ?? "no-store"
  });
}

export async function apiServerJson<T>(path: string, options: ApiServerFetchOptions = {}): Promise<T> {
  const response = await apiServerFetch(path, options);
  if (!response.ok) {
    const detail = await safeErrorPayload(response);
    throw new Error(`API request failed: ${response.status} ${response.statusText} ${detail}`);
  }
  return response.json() as Promise<T>;
}

async function safeErrorPayload(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text ? `→ ${text.slice(0, 200)}` : "";
  } catch {
    return "";
  }
}
