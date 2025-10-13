const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(data: Uint8Array): string {
  const binary = Array.from(data, (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binary);
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64urlDecode(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function jsonToBase64url(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return base64urlEncode(encoder.encode(json));
}

function parseJsonFromBase64url(segment: string): any {
  const bytes = base64urlDecode(segment);
  const json = decoder.decode(bytes);
  return JSON.parse(json);
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(
  payload: Record<string, unknown>,
  ttlSeconds: number,
  secret: string
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = { ...payload, iat: issuedAt, exp: issuedAt + ttlSeconds };

  const encodedHeader = jsonToBase64url(header);
  const encodedPayload = jsonToBase64url(fullPayload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importKey(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const signature = base64urlEncode(new Uint8Array(signatureBuffer));

  return `${signingInput}.${signature}`;
}

export type JwtVerifyResult =
  | { ok: true; payload: any }
  | { ok: false; expired?: boolean; payload?: any };

export async function verifyJwt(token: string, secret: string): Promise<JwtVerifyResult> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { ok: false };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const key = await importKey(secret);
    const signatureBytes = base64urlDecode(encodedSignature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer,
      encoder.encode(signingInput)
    );

    if (!isValid) {
      return { ok: false };
    }

    const payload = parseJsonFromBase64url(encodedPayload);
    const exp = typeof payload.exp === "number" ? payload.exp : undefined;
    const now = Math.floor(Date.now() / 1000);

    if (exp !== undefined && now >= exp) {
      return { ok: false, expired: true, payload };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false };
  }
}

export function stripJwtTimestamps(payload: Record<string, unknown>): Record<string, unknown> {
  const { exp, iat, nbf, ...rest } = payload;
  return rest;
}
