"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { buildImageUrl } from "@/lib/url-utils";
import { generateImageAlt } from "@/lib/image-alt";
import { apiFetch } from "@/lib/api-client";

interface Character {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
  image_count: number;
  preview_images: Array<{ job_id: number; url: string }>;
}

interface CharacterCardProps {
  character: Character;
  onPreview?: (jobId: number) => void;
}

const PREVIEW_LIMIT = 4;

export default function CharacterCard({ character, onPreview }: CharacterCardProps) {
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState(false);
  const [allImages, setAllImages] = useState(character.preview_images);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedAll, setHasLoadedAll] = useState(
    character.image_count <= (character.preview_images?.length ?? 0)
  );

  const tileSize = "w-[160px] h-[160px] sm:w-[192px] sm:h-[192px] md:w-[224px] md:h-[224px] lg:w-[256px] lg:h-[256px] xl:w-[290px] xl:h-[290px]";

  useEffect(() => {
    setLoaded({});
    setExpanded(false);
    setAllImages(character.preview_images);
    setHasLoadedAll(character.image_count <= (character.preview_images?.length ?? 0));
  }, [character.id, character.preview_images, character.image_count]);

  useEffect(() => {
    setAllImages((prev) => {
      const existing = new Set(prev.map((img) => `${img.job_id}:${img.url}`));
      let changed = false;
      const merged = [...prev];
      for (const item of character.preview_images) {
        const jobIdRaw = typeof item?.job_id === "number" ? item.job_id : Number(item?.job_id ?? 0);
        const url = typeof item?.url === "string" ? item.url : "";
        if (!jobIdRaw || !url) continue;
        const key = `${jobIdRaw}:${url}`;
        if (existing.has(key)) continue;
        existing.add(key);
        merged.push({ job_id: jobIdRaw, url });
        changed = true;
      }
      return changed ? merged : prev;
    });
  }, [character.preview_images, character.image_count]);

  useEffect(() => {
    const knownCount = Math.max(character.preview_images.length, allImages.length);
    if (character.image_count > knownCount) {
      setHasLoadedAll(false);
    } else {
      setHasLoadedAll(true);
    }
  }, [character.image_count, character.preview_images, allImages.length]);

  const collapsedPreviews = allImages.slice(0, PREVIEW_LIMIT);
  const previews = expanded ? allImages : collapsedPreviews;
  const totalKnown = Math.max(character.image_count, allImages.length);
  const hasOverflow = totalKnown > collapsedPreviews.length;
  const remainingCollapsed = Math.max(0, totalKnown - collapsedPreviews.length);
  const formattedDate = new Date(character.created_at).toLocaleDateString();

  const handleToggleExpand = async () => {
    if (loadingMore) return;

    if (!expanded) {
      setExpanded(true);

      if (!hasLoadedAll && totalKnown > allImages.length) {
        setLoadingMore(true);
        const limit = 120;
        try {
          const response = await apiFetch(`/user/characters/${character.id}/images?limit=${limit}`, {
            cache: "no-store"
          });
          if (!response.ok) {
            throw new Error("Failed to load character images");
          }
          const data = await response.json().catch(() => null);
          const fetched = Array.isArray(data?.items) ? data.items : [];
          if (fetched.length > 0) {
            let merged: Array<{ job_id: number; url: string }> = [];
            setAllImages((prev) => {
              const existing = new Set(prev.map((img) => `${img.job_id}:${img.url}`));
              merged = [...prev];
              for (const item of fetched) {
                const jobIdRaw = typeof item?.job_id === "number" ? item.job_id : Number(item?.job_id ?? 0);
                const url = typeof item?.url === "string" ? item.url : "";
                if (!jobIdRaw || !url) continue;
                const key = `${jobIdRaw}:${url}`;
                if (existing.has(key)) continue;
                existing.add(key);
                merged.push({ job_id: jobIdRaw, url });
              }
              return merged;
            });
            const nextCount = merged.length > 0 ? merged.length : allImages.length;
            const fetchedAll = nextCount >= character.image_count || fetched.length < limit;
            setHasLoadedAll(fetchedAll);
          } else {
            setHasLoadedAll(true);
          }
        } catch (error) {
          console.error("[CharacterCard] failed to load images", error);
          toast.error("Failed to load more images. Please try again later.");
        } finally {
          setLoadingMore(false);
        }
      }
    } else {
      setExpanded(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-700 bg-[#111827] flex-shrink-0">
          {character.avatar_url ? (
            <img
              src={buildImageUrl({ base: character.avatar_url, preview: true, width: 80, fmt: 'webp', quality: 85 })}
              alt={`${character.name} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 text-2xl font-bold">
              {character.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-lg truncate">{character.name}</div>
          <div className="text-white/60 text-sm">{character.image_count} {character.image_count === 1 ? 'image' : 'images'} total</div>
        </div>

        {/* Created date + toggle */}
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="hidden sm:block text-white/50">{formattedDate}</span>
          {hasOverflow && (
            <button
              type="button"
              onClick={handleToggleExpand}
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white/80 hover:text-white hover:bg-[#1b2236] transition-colors disabled:opacity-50"
              disabled={loadingMore}
              aria-expanded={expanded}
            >
              {loadingMore ? 'Loading…' : expanded ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>
      </div>

      {/* Preview Images */}
      <div className={`flex gap-2 ${expanded ? 'flex-wrap' : ''}`}>
        {previews.length > 0 ? (
          <>
            {previews.map((item, idx) => {
              const jobId = item.job_id;
              const keyStr = `${character.id}-${idx}-${jobId}`;
              const isLastCollapsedTile = !expanded && idx === collapsedPreviews.length - 1 && remainingCollapsed > 0;
              const displayUrl = item.url;

              return (
                <button
                  key={keyStr}
                  type="button"
                  onClick={() => onPreview?.(item.job_id)}
                  className={`relative ${tileSize} rounded-lg overflow-hidden border border-gray-700 bg-[#111827] flex-shrink-0 group`}
                >
                  {!loaded[jobId] && <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" aria-hidden="true" />}
                  <img
                    src={buildImageUrl({ base: displayUrl, preview: true, width: 290, fmt: 'webp', quality: 75 })}
                    alt={generateImageAlt(`${character.name} image ${idx + 1}`)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded[jobId] ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    onLoad={() => setLoaded((prev) => ({ ...prev, [jobId]: true }))}
                  />
                  {isLastCollapsedTile && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{remainingCollapsed}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" aria-hidden="true" />
                </button>
              );
            })}
            {expanded && loadingMore && (
              <div className={`flex items-center justify-center text-white/60 border border-gray-700 bg-[#111827] rounded-lg ${tileSize}`}>
                Loading…
              </div>
            )}
          </>
        ) : (
          <div className={`flex items-center justify-center text-white/60 border border-gray-700 bg-[#111827] rounded-lg ${tileSize}`}>
            No Images
          </div>
        )}
      </div>
    </div>
  );
}
