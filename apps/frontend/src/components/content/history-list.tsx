"use client";

import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "@heroui/react";
import { modelLabel, toolLabel } from '@/lib/labels';
import { captureAndUploadPoster } from '@/lib/client/poster';
import { formatVideoFailReason } from '@/lib/video-failures';
import { buildImageUrl } from '@/lib/url-utils';
import { apiFetch } from '@/lib/api-client';
import type { Related } from '@/types/generation';
import { generateImageAlt } from '@/lib/image-alt';

export type HistoryItem = {
  id: number;
  status: string;
  prompt: string;
  action?: 'txt2img' | 'img2img' | 'img2vid';
  aspect_ratio?: string | null;
  image_url?: string | null;
  hd_url?: string | null;
  image_variants?: string[] | null;
  model_id?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  raw_image_url?: string | null;
  created_at: string;
  error_message?: string | null;
  related?: Related;
  character_id?: string | null;
};

function prettyStatus(v?: string | null) {
  const s = String(v || '').toLowerCase();
  if (s.includes('ready') || s.includes('succeeded') || s.includes('completed')) return 'ready';
  if (s.includes('failed') || s.includes('blocked') || s.includes('error')) return 'failed';
  return s || 'pending';
}

function HistoryListComponent({ items, onOpen, pinnedIds, renderActions }: { items: HistoryItem[]; onOpen: (item: HistoryItem) => void; pinnedIds?: number[]; renderActions?: (item: HistoryItem) => React.ReactNode; }) {
  const [enriched, setEnriched] = useState<Record<number, string[]>>({});
  const triedRef = React.useRef<Set<number>>(new Set());
  const posterTriedRef = useRef<Set<number>>(new Set());
  const [posters, setPosters] = useState<Record<number, string>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [displayed, setDisplayed] = useState<Record<number, string[]>>({});
  const preloadingRef = React.useRef<Set<string>>(new Set());

  const computeThumbs = React.useCallback((it: HistoryItem): string[] => {
    const variantsSrc = (enriched[it.id] || it.image_variants) as any;
    const variants = Array.isArray(variantsSrc) ? variantsSrc.filter(Boolean) : [];
    const baseThumbs = variants.length > 0 ? variants.slice(0, 4) : [String(it.hd_url || it.image_url || '')].filter(Boolean);
    return baseThumbs.map((b) => buildImageUrl({ base: String(b || ''), preview: true, width: 290, fmt: 'webp', quality: 75 }));
  }, [enriched]);

  useEffect(() => {
    let stop = false;
    (async () => {
      for (const it of items) {
        const id = Number(it.id);
        if (!Number.isFinite(id)) continue;
        if (!it.video_url) continue;
        if ((it as any).thumbnail_url || posters[id]) continue;
        if (posterTriedRef.current.has(id)) continue;
        posterTriedRef.current.add(id);
        try {
          const url = await captureAndUploadPoster(id, it.video_url!);
          if (!stop && url) setPosters(prev => ({ ...prev, [id]: url }));
        } catch {}
      }
    })();
    return () => { stop = true; };
  }, [items, posters]);

  useEffect(() => {
    let stop = false;
    (async () => {
      for (const it of items) {
        const id = Number(it.id);
        if (!Number.isFinite(id)) continue;
        if ((it as any).video_url) { triedRef.current.add(id); continue; }
        if (triedRef.current.has(id)) continue;
        const hasEnough = Array.isArray(it.image_variants) && it.image_variants.filter(Boolean).length >= 2;
        if (hasEnough) { triedRef.current.add(id); continue; }
        const st = String(it.status || '').toLowerCase();
        if (!st.includes('ready')) { triedRef.current.add(id); continue; }
        try {
          triedRef.current.add(id);
          const response = await apiFetch(`/generation/status?job_id=${id}`, { cache: 'no-store' });
          if (!response.ok) continue;
          const payload = await response.json().catch(() => null);
          if (!payload) continue;
          let variants: string[] = [];
          if (Array.isArray(payload?.job?.images)) {
            variants = payload.job.images
              .map((img: any) => (typeof img?.url === 'string' ? img.url : null))
              .filter((u: string | null): u is string => Boolean(u));
          } else if (Array.isArray(payload?.image_variants)) {
            variants = payload.image_variants.filter((u: unknown) => typeof u === 'string' && u) as string[];
          }
          if (!stop && variants.length >= 2) {
            setEnriched(prev => ({ ...prev, [id]: variants.slice(0, 4) }));
          }
        } catch {}
      }
    })();
    return () => { stop = true; };
  }, [items]);

  useEffect(() => {
    setDisplayed((prev) => {
      const next = { ...prev } as Record<number, string[]>;
      for (const it of items) {
        const id = Number(it.id);
        if (!Number.isFinite(id)) continue;
        if (!next[id] || next[id].length === 0) {
          next[id] = computeThumbs(it);
        }
      }
      return next;
    });
  }, [items, enriched, computeThumbs]);

  useEffect(() => {
    for (const it of items) {
      const id = Number(it.id);
      if (!Number.isFinite(id)) continue;
      const desired = computeThumbs(it);
      const current = displayed[id] || [];
      const maxLen = Math.max(desired.length, current.length);
      for (let i = 0; i < maxLen; i++) {
        const cur = current[i];
        const nxt = desired[i];
        if (!nxt || cur === nxt) continue;
        const key = `${id}-${i}-${nxt}`;
        if (preloadingRef.current.has(key)) continue;
        preloadingRef.current.add(key);
        const img = new Image();
        img.decoding = 'async' as any;
        img.onload = () => {
          setDisplayed((prev) => {
            const arr = Array.isArray(prev[id]) ? [...prev[id]] : [];
            arr[i] = nxt;
            return { ...prev, [id]: arr };
          });
          setLoaded((prev) => ({ ...prev, [`${id}-${i}`]: true }));
          preloadingRef.current.delete(key);
        };
        img.onerror = () => {
          preloadingRef.current.delete(key);
        };
        img.src = nxt;
      }
    }
  }, [items, enriched, displayed, computeThumbs]);

  return (
    <div className="space-y-4">
      {items.map((it) => {
        const statusPretty = prettyStatus(it.status);
        const isFailed = statusPretty === 'failed';
        const failureReason = formatVideoFailReason(it.error_message);

        const desiredThumbs = (displayed[it.id] && displayed[it.id].length ? displayed[it.id] : computeThumbs(it)) || [];
        const thumbs = desiredThumbs.filter(Boolean);

        const tileSize = "w-[160px] h-[160px] sm:w-[192px] sm:h-[192px] md:w-[224px] md:h-[224px] lg:w-[256px] lg:h-[256px] xl:w-[290px] xl:h-[290px]";

        return (
          <div key={it.id} className="rounded-2xl border border-gray-800 bg-[#0f172a] p-4">
            <div className="flex items-center gap-3 text-sm mb-3">
              <div className="font-semibold text-white">Girl Generator</div>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80">{toolLabel(it.action as any, it.status)}</span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80">{modelLabel(it.model_id)}</span>
              <span className="text-white/50">{new Date(it.created_at).toLocaleString()}</span>
              {Array.isArray(pinnedIds) && pinnedIds.includes(Number(it.id)) && statusPretty !== 'ready' && statusPretty !== 'failed' && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300">In progress</span>
              )}
              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 flex items-center gap-2">
                {statusPretty}
                {isFailed && (
                  <Tooltip content={failureReason} placement="top" closeDelay={50}>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 text-red-400" aria-label="Failed">!</span>
                  </Tooltip>
                )}
              </span>
            </div>

            {/* Failure styling is handled inside the preview tile; no extra banner needed */}

            <div className="text-white/90 text-sm mb-3 line-clamp-2">{it.prompt}</div>

            <div className="flex gap-4">
              {(() => {
                // Failed card: keep visuals consistent with the in-progress task tile
                if (isFailed) {
                  return (
                    <div className={`relative ${tileSize} rounded-lg overflow-hidden border border-gray-700 bg-[#111827] flex-shrink-0 cursor-pointer`} onClick={() => onOpen(it)}>
                      <div className="w-full h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                        <span className="text-red-400 font-semibold text-sm">Generation failed!</span>
                        <span className="text-xs text-red-300 leading-snug">{failureReason}</span>
                      </div>
                    </div>
                  );
                }

                if ((it as any).video_url) {
                  const poster = (it as any).thumbnail_url || posters[it.id];
                  return (
                    <div className={`relative ${tileSize} rounded-lg overflow-hidden border border-gray-700 bg-[#111827] cursor-pointer`} onClick={() => onOpen(it)}>
                      {poster
                        ? (<img src={poster} className="w-full h-full object-cover" alt={generateImageAlt(it.prompt, true)} />)
                        : ((it as any).video_url
                            ? (<video src={(it as any).video_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />)
                            : (<div className="w-full h-full bg-white/5 animate-pulse" aria-label="Video thumbnail pending" />)
                          )}
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-2 left-2 text-[11px] px-1.5 py-0.5 rounded bg-black/60 text-white border border-white/10">Video</div>
                    </div>
                  );
                }

                if (thumbs.length === 0) {
                  return (
                    <div className={`flex items-center justify-center text-white/60 border border-gray-700 bg-[#111827] rounded-lg ${tileSize}`}>
                      No Image
                    </div>
                  );
                }

                if (thumbs.length === 1) {
                  const src = String(thumbs[0] || '');
                  const keyStr = `${it.id}-0`;
                  return (
                    <div className={`relative ${tileSize} flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border border-gray-700 bg-[#111827]`} onClick={() => onOpen(it)}>
                      {!loaded[keyStr] && <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" aria-hidden="true" />}
                      <img
                        src={src}
                        alt={generateImageAlt(it.prompt)}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded[keyStr] ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        onLoad={() => setLoaded((prev) => ({ ...prev, [keyStr]: true }))}
                      />
                    </div>
                  );
                }

                return (
                  <div className="relative flex gap-2 flex-shrink-0 cursor-pointer" onClick={() => onOpen(it)}>
                    {thumbs.map((b, idx) => {
                      const src = String(b || '');
                      const keyStr = `${it.id}-${idx}`;
                      return (
                        <div
                          key={keyStr}
                          className={`relative ${tileSize} rounded-lg overflow-hidden border border-gray-700 bg-[#111827]`}
                        >
                          {!loaded[keyStr] && <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" aria-hidden="true" />}
                          <img
                            src={src}
                            alt={generateImageAlt(it.prompt)}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${loaded[keyStr] ? 'opacity-100' : 'opacity-0'}`}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onLoad={() => setLoaded((prev) => ({ ...prev, [keyStr]: true }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex-1 flex items-end justify-end gap-2">
                {renderActions?.(it)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default HistoryListComponent;
