import { logger } from "./logger";
import { resolvePublicUrl, CdnEnv } from "./cdn";
import { cachedEncodeURIComponent } from "./url-cache";

const encoder = new TextEncoder();

export interface R2SigningEnv extends CdnEnv {
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
}

export function clampExpires(expires?: number): number {
  if (!expires || Number.isNaN(expires)) return 900;
  return Math.max(60, Math.min(3600, Math.floor(expires)));
}

export function buildObjectKey(prefix: string, fileName: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const shard = randomId(6);
  const safePrefix = prefix ? `${prefix}/` : "";
  return `${safePrefix}${yyyy}/${mm}/${dd}/${shard}_${fileName}`;
}

export async function generatePresignedPutUrl(env: R2SigningEnv, objectKey: string, fileType: string, expiresIn: number) {
  const accountId = env.R2_ACCOUNT_ID ?? "";
  const bucketName = env.R2_BUCKET_NAME ?? "";
  const accessKeyId = env.R2_ACCESS_KEY_ID ?? "";
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY ?? "";

  logger.debug("[r2/sign] env summary", {
    accountId: maskValue(accountId),
    accessKeyId: maskValue(accessKeyId),
    secretKey: maskValue(secretAccessKey)
  });

  const endpointHost = `${bucketName}.${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${endpointHost}`;

  const expiresAt = Date.now() + expiresIn * 1000;

  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "") + "Z";
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const includeContentType = !!fileType && fileType !== "application/octet-stream";
  const signedHeaders = "host";

  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders
  });

  const canonicalQueryString = encodeParams(query);
  const canonicalHeaders = `host:${endpointHost}\n`;
  const canonicalRequest = [
    "PUT",
    `/${objectKey}`,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");

  logger.debug("[r2/sign] canonical request", {
    canonicalRequest,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders
  });

  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashedCanonicalRequest
  ].join("\n");

  logger.debug("[r2/sign] string to sign", {
    stringToSign,
    hashedCanonicalRequest
  });

  const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, "auto", "s3");
  const signature = await hmacHex(signingKey, stringToSign);

  const presignedUrl = `${endpoint}/${encodeURI(objectKey)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

  logger.debug("[r2/sign] signature", {
    signature,
    presignedUrl
  });

  const publicUrl = resolvePublicUrl(env, objectKey);

  return {
    uploadUrl: presignedUrl,
    expiresAt,
    publicUrl,
    headers: includeContentType ? { "Content-Type": fileType } : undefined
  };
}

function randomId(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

function maskValue(value?: string | null): string {
  if (!value) return "<undefined>";
  if (value.length <= 8) return `${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function encodeParams(params: URLSearchParams): string {
  return Array.from(params.entries())
    .map(([key, value]) => `${cachedEncodeURIComponent(key)}=${cachedEncodeURIComponent(value)}`)
    .sort()
    .join("&");
}

async function sha256Hex(content: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
  return toHex(new Uint8Array(hashBuffer));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacHex(key: ArrayBuffer, content: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(content));
  return toHex(new Uint8Array(signature));
}

async function deriveSigningKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacBuffer(kDate, region);
  const kService = await hmacBuffer(kRegion, service);
  return hmacBuffer(kService, "aws4_request");
}

async function hmac(key: string, content: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(content));
}

async function hmacBuffer(key: ArrayBuffer, content: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(content));
}

