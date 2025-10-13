"use client";

import { apiFetch } from "@/lib/api-client";

export async function captureAndUploadPoster(jobId: number, videoUrl: string): Promise<string | null> {
  try {
    const posterDataUrl = await captureVideoFrame(videoUrl);
    if (!posterDataUrl) return null;
    const res = await apiFetch('/video/poster', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, data_url: posterDataUrl })
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.url || null;
  } catch {
    return null;
  }
}

export function captureVideoFrame(src: string, atSeconds = 0.1, maxWidth = 512): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      const cleanup = () => {
        try { video.pause(); } catch {}
        try { video.src = ''; } catch {}
      };
      video.addEventListener('error', () => { cleanup(); resolve(null); });
      video.addEventListener('loadedmetadata', () => {
        try {
          // Clamp time within duration
          const t = Math.min(Math.max(0.01, atSeconds), Math.max(0.09, (video.duration || 0.5) - 0.01));
          const onSeeked = () => {
            try {
              const vw = video.videoWidth || 0;
              const vh = video.videoHeight || 0;
              if (!vw || !vh) { cleanup(); resolve(null); return; }
              const scale = Math.min(1, maxWidth / vw);
              const tw = Math.round(vw * scale);
              const th = Math.round(vh * scale);
              const canvas = document.createElement('canvas');
              canvas.width = tw; canvas.height = th;
              const ctx = canvas.getContext('2d');
              if (!ctx) { cleanup(); resolve(null); return; }
              ctx.drawImage(video, 0, 0, tw, th);
              const dataUrl = canvas.toDataURL('image/png');
              cleanup();
              resolve(dataUrl);
            } catch {
              cleanup(); resolve(null);
            }
          };
          video.currentTime = t;
          video.addEventListener('seeked', onSeeked, { once: true });
        } catch { cleanup(); resolve(null); }
      }, { once: true });
      video.src = src;
      // Safari requires play() to advance currentTime sometimes; ignore promise
      video.play().catch(() => {});
    } catch { resolve(null); }
  });
}
