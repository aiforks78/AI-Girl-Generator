"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Job } from '@/types/generation';
import { modelLabel, toolLabel } from '@/lib/labels';
import { useViewer } from '@/contexts/viewer-store';
import { useAuth } from '@/providers/auth-provider';
import { useAppContext } from '@/contexts/app';
import { HeartIcon, HeartSolidIcon, LinkIcon, ArrowDownTrayIcon } from '@/components/icons/local';
import { toast } from 'sonner';
import { useVariants } from '@/hooks/useVariants';
import { useProStatus } from '@/hooks/useProStatus';
import { useImageLoader } from '@/hooks/useImageLoader';
import { buildImageUrl, buildDownloadUrl, suggestFilename } from '@/lib/url-utils';
import { generateImageAlt } from '@/lib/image-alt';

export default function ViewerDrawer() {
  const { state, closeViewer, openViewer } = useViewer();
  const job = state.job as Job | null;
  const open = state.open;
  
  const {
    variants,
    selectedIndex,
    setSelectedIndex,
    currentUrl,
    hasMultiple,
    isExternalSource,
    navigateVariant,
    resetSelection,
    rawMap
  } = useVariants(job);
  
  const { checkProStatus } = useProStatus();
  
  useEffect(() => { resetSelection(); }, [job?.id, resetSelection]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeViewer();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateVariant('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateVariant('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeViewer, navigateVariant]);

  const previewUrl = useMemo(() =>
    buildImageUrl({ base: currentUrl, preview: true, width: 1400, fmt: 'webp', quality: 85 }),
    [currentUrl]
  );
  
  const rawUrl = useMemo(() => {
    const rawBase = rawMap[currentUrl] || currentUrl;
    return rawBase;
  }, [currentUrl, rawMap]);
  
  const fallbackUrl = useMemo(() => {
    const externalSources = job?.related?.external_sources;
    if (Array.isArray(externalSources) && externalSources.length > 0) {
      return externalSources[0];
    }
    return undefined;
  }, [job?.related?.external_sources]);
  
  const imageLoader = useImageLoader(previewUrl, {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackSrc: fallbackUrl ? buildImageUrl({ base: fallbackUrl, preview: true }) : undefined,
    onError: (src, error, retryCount) => {
      console.error(`Failed to load image: ${src} (attempt ${retryCount})`);
    }
  });
  const { user } = useAuth();
  const { setIsLoginOpen } = useAppContext();
  const [isFavorite, setIsFavorite] = useState(false);
  const [openDownloadMenu, setOpenDownloadMenu] = useState(false);
  const downloadBtnRef = useRef<HTMLButtonElement | null>(null);
  const downloadMenuRef = useRef<HTMLDivElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ left: number; top: number } | null>(null);
  const poweredByHref = "https://girlgenerator.net/?utm_source=watermark&utm_medium=content";

  useEffect(() => {
    if (!openDownloadMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        downloadBtnRef.current && !downloadBtnRef.current.contains(event.target as Node) &&
        downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)
      ) {
        setOpenDownloadMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDownloadMenu]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gg:favorites');
      if (!raw || !job?.id) { setIsFavorite(false); return; }
      const parsed = JSON.parse(raw || '{}') || {};
      setIsFavorite(!!(parsed[job.id] || parsed[String(job.id)]));
    } catch { setIsFavorite(false); }
  }, [job?.id]);

  const toggleFavorite = () => {
    if (!job?.id) return;
    setIsFavorite(prev => {
      const next = !prev;
      try {
        const raw = localStorage.getItem('gg:favorites');
        const store = (raw ? JSON.parse(raw) : {}) || {};
        store[job.id] = next; (store as any)[String(job.id)] = next;
        localStorage.setItem('gg:favorites', JSON.stringify(store));
        window.dispatchEvent(new CustomEvent('favorites:update', { detail: { id: job.id, value: next } }));
      } catch {}
      return next;
    });
  };

  const copyLink = async () => {
    if (!job?.id) return;
    try {
      // If already has public_id, use it directly
      if ((job as any)?.public_id) {
        const link = `${window.location.origin}/v/${(job as any).public_id}?source=share`;
        await navigator.clipboard.writeText(link);
        toast.success('Share link copied');
        return;
      }

      // If is_public but no public_id, generate one via API
      if ((job as any)?.is_public) {
        const response = await fetch(`/api/jobs/${job.id}/share`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Share API error:', response.status, errorText);
          throw new Error(`Failed to generate share link: ${response.status}`);
        }

        const data = await response.json();
        await navigator.clipboard.writeText(data.shareUrl);
        toast.success('Share link copied');

        // Update local job state with new public_id
        if (job && data.publicId) {
          (job as any).public_id = data.publicId;
        }
        return;
      }

      // Fallback: copy private content link
      const link = `${window.location.origin}/content/${job.id}`;
      await navigator.clipboard.writeText(link);
      toast.info('Private link copied - login required to view');
    } catch (error) {
      console.error('Copy link error:', error);
      toast.error('Failed to copy link');
    }
  };

  const doDownload = (url: string, name: string) => {
    if (!url) return;
    const downloadUrl = buildDownloadUrl(url, { filename: name });
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const copyPrompt = async () => {
    const text = job?.prompt || '';
    if (!text) { toast.error('No prompt'); return; }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Prompt copied');
    } catch {
      toast.error('Copy failed');
    }
  };
  const getDownloadFilename = (url: string, suffix = '') => {
    const baseFilename = url ? suggestFilename(url, suffix) : `image_${job?.id}${suffix}.png`;
    return baseFilename;
  };
  const ensurePro = async (): Promise<'pro'|'not-pro'|'not-logged-in'> => {
    if (!user?.id) {
      try { setIsLoginOpen?.(true); } catch {}
      return 'not-logged-in';
    }
    return await checkProStatus();
  };
  const downloadWithWatermark = () => {
    setOpenDownloadMenu(false);
    // Add watermark parameter for images
    const url = buildImageUrl({
      base: currentUrl,
      preview: true,
      width: 2048,
      fmt: 'png',
      quality: 95,
      watermark: true,
      wmVersion: 'v5'
    });
    doDownload(url, getDownloadFilename(url, '_wm'));
  };

  const downloadWithoutWatermark = async () => {
    if (isExternalSource(currentUrl)) {
      toast.error('External images cannot remove watermark');
      setOpenDownloadMenu(false);
      return;
    }
    const status = await ensurePro();
    if (status !== 'pro') {
      if (status === 'not-pro') {
        toast.error('Members only. Upgrade to download without watermark.');
      }
      return;
    }
    setOpenDownloadMenu(false);
    // Add raw=1 parameter to get the original image without watermark
    const rawDownloadUrl = buildImageUrl({
      base: rawUrl,
      raw: true,
      watermark: false
    });
    doDownload(rawDownloadUrl, getDownloadFilename(rawDownloadUrl, ''));
  };

  const downloadVideo = () => {
    setOpenDownloadMenu(false);
    const url = (job as any)?.video_url || '';
    if (!url) { toast.error('No video'); return; }
    doDownload(url, getDownloadFilename(url, ''));
  };
  const dims = (job?.image_width && job?.image_height)
    ? `${job.image_width} × ${job.image_height}`
    : '—';
  const aspect = useMemo(() => {
    if (job?.aspect_ratio) return job.aspect_ratio;
    const w = job?.image_width, h = job?.image_height;
    if (!w || !h) return '—';
    const r = w / h; const close = (a:number,b:number)=>Math.abs(a-b)<0.03;
    if (close(r,1)) return '1:1'; if (close(r,16/9)) return '16:9'; if (close(r,9/16)) return '9:16';
    if (close(r,4/3)) return '4:3'; if (close(r,3/4)) return '3:4'; if (close(r,3/2)) return '3:2'; if (close(r,2/3)) return '2:3';
    return '—';
  }, [job]);

  if (!open || !job) return null;
  const actionValue = String((job as any)?.action || '').toLowerCase();
  const isVideo = actionValue === 'img2vid' || actionValue === 'img2video' || !!(job as any)?.video_url;
  const currentIsVideo = currentUrl.toLowerCase().includes('.mp4') || currentUrl.toLowerCase().includes('.webm') || currentUrl.toLowerCase().includes('.mov');

  // For img2vid jobs, try to get video URL if current URL is not a video
  const videoUrl = isVideo ? ((job as any)?.video_url || currentUrl) : currentUrl;
  const shouldShowVideo = isVideo || currentIsVideo;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div 
        className="absolute inset-0" 
        onClick={closeViewer}
      />
      <div className="relative w-full max-w-[1600px] h-[90vh] z-10" onClick={(e)=>e.stopPropagation()}>
        <div className="relative w-full h-full flex gap-0 flex-col lg:flex-row">
          <div className="relative flex-1 min-w-[260px] min-h-[52vh] rounded-t-2xl lg:rounded-l-2xl overflow-hidden border border-gray-800 lg:border-r-0 bg-[#0b1220] flex items-center justify-center">
            {shouldShowVideo ? (
              videoUrl ? (
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  autoPlay
                  muted
                  className="max-w-full max-h-full object-contain bg-black"
                />
              ) : (
                <div className="text-white/70">No Video</div>
              )
            ) : (
              <>
                {imageLoader.loading && (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50"></div>
                  </div>
                )}
                {imageLoader.error && !imageLoader.loading && (
                  <div className="flex flex-col items-center justify-center text-white/70 gap-3">
                    <div>Failed to load image</div>
                    {imageLoader.canRetry && (
                      <button
                        onClick={imageLoader.retry}
                        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
                      >
                        Retry ({imageLoader.retryCount}/{3})
                      </button>
                    )}
                  </div>
                )}
                {imageLoader.src && !imageLoader.error && (
                  <img
                    src={imageLoader.src}
                    onLoad={imageLoader.handleLoad}
                    onError={imageLoader.handleError}
                    className="max-w-full max-h-full object-contain"
                    alt={generateImageAlt(job?.prompt)}
                  />
                )}
                {!imageLoader.src && !imageLoader.loading && (
                  <div className="text-white/70">No Image</div>
                )}
              </>
            )}
          </div>
         <aside className="relative z-10 lg:w-[420px] w-full bg-gray-900 border border-gray-800 lg:border-l-0 rounded-b-2xl lg:rounded-r-2xl lg:rounded-bl-none p-5 space-y-5 overflow-y-auto pb-24 max-h-[42vh] lg:max-h-none">
            {/* Header: Creator identity + created time + close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={(job as any)?.user_avatar || '/white-logo-32.png'}
                  alt={(job as any)?.user_name || 'Creator avatar'}
                  className="w-9 h-9 rounded-full border border-white/10 bg-white/5 object-cover flex-shrink-0"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
                <div className="min-w-0">
                  <div className="text-white font-medium leading-tight truncate">
                    {(job as any)?.user_name || 'Girl Generator'}
                  </div>
                  <div className="text-xs text-white/60 leading-tight truncate">
                    Created {job?.created_at ? new Date(job.created_at).toLocaleString() : ''}
                  </div>
                </div>
              </div>
              <button onClick={closeViewer} className="text-white/70 hover:text-white" aria-label="Close viewer">✕</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-xs border border-white/15 bg-white/5">{toolLabel(job?.action as any, job?.status)}</span>
              {job?.is_public && (
                <span className="px-2 py-0.5 rounded-md text-xs border border-white/15 bg-white/5">Public</span>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-white/60">Prompt</div>
                <button onClick={copyPrompt} className="px-2 py-0.5 rounded border border-white/15 bg-white/5 text-xs text-white/80 hover:text-white">Copy</button>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed break-words border border-white/15 bg-white/[0.04] rounded-md p-3 text-white/90">
                {job?.prompt || '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-white/60">Model:</div>
              <div className="text-white/90 text-xs uppercase tracking-wide">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/15 font-semibold">
                  {job?.model_id ? modelLabel(job.model_id) : 'Unknown'}
                </span>
              </div>
              {job?.action !== 'img2img' && (
                <>
                  <div className="text-white/60">Aspect Ratio:</div>
                  <div className="text-white/90">{aspect}</div>
                  <div className="text-white/60">{isVideo ? 'Video' : 'Output'} Dimension:</div>
                  <div className="text-white/90">{dims}</div>
                </>
              )}
            </div>
            {hasMultiple && (
              <div>
                <div className="mt-3 text-white/80 text-sm">Variants</div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {variants.map((u, i) => {
                    const isVideo = u.toLowerCase().includes('.mp4') || u.toLowerCase().includes('.webm') || u.toLowerCase().includes('.mov');
                    // For videos, use video_thumbnail_url if available, otherwise use a placeholder
                    const thumbnailUrl = isVideo && (job as any)?.video_thumbnail_url ? (job as any).video_thumbnail_url : u;
                    const src = buildImageUrl({ base: thumbnailUrl, preview: true, width: 290, fmt: 'webp', quality: 75 });
                    const selected = i === selectedIndex;
                    const isOriginal = isExternalSource(u);
                    const isImg2Vid = job?.action === 'img2vid';
                    const labelText = isOriginal ? (isImg2Vid ? 'Source' : 'Original') : '';
                    return (
                      <button
                        key={i}
                        className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border ${selected ? 'border-purple-400 ring-2 ring-purple-400/40' : 'border-gray-700'} focus:outline-none`}
                        onClick={() => setSelectedIndex(i)}
                        aria-current={selected}
                      >
                        <img
                          src={src}
                          className="w-full h-full object-cover"
                          alt={generateImageAlt(job?.prompt, isVideo)}
                        />
                        {isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        )}
                        {labelText && (
                          <span className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white border border-white/10">{labelText}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons section */}
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <button title="Favorite" onClick={toggleFavorite} className="p-1" aria-pressed={isFavorite}>
                    {isFavorite ? <HeartSolidIcon className="w-5 h-5 text-rose-500" /> : <HeartIcon className="w-5 h-5 text-white/80" />}
                  </button>
                  <button title="Copy Link" onClick={copyLink} className="p-1 text-white/80 hover:text-white"><LinkIcon className="w-4 h-4" /></button>
                  <div className="relative">
                    <button
                      ref={downloadBtnRef}
                      title="Download"
                      disabled={!currentUrl}
                      onClick={() => {
                        if (!currentUrl) return;
                        if (!openDownloadMenu && downloadBtnRef.current) {
                          const r = downloadBtnRef.current.getBoundingClientRect();
                          setMenuAnchor({ left: r.right, top: r.top });
                        }
                        setOpenDownloadMenu(v => !v);
                      }}
                      className={`p-1 ${!currentUrl ? 'text-white/30 cursor-not-allowed' : 'text-white/80 hover:text-white'}`}
                    >
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    </button>
                    {openDownloadMenu && menuAnchor && typeof window !== 'undefined' && typeof document !== 'undefined' && createPortal(
                      <div
                        ref={downloadMenuRef}
                        className="fixed w-64 rounded-xl border border-white/10 bg-[#111827]/95 backdrop-blur shadow-lg p-2 z-[9999] text-xs transform -translate-x-full -translate-y-3"
                        style={{ left: menuAnchor.left, top: menuAnchor.top }}
                      >
                        {isVideo ? (
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-white/90 hover:bg-white/5 rounded-md leading-tight" onClick={downloadVideo}>
                            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                            <span className="flex-1">Download</span>
                          </button>
                        ) : (
                          <>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-white/90 hover:bg-white/5 rounded-md leading-tight" onClick={downloadWithWatermark}>
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                              <span className="flex-1">Download with watermark</span>
                            </button>
                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-white/90 hover:bg-white/5 rounded-md leading-tight" onClick={downloadWithoutWatermark}>
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                              <span className="flex-1">Download without watermark</span>
                              <span className="text-[11px]">👑</span>
                            </button>
                          </>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full">
                <button
                  onClick={() => {
                    const modelParam = job?.model_id ? `&model=${job.model_id}` : '';
                    const baseUrl = job?.action === 'img2vid' ? '/image-to-video' : '/text-to-image';
                    window.location.href = `${baseUrl}?from=${job?.id}${modelParam}`;
                  }}
                  className="w-full h-10 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold shadow-lg"
                >
                  Create Similar Image
                </button>
              </div>

              <div className="text-center mt-2">
                <a
                  href={poweredByHref}
                  className="text-xs text-white/60 hover:text-purple-300 transition-colors"
                  rel="nofollow noreferrer noopener"
                >
                  Powered by Girl Generator
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
