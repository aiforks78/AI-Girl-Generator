/**
 * URL utilities for image processing and validation
 */

// Access environment variables - Next.js replaces process.env.NEXT_PUBLIC_* at build time
// These are available in both server and client bundles

export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  // Support relative URLs like /img/<id>
  if (url.startsWith('/img/')) return true;
  return isValidHttpUrl(url);
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv'];

function hasAllowedExtension(pathname: string, extensions: string[]): boolean {
  const lower = pathname.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

export function isValidMediaUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/img/')) return true;

  if (!isValidHttpUrl(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const allowedByExtension = hasAllowedExtension(pathname, IMAGE_EXTENSIONS) || hasAllowedExtension(pathname, VIDEO_EXTENSIONS);
    if (allowedByExtension) {
      return true;
    }

    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    // Allow extensionless resource URLs (e.g., Replicate, signed URLs) and keep lenient policy
    if (!lastSegment || !lastSegment.includes('.')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

export function addQueryParams(url: string, params: QueryParams): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    
    // Add new params in stable order
    const sortedKeys = Object.keys(params).sort();
    for (const key of sortedKeys) {
      const value = params[key];
      if (value !== undefined && value !== null) {
        urlObj.searchParams.set(key, String(value));
      }
    }
    
    // Return relative URL if input was relative
    if (url.startsWith('/')) {
      return urlObj.pathname + urlObj.search + urlObj.hash;
    }
    
    return urlObj.toString();
  } catch {
    // Fallback for invalid URLs
    const separator = url.includes('?') ? '&' : '?';
    const paramStr = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    return paramStr ? `${url}${separator}${paramStr}` : url;
  }
}

export interface ImageUrlOptions {
  base: string;
  width?: number;
  preview?: boolean;
  fmt?: 'webp' | 'png' | 'jpeg';
  quality?: number;
  watermark?: boolean;
  raw?: boolean;
  wmVersion?: string;
  assetBaseOverride?: string;
}

const DEFAULT_WATERMARK_VERSION = process.env.NEXT_PUBLIC_WATERMARK_VERSION || 'v5';

const R2_PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.R2_PUBLIC_BASE_URL || '';
let R2_PUBLIC_HOST = '';
if (typeof R2_PUBLIC_BASE === 'string' && R2_PUBLIC_BASE) {
  try {
    R2_PUBLIC_HOST = new URL(R2_PUBLIC_BASE).host.toLowerCase();
  } catch {
    R2_PUBLIC_HOST = '';
  }
}

export function buildImageUrl(options: ImageUrlOptions): string {
  const {
    base,
    width = 1400,
    preview = true,
    fmt = 'webp',
    quality = 85,
    watermark = true,
    raw = false,
    wmVersion = DEFAULT_WATERMARK_VERSION
  } = options;

  if (!base) return '';

  const params: QueryParams = {};
  const assetBase = normalizeBase(options.assetBaseOverride || resolveAssetBase());
  let targetBase = base;

  if (!/^https?:\/\//i.test(base) && base.startsWith('/img/')) {
    if (assetBase !== '/img') {
      const suffix = base.slice('/img'.length);
      targetBase = `${assetBase.replace(/\/$/, '')}${suffix}`;
    }
  }

  if (/^https?:\/\//i.test(base)) {
    try {
      const parsed = new URL(base);
      const host = parsed.host.toLowerCase();
      if (
        host.includes('r2.dev') ||
        host.includes('r2.cloudflarestorage.com') ||
        (R2_PUBLIC_HOST && host === R2_PUBLIC_HOST)
      ) {
        const objectKey = parsed.pathname.replace(/^\/+/, '');
        params.key = objectKey;
        const directBase = `${assetBase.replace(/\/$/, '')}/direct`;
        targetBase = directBase;
      }
    } catch {
      // ignore rewrite failures
    }
  }

  if (raw) {
    params.raw = 1;
    return addQueryParams(targetBase, params);
  }

  if (preview) {
    params.preview = 1;
    params.w = width;
    params.fmt = fmt;
    params.q = Math.max(60, Math.min(95, quality));
  }

  if (watermark && wmVersion) {
    params.wm = wmVersion;
  }

  return addQueryParams(targetBase, params);
}

export interface DownloadUrlOptions {
  filename?: string;
  allowedParams?: string[];
}

const DEFAULT_ALLOWED_PARAMS = ['raw', 'w', 'fmt', 'q', 'preview', 'wm', 'key'];

const ENV_API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const ENV_ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE || '';
const ENV_DOWNLOAD_BASE = process.env.NEXT_PUBLIC_DOWNLOAD_BASE || '';
const ENV_R2_PUBLIC_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '';

function normalizeBase(base: string): string {
  if (!base) return '';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function resolveApiBase(): string {
  const envBase = normalizeBase(ENV_API_BASE);
  if (envBase) return envBase;
  if (typeof window !== 'undefined') {
    return normalizeBase(window.location.origin || '');
  }
  return '';
}

function resolveAssetBase(): string {
  const envBase = normalizeBase(ENV_ASSET_BASE);
  if (envBase) return envBase;
  const apiBase = normalizeBase(ENV_API_BASE);
  if (apiBase) return `${apiBase}/img`;
  if (typeof window !== 'undefined') {
    const origin = normalizeBase(window.location.origin || '');
    if (origin) return `${origin}/img`;
  }
  return '/img';
}

/**
 * Resolve a public asset URL (for CDN-hosted samples, etc.)
 */
export function resolvePublicAssetUrl(path: string): string {
  const cleaned = (path || '').replace(/^\/+/, '');
  const cdnBase = normalizeBase(ENV_R2_PUBLIC_BASE);
  if (cdnBase) {
    return `${cdnBase}/${cleaned}`;
  }

  const assetBase = normalizeBase(ENV_ASSET_BASE);
  if (assetBase) {
    return `${assetBase}/${cleaned}`;
  }

  const apiBase = normalizeBase(ENV_API_BASE);
  if (apiBase) {
    return `${apiBase}/img/${cleaned}`;
  }

  return `/img/${cleaned}`;
}

function resolveDownloadBase(): string {
  const envBase = normalizeBase(ENV_DOWNLOAD_BASE);
  if (envBase) return envBase;
  return '/download';
}

export function buildDownloadUrl(
  pathOrUrl: string, 
  options: DownloadUrlOptions = {}
): string {
  const { filename, allowedParams = DEFAULT_ALLOWED_PARAMS } = options;
  
  if (!pathOrUrl) return '';

  let cleanUrl = pathOrUrl;
  
  // Extract and filter query parameters if needed
  if (allowedParams.length > 0) {
    try {
      const urlObj = new URL(pathOrUrl, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
      const filteredParams = new URLSearchParams();
      
      for (const param of allowedParams) {
        const value = urlObj.searchParams.get(param);
        if (value !== null) {
          filteredParams.set(param, value);
        }
      }
      
      cleanUrl = urlObj.pathname + (filteredParams.toString() ? `?${filteredParams.toString()}` : '');
    } catch {
      // Keep original URL if parsing fails
    }
  }

  const params: QueryParams = {
    url: cleanUrl
  };

  if (filename) {
    params.name = filename;
  }

  const downloadBase = resolveDownloadBase();
  const composed = addQueryParams(downloadBase, params);

  if (/^https?:\/\//i.test(composed)) {
    return composed;
  }

  if (composed.startsWith('/')) {
    const apiBase = resolveApiBase();
    if (!apiBase) return composed;
    return `${apiBase}${composed}`;
  }

  return composed;
}

export function suggestFilename(url: string, suffix = ''): string {
  if (!url) return `image${suffix}.png`;

  try {
    const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    const base = urlObj.pathname.split('/').pop() || 'image.png';

    // Extract extension from query params if available
    const fmt = urlObj.searchParams.get('fmt');
    const ext = fmt ? `.${fmt}` : '.png';

    if (!suffix) {
      // If base has no extension, add from query params
      const lastDotIndex = base.lastIndexOf('.');
      if (lastDotIndex <= 0) {
        return `${base}${ext}`;
      }
      return base;
    }

    const lastDotIndex = base.lastIndexOf('.');
    if (lastDotIndex > 0) {
      return `${base.slice(0, lastDotIndex)}${suffix}${base.slice(lastDotIndex)}`;
    }

    return `${base}${suffix}${ext}`;
  } catch {
    return `image${suffix}.png`;
  }
}
