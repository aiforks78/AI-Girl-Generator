import { json as baseJson } from "./response";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://app.girlgenerator.net",
  "https://girlgenerator.net",
  "https://www.girlgenerator.net"
];

const LOCAL_ORIGIN_PREFIXES = [
  "http://localhost:",
  "http://127.0.0.1:",
  "http://0.0.0.0:",
  "http://[::1]:"
];

export interface CorsEnv {
  AUTH_ALLOWED_ORIGINS?: string;
}

export function getAllowedOrigins(env: CorsEnv): string[] {
  const raw = env.AUTH_ALLOWED_ORIGINS?.trim();
  if (raw && raw.length > 0) {
    return raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

export function resolveCorsOrigin(request: Request, env: CorsEnv): string {
  const allowed = getAllowedOrigins(env);
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin) {
    if (allowed.includes(requestOrigin)) {
      return requestOrigin;
    }
    if (LOCAL_ORIGIN_PREFIXES.some((prefix) => requestOrigin.startsWith(prefix))) {
      return requestOrigin;
    }
  }
  return allowed[0] ?? DEFAULT_ALLOWED_ORIGINS[0];
}

export function corsHeaders(
  request: Request,
  env: CorsEnv,
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "access-control-allow-origin": resolveCorsOrigin(request, env),
    "access-control-allow-credentials": "true",
    Vary: "Origin",
    ...(extra ?? {})
  };
}

export function jsonWithCors(
  request: Request,
  env: CorsEnv,
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return baseJson(body, status, corsHeaders(request, env, extraHeaders));
}
