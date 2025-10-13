import { AuthEnv } from "../lib/types";
import { signJwt, stripJwtTimestamps, verifyJwt } from "../lib/jwt";
import { sessionCookie, clearSessionCookie, getSessionCookie } from "../lib/cookie";
import { exchangeCodeForTokens, fetchGoogleUser } from "../lib/google";
import { ensureUserRecords, SupabaseAdminClient } from "../lib/supabase";
import { uuidFromProviderId } from "../lib/id";
import { logger } from "../lib/logger";

const DEFAULT_ALLOWED_ORIGIN = "https://app.girlgenerator.net";
const COOKIE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const STATE_TTL_SECONDS = 5 * 60; // 5 minutes
const RENEW_THRESHOLD_RATIO = 0.2;

type AuthRouteEnv = AuthEnv;

interface CorsContext {
  origin: string;
  credentials: boolean;
}

export async function handleAuthRequest(request: Request, env: AuthRouteEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth/")) {
    return null;
  }

  const cors = resolveCorsContext(request, env);
  const method = request.method.toUpperCase();
  const path = url.pathname.replace(/\/+$/, "");

  try {
    if (path === "/auth/me" && method === "GET") {
      return await handleAuthMe(request, env, cors);
    }

    if (path === "/auth/logout" && method === "POST") {
      return respondNoContent(cors, cookieDomain(env), cookieSecure(env));
    }

    if (path === "/auth/login" && method === "GET") {
      return await handleAuthLogin(request, env, cors);
    }

    return respondJson(cors, { error: "Not found" }, 404);
  } catch (error) {
    console.error("[auth] request failed", error);
    return respondJson(cors, { error: "AUTH_INTERNAL_ERROR" }, 500);
  }
}

export function handleAuthOptions(request: Request, env: AuthRouteEnv): Response | null {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/auth/")) {
    return null;
  }
  const cors = resolveCorsContext(request, env);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": cors.origin,
    "Access-Control-Allow-Credentials": cors.credentials ? "true" : "false",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin"
  };

  const requestHeaders = request.headers.get("Access-Control-Request-Headers");
  if (requestHeaders) {
    headers["Access-Control-Allow-Headers"] = requestHeaders;
  } else {
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
  }

  headers["Access-Control-Max-Age"] = "86400";

  return new Response(null, { status: 204, headers });
}

async function handleAuthMe(request: Request, env: AuthRouteEnv, cors: CorsContext): Promise<Response> {
  const cookie = getSessionCookie(request);
  if (!cookie) {
    return respondJson(cors, { error: "UNAUTHORIZED" }, 401);
  }

  const verification = await verifyJwt(cookie, env.AUTH_JWT_SECRET);
  if (!verification.ok) {
    return respondJson(cors, { error: "UNAUTHORIZED" }, 401);
  }

  const payload = verification.payload as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : undefined;
  const issuedAt = typeof payload.iat === "number" ? payload.iat : undefined;

  let setCookie: string | undefined;
  if (exp && issuedAt) {
    const lifetime = exp - issuedAt;
    const remaining = exp - now;
    if (remaining < lifetime * RENEW_THRESHOLD_RATIO) {
      const refreshedPayload = stripJwtTimestamps(payload);
      const renewed = await signJwt(refreshedPayload, COOKIE_TTL_SECONDS, env.AUTH_JWT_SECRET);
      setCookie = sessionCookie(renewed, COOKIE_TTL_SECONDS, cookieDomain(env), cookieSecure(env));
    }
  }

  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    image: payload.picture,
    provider: payload.provider
  };

  // Apply daily topup on each /auth/me call (first call per day)
  try {
    const supabase = new SupabaseAdminClient(env);
    await supabase.rpc("daily_topup_to_minimum", {
      p_user_id: payload.sub,
      p_minimum: 6
    }).catch((error) => {
      console.warn("[auth/me] daily_topup_to_minimum failed", error);
    });
  } catch (error) {
    console.warn("[auth/me] daily_topup failed", error);
  }

  const headers = setCookie ? { "Set-Cookie": setCookie } : undefined;
  return respondJson(cors, { user, sessionExpiresAt: exp }, 200, headers);
}

async function handleAuthLogin(request: Request, env: AuthRouteEnv, cors: CorsContext): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "redirect";
  const provider = url.searchParams.get("provider") ?? "google";
  const baseOrigin = resolveBaseUrl(url, env);

  if (provider !== "google") {
    return respondJson(cors, { error: "UNSUPPORTED_PROVIDER" }, 400);
  }

  const redirectUri = `${baseOrigin}/auth/login`;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code && state) {
    return await handleAuthLoginCallback(url, { code, state, mode, redirectUri }, env, cors);
  }

  const allowedOrigins = getAllowedOrigins(env);
  const requestedReturnTo = url.searchParams.get("return_to");
  const sanitizedReturnTo = sanitizeReturnTo(requestedReturnTo, allowedOrigins, baseOrigin);

  const stateToken = await signJwt(
    { nonce: crypto.randomUUID(), return_to: sanitizedReturnTo, provider, mode },
    STATE_TTL_SECONDS,
    env.AUTH_JWT_SECRET
  );

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", stateToken);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");

  return respondRedirect(cors, authUrl.toString(), 302);
}

async function handleAuthLoginCallback(
  url: URL,
  params: { code: string; state: string; mode: string; redirectUri: string },
  env: AuthRouteEnv,
  cors: CorsContext
): Promise<Response> {
  const stateVerification = await verifyJwt(params.state, env.AUTH_JWT_SECRET);
  if (!stateVerification.ok) {
    return respondHtml(cors, "<p>Invalid state</p>", 400);
  }

  const statePayload = stateVerification.payload as { return_to?: string; provider?: string; mode?: string };
  const allowedOrigins = getAllowedOrigins(env);
  const baseOrigin = resolveBaseUrl(url, env);
  const returnTo = sanitizeReturnTo(statePayload.return_to ?? null, allowedOrigins, baseOrigin);
  const loginMode = typeof statePayload.mode === "string" && statePayload.mode.length > 0 ? statePayload.mode : params.mode;

  const tokens = await exchangeCodeForTokens(params.code, params.redirectUri, {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET
  });

  const googleUser = await fetchGoogleUser(tokens.access_token);
  const userId = await uuidFromProviderId("google", googleUser.sub);

  const signupBonus = parseInt(env.AUTH_SIGNUP_BONUS ?? "", 10);
  if (!Number.isFinite(signupBonus) || signupBonus <= 0) {
    console.error("[auth] AUTH_SIGNUP_BONUS not configured or invalid, user registration may fail");
  }

  await ensureUserRecords({
    env,
    userId,
    email: googleUser.email,
    name: googleUser.name,
    avatarUrl: googleUser.picture,
    provider: "google",
    providerUserId: googleUser.sub,
    signupBonus: signupBonus
  });

  const sessionPayload = {
    sub: userId,
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    provider: "google",
    iss: env.AUTH_JWT_ISS ?? "girl-generator-api",
    aud: env.AUTH_JWT_AUD ?? "girl-generator-web"
  };

  const sessionToken = await signJwt(sessionPayload, COOKIE_TTL_SECONDS, env.AUTH_JWT_SECRET);
  const cookieHeader = sessionCookie(
    sessionToken,
    COOKIE_TTL_SECONDS,
    cookieDomain(env),
    cookieSecure(env)
  );
  const headers: Record<string, string> = {
    "Set-Cookie": cookieHeader
  };

  if (loginMode === "popup") {
    const targetOrigin = new URL(returnTo).origin;
    const body = `<!doctype html><html><body><script>
      (function() {
        const targetOrigin = '${targetOrigin.replace(/'/g, "\\'")}';
        function notifyParent() {
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'GG_LOGIN_OK' }, targetOrigin);
            }
          } catch (err) {
            console.error('[auth] postMessage failed', err);
          }
          setTimeout(() => {
            try { window.close(); } catch { /* ignore */ }
          }, 100);
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', notifyParent);
        } else {
          notifyParent();
        }
      })();
    </script></body></html>`;
    return respondHtml(cors, body, 200, headers);
  }

  return respondRedirect(cors, returnTo, 302, headers);
}

function resolveCorsContext(request: Request, env: AuthRouteEnv): CorsContext {
  const allowedOrigins = getAllowedOrigins(env);
  const requestOrigin = request.headers.get("Origin");
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0] ?? DEFAULT_ALLOWED_ORIGIN;
  return { origin, credentials: true };
}

function getAllowedOrigins(env: AuthRouteEnv): string[] {
  const raw = env.AUTH_ALLOWED_ORIGINS ?? DEFAULT_ALLOWED_ORIGIN;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function cookieDomain(env: AuthRouteEnv): string | null | undefined {
  if (typeof env.AUTH_COOKIE_DOMAIN === "string") {
    const trimmed = env.AUTH_COOKIE_DOMAIN.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return ".girlgenerator.net";
}

function cookieSecure(env: AuthRouteEnv): boolean {
  const configured = env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (configured === "false" || configured === "0") return false;
  if (configured === "true" || configured === "1") return true;
  const baseUrl = env.AUTH_BASE_URL?.trim();
  return baseUrl ? baseUrl.startsWith("https://") : true;
}

function resolveBaseUrl(url: URL, env: AuthRouteEnv): string {
  const configured = env.AUTH_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return url.origin.replace(/\/+$/, "");
}

function sanitizeReturnTo(input: string | null, allowedOrigins: string[], baseOrigin: string): string {
  if (!allowedOrigins.length) {
    allowedOrigins.push(DEFAULT_ALLOWED_ORIGIN);
  }
  const primary = allowedOrigins[0];

  if (!input) return primary;

  try {
    if (input.startsWith("/")) {
      return `${primary}${input}`;
    }
    const parsed = new URL(input);
    if (allowedOrigins.includes(parsed.origin)) {
      return parsed.toString();
    }
  } catch {
    // fall through to defaults
  }

  try {
    const parsed = new URL(input, `${baseOrigin}/`);
    if (allowedOrigins.includes(parsed.origin)) {
      return parsed.toString();
    }
  } catch {
    // ignore
  }

  return primary;
}

function respondJson(
  cors: CorsContext,
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": cors.origin,
      "Access-Control-Allow-Credentials": cors.credentials ? "true" : "false",
      "Vary": "Origin",
      ...extraHeaders
    }
  });
}

function respondHtml(
  cors: CorsContext,
  body: string,
  status = 200,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": cors.origin,
      "Access-Control-Allow-Credentials": cors.credentials ? "true" : "false",
      "Vary": "Origin",
      ...extraHeaders
    }
  });
}

function respondNoContent(
  cors: CorsContext,
  cookieDomainValue?: string | null,
  secure?: boolean
): Response {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": cors.origin,
    "Access-Control-Allow-Credentials": cors.credentials ? "true" : "false",
    "Vary": "Origin"
  };
  headers["Set-Cookie"] = clearSessionCookie(cookieDomainValue, secure !== false);
  return new Response(null, { status: 204, headers });
}

function respondRedirect(
  cors: CorsContext,
  location: string,
  status = 302,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
      "Access-Control-Allow-Origin": cors.origin,
      "Access-Control-Allow-Credentials": cors.credentials ? "true" : "false",
      "Vary": "Origin",
      ...extraHeaders
    }
  });
}
