import "server-only";
import crypto from "node:crypto";

type JwtVerifyResult =
  | { ok: true; payload: any }
  | { ok: false; expired?: boolean; error?: string };

function base64urlDecode(segment: string): Buffer {
  segment = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  return Buffer.from(segment + padding, "base64");
}

export function verifyJwt(token: string, secret: string): JwtVerifyResult {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { ok: false, error: "INVALID_FORMAT" };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signingInput)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(encodedSignature))) {
      return { ok: false, error: "INVALID_SIGNATURE" };
    }

    const payloadJson = base64urlDecode(encodedPayload).toString("utf8");
    const payload = JSON.parse(payloadJson);

    const exp = typeof payload.exp === "number" ? payload.exp : undefined;
    const now = Math.floor(Date.now() / 1000);
    if (exp !== undefined && now >= exp) {
      return { ok: false, expired: true };
    }

    return { ok: true, payload };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "UNKNOWN" };
  }
}

export type { JwtVerifyResult };
