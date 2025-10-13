const DEFAULT_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-methods": "GET,POST,HEAD,OPTIONS,DELETE,PUT,PATCH",
  "access-control-allow-headers": "Content-Type, Authorization",
  "cache-control": "no-store"
} as const;

export function json(body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const pretty = status >= 400;
  const payload = JSON.stringify(body, null, pretty ? 2 : 0);
  return new Response(payload, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      "access-control-allow-origin": "*",
      ...(extraHeaders ?? {})
    }
  });
}

export const ALLOWED_CORS_ORIGINS = [
  "https://girlgenerator.net",
  "https://www.girlgenerator.net",
  "https://app.girlgenerator.net"
];

export function getCorsOrigin(origin: string | null): string {
  if (!origin) return "*";
  // Allow specific origins for credentialed requests
  if (ALLOWED_CORS_ORIGINS.includes(origin)) {
    return origin;
  }
  // Allow localhost for development
  if (origin.startsWith("http://localhost:")) {
    return origin;
  }
  if (origin.startsWith("http://127.0.0.1:")) {
    return origin;
  }
  if (origin.startsWith("http://0.0.0.0:")) {
    return origin;
  }
  if (origin.startsWith("http://[::1]:")) {
    return origin;
  }
  return "*";
}

export function jsonWithCors(request: Request, body: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  const pretty = status >= 400;
  const payload = JSON.stringify(body, null, pretty ? 2 : 0);
  const origin = request.headers.get("origin");
  const corsOrigin = getCorsOrigin(origin);

  const headers: Record<string, string> = {
    ...DEFAULT_HEADERS,
    "access-control-allow-origin": corsOrigin,
    ...(extraHeaders ?? {})
  };

  // Only add credentials header if using specific origin
  if (corsOrigin !== "*") {
    headers["access-control-allow-credentials"] = "true";
  }

  return new Response(payload, {
    status,
    headers
  });
}

export function noContent(extraHeaders?: Record<string, string>): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      ...(extraHeaders ?? {})
    }
  });
}
