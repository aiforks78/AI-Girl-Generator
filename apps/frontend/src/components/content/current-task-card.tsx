"use client";

import React from "react";
import { Tooltip } from "@heroui/react";
import { SparklesIcon } from "@/components/icons/local";
import { formatVideoFailReason } from "@/lib/video-failures";
import { buildImageUrl } from "@/lib/url-utils";

type ToolType = "Text to Image" | "Image to Image" | "Image to Video";
type Kind = "image" | "video";

type Props = {
  tool: ToolType;
  model: string;
  createdAt?: Date | string;
  statusText: string; // already normalized: pending | in progress | ready | failed | ...
  failureReason?: string | null;
  prompt: string;
  kind: Kind;
  // For image
  imageThumbs?: string[]; // absolute URLs; when empty and not failed => show generating placeholder
  desiredImageCount?: number; // optional desired number of image boxes (e.g., TTI outputCount), capped to 4
  // For video
  videoAspect?: "16:9" | "9:16";
  // Common
  onOpen?: () => void;
  renderActions?: () => React.ReactNode;
};

export default function CurrentTaskCard({
  tool,
  model,
  createdAt,
  statusText,
  failureReason,
  prompt,
  kind,
  imageThumbs,
  desiredImageCount,
  videoAspect = "16:9",
  onOpen,
  renderActions,
}: Props) {
  const isFailed = String(statusText || "").toLowerCase() === "failed";
  const formattedReason = formatVideoFailReason(failureReason);
  const dt = createdAt ? new Date(createdAt) : new Date();
  const ts = dt.toLocaleString();

  const tileSize = "w-[160px] h-[160px] sm:w-[192px] sm:h-[192px] md:w-[224px] md:h-[224px] lg:w-[256px] lg:h-[256px] xl:w-[290px] xl:h-[290px]";
  const videoSize = videoAspect === "9:16" ? "w-[162px] h-[290px]" : "w-[290px] h-[162px]";

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0f172a] p-4">
      <div className="flex items-center gap-3 text-sm mb-3">
        <div className="font-semibold text-white">Girl Generator</div>
        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80">{tool}</span>
        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/80">{model}</span>
        <span className="text-white/50">{ts}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70 flex items-center gap-2">
          {statusText}
          {isFailed && (
            <Tooltip content={formattedReason} placement="top" closeDelay={50}>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 text-red-400" aria-label="Failed">!</span>
            </Tooltip>
          )}
        </span>
      </div>
      <div className="text-white/90 text-sm mb-3 line-clamp-2">{prompt || "—"}</div>
      <div className="flex gap-2 flex-wrap">
        {kind === "video" ? (
          <div className={`relative ${videoSize} rounded-lg overflow-hidden border border-gray-700 bg-[#111827] flex-shrink-0 ${onOpen ? 'cursor-pointer' : ''}`} onClick={() => onOpen?.()}>
            {isFailed ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                <span className="text-red-400 font-semibold text-sm">Generation failed!</span>
                <span className="text-xs text-red-300 leading-snug">{formattedReason}</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-sm gap-2">
                <SparklesIcon className="w-4 h-4 animate-spin"/> Generating…
              </div>
            )}
          </div>
        ) : (
          (() => {
            const thumbs = Array.isArray(imageThumbs) ? imageThumbs.filter(Boolean) : [];
            const d = Number(desiredImageCount);
            const desired = (Number.isFinite(d) && d > 0) ? Math.min(Math.max(1, d), 4) : (thumbs.length || 1);
            const count = desired;
            const boxes = Array.from({ length: count });
            return boxes.map((_, i) => {
              const src = thumbs[i];
              return (
                <div key={i} className={`relative ${tileSize} rounded-lg overflow-hidden border border-gray-700 bg-[#111827] flex-shrink-0 ${onOpen ? 'cursor-pointer' : ''}`} onClick={() => onOpen?.()}>
                  {isFailed ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                      <span className="text-red-400 font-semibold text-sm">Generation failed!</span>
                      <span className="text-xs text-red-300 leading-snug">{formattedReason}</span>
                    </div>
                  ) : src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={buildImageUrl({ base: String(src), preview: true, width: 290, fmt: 'webp', quality: 75 })} className="w-full h-full object-cover" alt={`variant ${i+1}`} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/70 text-sm gap-2">
                      <SparklesIcon className="w-4 h-4 animate-spin"/> Generating…
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
        <div className="flex-1 flex items-end justify-end gap-2">
          {renderActions?.()}
        </div>
      </div>
    </div>
  );
}
