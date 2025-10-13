import { getModelLabel } from '@shared/model-ids';

export function modelLabel(raw?: string | null): string {
  return getModelLabel(raw ?? undefined);
}

/**
 * Returns a human-friendly tool label.
 * - action: preferred source (txt2img | img2img | img2vid)
 * - status: optional fallback inference (contains 'img2img')
 */
export function toolLabel(action?: string | null, status?: string | null): string {
  const a = String(action || '').toLowerCase();
  if (a === 'img2img') return 'Image to Image';
  if (a === 'img2vid') return 'Image to Video';
  const s = String(status || '').toLowerCase();
  if (s.includes('img2img')) return 'Image to Image';
  return 'Text to Image';
}
