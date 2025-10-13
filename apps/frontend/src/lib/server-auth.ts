import "server-only";

import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/server-jwt";

export interface ServerAuthUser {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  provider?: string;
}

export interface ServerAuthResult {
  user: ServerAuthUser | null;
  token?: string;
}

export async function getServerAuth(): Promise<ServerAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get("GG_SESSION")?.value;
  const secret = process.env.AUTH_JWT_SECRET;

  if (!token || !secret) {
    return { user: null };
  }

  const verification = verifyJwt(token, secret);
  if (!verification.ok) {
    return { user: null };
  }

  const payload = verification.payload as Record<string, unknown>;
  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    return { user: null };
  }

  const user: ServerAuthUser = {
    id: userId,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
    image: typeof payload.picture === "string" ? payload.picture : undefined,
    provider: typeof payload.provider === "string" ? payload.provider : undefined
  };

  return { user, token };
}
