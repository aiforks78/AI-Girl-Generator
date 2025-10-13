"use client";

import React from "react";
import type { UploadItem } from "@/hooks/useImageUpload";
import { TrashIcon, PhotoIcon } from "@heroicons/react/24/outline";

type Props = {
  uploadItems: UploadItem[];
  onAddFiles: (files: File[]) => void; // should replace existing when provided from caller
  onRemove: (itemId: string) => void;
  clearAll: () => void;
};

export default function SingleImageUpload({ uploadItems, onAddFiles, onRemove, clearAll }: Props) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const item = uploadItems[0];

  const openPicker = () => fileInputRef.current?.click();

  const handleFiles = (files: File[]) => {
    if (!files || files.length === 0) return;
    // Replace the existing image unconditionally
    if (uploadItems.length > 0) clearAll();
    onAddFiles([files[0]]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) handleFiles(files);
  };

  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  const status = item?.status;

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(Array.from(e.target.files || []))}
      />

      <div
        className="group relative w-full rounded-2xl border border-white/10 bg-[#1a1f2e] hover:border-white/20 transition-colors cursor-pointer"
        style={{ height: 162 }}
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {/* Empty state */}
        {!item && (
          <div className="flex h-full items-center justify-center text-white/70">
            <div className="flex flex-col items-center gap-3">
              <PhotoIcon className="w-8 h-8 text-white/50" />
              <div className="text-sm">Click to upload an image</div>
            </div>
          </div>
        )}

        {/* With item */}
        {item && (
          <div className="relative h-[162px]">
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.file.name} className="w-full h-full object-contain rounded-2xl" />
            ) : (
              <FilePreview file={item.file} />
            )}

            {/* Progress bar when uploading */}
            {status === "uploading" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                <div className="h-full bg-purple-600 transition-all" style={{ width: `${item.progress}%` }} />
              </div>
            )}

            {/* Hover overlay + centered remove button */}
            <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/60 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-none">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                aria-label="Remove image"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Error state overlay */}
            {status === "error" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/70 rounded-lg p-3 text-center text-red-300 text-xs">
                  {item.error || "Upload failed"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    return () => { /* no revoke needed for FileReader data URLs */ };
  }, [file]);
  return (
    <img src={preview || ""} alt={file.name} className="w-full h-full object-contain rounded-2xl" />
  );
}
