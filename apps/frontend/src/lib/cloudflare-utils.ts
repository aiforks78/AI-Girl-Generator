/**
 * Cloudflare utilities with safe imports
 * Handles edge runtime compatibility for Cloudflare Workers/Pages
 */

// Type definitions for Cloudflare Workers
interface CloudflareDrawOptions {
  url: string;        // Required: absolute URL of overlay image
  width?: number;     // Optional: max width in pixels
  height?: number;    // Optional: max height in pixels
  opacity?: number;   // Optional: 0-1 transparency level
  repeat?: boolean | 'x' | 'y'; // Optional: tile image
  top?: number;       // Optional: pixel offset from top
  left?: number;      // Optional: pixel offset from left
  bottom?: number;    // Optional: pixel offset from bottom
  right?: number;     // Optional: pixel offset from right
  fit?: 'contain';    // Optional: sizing strategy
  rotate?: number;    // Optional: rotation in degrees
}

interface CloudflareImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  fit?: string;
  dpr?: number;
  draw?: CloudflareDrawOptions[];  // Array of overlay/watermark instructions
}

interface CloudflareFetchOptions {
  cf?: {
    image?: CloudflareImageOptions;
    cacheTtl?: number;
    cacheKey?: string;
  };
}

// Safely check if we're in Cloudflare Edge environment
export function isCloudflareEdge(): boolean {
  return typeof globalThis !== 'undefined' &&
         'caches' in globalThis &&
         'cf' in globalThis;
}

// Safely get Cloudflare caches API
export function getCloudflareCache(): Cache | null {
  try {
    if ('caches' in globalThis && (globalThis as any).caches?.default) {
      return (globalThis as any).caches.default;
    }
  } catch {
    // Ignore errors in non-Cloudflare environments
  }
  return null;
}

// Create fetch options with Cloudflare image transformations
export function createCloudflareFetchOptions(
  imageOptions: CloudflareImageOptions,
  cacheTtl: number = 86400,
  cacheKey?: string
): CloudflareFetchOptions {
  return {
    cf: {
      image: imageOptions,
      cacheTtl,
      cacheKey
    }
  };
}

// Enhanced fetch with Cloudflare options
export async function fetchWithCloudflare(
  url: string,
  options: CloudflareFetchOptions
): Promise<Response> {
  // In Cloudflare environment, use cf options
  // For local development, allow forcing Cloudflare options for testing
  const useCloudflareOptions = isCloudflareEdge() ||
    process.env.FORCE_CLOUDFLARE_OPTIONS === 'true';

  if (useCloudflareOptions) {
    return fetch(url, options as any);
  }

  // In non-Cloudflare environment, use regular fetch
  return fetch(url);
}

// Generate URL signature for raw downloads
export async function generateUrlSignature(
  objectKey: string,
  expiresIn: number = 3600,
  secret?: string
): Promise<{ sig: string; exp: number }> {
  const secretKey = secret || process.env.RAW_DOWNLOAD_SECRET;
  if (!secretKey) {
    throw new Error('RAW_DOWNLOAD_SECRET not configured');
  }

  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const message = `${objectKey}:${exp}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const sig = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { sig, exp };
}

// Build signed raw download URL
export async function buildRawDownloadUrl(
  baseUrl: string,
  objectKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const { sig, exp } = await generateUrlSignature(objectKey, expiresIn);
  const url = new URL(baseUrl);
  url.searchParams.set('raw', '1');
  url.searchParams.set('sig', sig);
  url.searchParams.set('exp', exp.toString());
  return url.toString();
}

// Create watermark draw options from environment config
export function createWatermarkDrawOptions(imageWidth?: number): CloudflareDrawOptions {
  const watermarkUrl = process.env.WATERMARK_IMAGE_URL || 'https://api.girlgenerator.net/assets/wm.png';
  const scale = parseFloat(process.env.WATERMARK_SCALE || '0.35');
  const opacity = parseFloat(process.env.WATERMARK_OPACITY || '0.5');
  const offsetX = parseInt(process.env.WATERMARK_OFFSET_X || '12');
  const offsetY = parseInt(process.env.WATERMARK_OFFSET_Y || '12');

  const watermarkWidth = imageWidth ? Math.round(imageWidth * scale) : undefined;

  return {
    url: watermarkUrl,
    opacity: opacity,
    right: offsetX,      // Position from right edge
    top: offsetY,        // Position from top edge
    ...(watermarkWidth && { width: watermarkWidth })
  };
}

export type { CloudflareImageOptions, CloudflareFetchOptions, CloudflareDrawOptions };