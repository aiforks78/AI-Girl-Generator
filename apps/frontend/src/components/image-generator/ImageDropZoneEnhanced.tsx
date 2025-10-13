"use client";

import React, { useState, useRef, useCallback } from 'react';
import { PhotoIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface ImageDropZoneEnhancedProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  currentCount?: number;
  maxSizeBytes?: number;
  compact?: boolean;
  disabled?: boolean;
  acceptedTypes?: string[];
}

export default function ImageDropZoneEnhanced({
  onFilesSelected,
  maxFiles = 4,
  currentCount = 0,
  maxSizeBytes = 20 * 1024 * 1024,
  compact = false,
  disabled = false,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
}: ImageDropZoneEnhancedProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const hasSpace = currentCount < maxFiles;
  const remainingSlots = maxFiles - currentCount;

  const validateFiles = useCallback((files: FileList | File[]): File[] => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        console.warn(`Skipping file "${file.name}": unsupported type ${file.type}`);
        continue;
      }

      // Check file size
      if (file.size > maxSizeBytes) {
        console.warn(`Skipping file "${file.name}": too large (${(file.size / 1024 / 1024).toFixed(1)}MB > ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB)`);
        continue;
      }

      validFiles.push(file);
    }

    // Respect max files limit
    return validFiles.slice(0, remainingSlots);
  }, [acceptedTypes, maxSizeBytes, remainingSlots]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || !hasSpace) return;
    
    setDragCounter(prev => prev + 1);
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [disabled, hasSpace, isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    setDragCounter(0);
    
    if (disabled || !hasSpace) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  }, [disabled, hasSpace, onFilesSelected, validateFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && hasSpace && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getDropZoneClasses = () => {
    const baseClasses = `
      relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
      flex items-center justify-center text-center
    `;
    
    const sizeClasses = compact 
      ? 'p-4 min-h-[120px]' 
      : 'p-8 min-h-[200px]';
    
    const stateClasses = (() => {
      if (disabled) {
        return 'border-gray-700 bg-gray-800/20 text-gray-500 cursor-not-allowed';
      }
      
      if (!hasSpace) {
        return 'border-gray-600 bg-gray-800/30 text-gray-400 cursor-not-allowed';
      }
      
      if (isDragging) {
        return 'border-purple-400 bg-purple-500/10 text-purple-300 shadow-lg shadow-purple-500/20';
      }
      
      return 'border-gray-600 bg-gray-800/20 text-gray-400 hover:border-purple-500 hover:bg-gray-800/40 hover:text-purple-300';
    })();
    
    return `${baseClasses} ${sizeClasses} ${stateClasses}`.trim();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || !hasSpace}
      />
      
      <div
        ref={dropZoneRef}
        className={getDropZoneClasses()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled || !hasSpace ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Upload images. ${remainingSlots} slots remaining.`}
      >
        <div className="text-center">
          {isDragging ? (
            <>
              <ArrowUpTrayIcon className="w-12 h-12 mx-auto mb-3 text-purple-400" />
              <p className="text-lg font-medium text-purple-300 mb-2">
                Drop images here
              </p>
              <p className="text-sm text-purple-400">
                {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} available
              </p>
            </>
          ) : (
            <>
              <PhotoIcon className={`mx-auto mb-3 ${compact ? 'w-8 h-8' : 'w-12 h-12'} ${!hasSpace ? 'text-gray-500' : 'text-gray-400'}`} />
              
              {!hasSpace ? (
                <p className="text-sm font-medium text-gray-500">
                  Maximum {maxFiles} images reached
                </p>
              ) : disabled ? (
                <p className="text-sm font-medium text-gray-500">
                  Upload disabled
                </p>
              ) : (
                <>
                  <p className={`font-medium mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
                    Click to upload or drag and drop
                  </p>
                  <p className={`text-gray-500 mb-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                    JPG, PNG, WebP, GIF up to {(maxSizeBytes / 1024 / 1024).toFixed(0)}MB
                  </p>
                  <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                    {remainingSlots} of {maxFiles} slots available
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}