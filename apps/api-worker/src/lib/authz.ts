import { AuthEnv } from "./types";
import { getSessionCookie } from "./cookie";
import { verifyJwt } from "./jwt";

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: string;
}

export type SessionResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; status: number };

export async function requireSessionUser(request: Request, env: AuthEnv): Promise<SessionResult> {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return { ok: false, error: "UNAUTHORIZED", status: 401 };
  }

  const verification = await verifyJwt(sessionCookie, env.AUTH_JWT_SECRET);
  if (!verification.ok) {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      status: verification.expired ? 401 : 403
    };
  }

  const payload = verification.payload as Record<string, unknown>;
  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    return { ok: false, error: "UNAUTHORIZED", status: 401 };
  }

  const user: SessionUser = {
    id: userId,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
    provider: typeof payload.provider === "string" ? payload.provider : undefined
  };

  return { ok: true, user };
}
