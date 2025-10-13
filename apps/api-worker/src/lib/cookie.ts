const SESSION_COOKIE_NAME = "GG_SESSION";

export function sessionCookie(
  value: string,
  maxAgeSeconds: number,
  domain?: string | null,
  secure = true
) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`
  ];
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearSessionCookie(domain?: string | null, secure = true) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function getSessionCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(/;\s*/);
  for (const part of cookies) {
    const [key, ...rest] = part.split("=");
    if (!key) continue;
    if (key.trim() === SESSION_COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return null;
}
