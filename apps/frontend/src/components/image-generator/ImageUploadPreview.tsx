"use client";

import React from 'react';
import { XMarkIcon, ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { UploadItem } from '@/hooks/useImageUpload';

interface ImageUploadPreviewProps {
  uploadItems: UploadItem[];
  onRetry: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  maxFiles?: number;
  onAddFiles?: (files: File[]) => void;
  compact?: boolean;
}

export default function ImageUploadPreview({ 
  uploadItems = [], 
  onRetry, 
  onRemove, 
  maxFiles = 4,
  onAddFiles,
  compact = false,
}: ImageUploadPreviewProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleAddClick = () => {
    if (!onAddFiles) return;
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onAddFiles) onAddFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={compact ? '' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">
            Selected Images ({uploadItems.filter(i => i.status === 'success').length}/{maxFiles})
          </span>
          {uploadItems.length > 1 && (
            <button
              onClick={() => uploadItems.forEach(item => onRemove(item.id))}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      <div className={`grid gap-3 ${compact ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {uploadItems.map((item) => (
          <div key={item.id} className="relative group">
            <div className={`aspect-square rounded-xl overflow-hidden border bg-gray-800 ${compact ? 'border-gray-700' : 'border-gray-700'}`}>
              {/* Image Preview */}
              <div className="relative w-full h-full">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // File preview using FileReader
                  <FilePreview file={item.file} />
                )}
                
                {/* Status Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {item.status === 'uploading' && (
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 flex flex-col items-center gap-2">
                      <div className="relative w-6 h-6">
                        <svg className="w-6 h-6 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle 
                            className="opacity-25" 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                          />
                          <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-medium text-white">
                            {item.progress}%
                          </span>
                        </div>
                      </div>
                      {!compact && (
                        <span className="text-[10px] text-white/90 font-medium">Uploading...</span>
                      )}
                    </div>
                  )}
                  
                  {/* Success checkmark overlay removed as per design */}
                  
                  {item.status === 'error' && (
                    <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 text-center">
                      <ExclamationTriangleIcon className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-xs text-red-300 mb-2 max-w-20 break-words leading-tight">
                        {item.error || 'Upload failed'}
                      </p>
                      {item.retryCount < 3 && (
                        <button
                          onClick={() => onRetry(item.id)}
                          className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors flex items-center gap-1 mx-auto"
                        >
                          <ArrowPathIcon className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                {item.status === 'uploading' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/80">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Remove Button */}
            <button
              onClick={() => onRemove(item.id)}
              className={`absolute -top-2 -right-2 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg ${compact ? 'w-5 h-5 bg-red-500 hover:bg-red-600 border border-red-400' : 'w-6 h-6 bg-red-500 hover:bg-red-600 border border-red-400'}`}
              title="Remove image"
            >
              <XMarkIcon className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-white`} />
            </button>
            
            {/* File Info */}
            {!compact && (
              <div className="mt-2 px-1">
                <p className="text-xs text-gray-400 truncate" title={item.file.name}>
                  {item.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(item.file.size / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
            )}
          </div>
        ))}
        
        {/* Add Tile (first empty slot) */}
        {onAddFiles && uploadItems.length < maxFiles && (
          <button
            type="button"
            onClick={handleAddClick}
            className={`group aspect-square rounded-xl border border-dashed flex items-center justify-center text-gray-400 hover:text-purple-300 transition-all duration-200 ${compact ? 'border-gray-600 hover:border-purple-400 hover:bg-purple-500/5' : 'border-gray-700 bg-gray-800/30 hover:bg-gray-800/60 hover:border-purple-500'}`}
            title="Click to add images or drag & drop"
          >
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center border border-gray-500 group-hover:border-purple-400 transition-colors">
                <span className="text-lg leading-none text-gray-500 group-hover:text-purple-400 transition-colors">+</span>
              </div>
              <p className={`text-xs font-medium ${compact ? '' : 'text-gray-400 group-hover:text-purple-300'}`}>Add Image</p>
              {!compact && (
                <p className="text-[10px] text-gray-500 mt-0.5">or drag & drop</p>
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

// Component to preview file before upload
function FilePreview({ file }: { file: File }) {
  const [preview, setPreview] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    return () => {
      // FileReader data URLs don't need to be revoked like object URLs
      setPreview(null);
    };
  }, [file]);
  
  if (!preview) {
    return (
      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 mx-auto mb-2 bg-gray-600 rounded animate-pulse"></div>
          <p className="text-xs">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={preview}
      alt={file.name}
      className="w-full h-full object-cover"
    />
  );
}
