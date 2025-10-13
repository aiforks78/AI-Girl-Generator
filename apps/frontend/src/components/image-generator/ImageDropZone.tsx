"use client";

import React, { useState, useRef, useCallback } from 'react';
import { CloudArrowUpIcon, PhotoIcon, PlusIcon } from '@heroicons/react/24/outline';

interface ImageDropZoneProps {
  onFilesAdded: (files: File[]) => void;
  hasSpace: boolean;
  maxFiles: number;
  currentCount: number;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
  label?: string;
}

export default function ImageDropZone({
  onFilesAdded,
  hasSpace,
  maxFiles,
  currentCount,
  disabled = false,
  className = "",
  variant = 'default',
  label = 'Click to upload an image'
}: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current += 1;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current -= 1;
    
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragActive) {
      setIsDragActive(true);
    }
  }, [isDragActive]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setIsDragActive(false);
    dragCounterRef.current = 0;
    
    if (disabled || !hasSpace) return;
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      onFilesAdded(files);
    }
  }, [disabled, hasSpace, onFilesAdded]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesAdded(files);
    }
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesAdded]);

  const handleClick = useCallback(() => {
    if (!disabled && hasSpace && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled, hasSpace]);

  const getZoneContent = () => {
    if (!hasSpace) {
      return (
        <div className="text-center text-gray-500">
          <PhotoIcon className="w-10 h-10 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium">Maximum files reached</p>
          <p className="text-xs mt-1">{currentCount}/{maxFiles} images selected</p>
        </div>
      );
    }
    
    if (isDragOver) {
      return (
        <div className="text-center text-purple-400">
          <div className="w-12 h-12 mx-auto mb-3 border-2 border-dashed border-purple-400/80 rounded-full flex items-center justify-center">
            <CloudArrowUpIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium">Drop images here</p>
          <p className="text-xs mt-1">Release to upload</p>
        </div>
      );
    }
    
    if (variant === 'compact') {
      return (
        <div className="text-center text-gray-300">
          <div className="relative w-10 h-10 mx-auto mb-2 text-gray-400">
            <PhotoIcon className="w-10 h-10 mx-auto" />
            <PlusIcon className="w-4 h-4 absolute -right-1 -bottom-1 bg-gray-800 rounded-full text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-[11px] mt-1 text-gray-500">{currentCount}/{maxFiles} images • Max 20MB</p>
        </div>
      );
    }

    return (
      <div className="text-center text-gray-400">
        <div className="w-16 h-16 mx-auto mb-4 border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center group-hover:border-purple-500 transition-colors">
          <PlusIcon className="w-8 h-8 group-hover:text-purple-500 transition-colors" />
        </div>
        <p className="text-lg font-medium text-white group-hover:text-purple-400 transition-colors">Add Images</p>
        <p className="text-sm mt-1">Drop images here or click to browse</p>
        <p className="text-xs mt-2 text-gray-500">{currentCount}/{maxFiles} images • Max 20MB each</p>
      </div>
    );
  };

  const isActive = isDragOver || isDragActive;
  const canInteract = !disabled && hasSpace;

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled || !hasSpace}
      />
      
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative rounded-xl transition-all duration-200 flex items-center justify-center group
          ${variant === 'compact' ? 'min-h-[140px] p-6 border bg-gray-800/70 border-gray-700' : 'min-h-[200px] p-8 border-2 border-dashed'}
          ${canInteract ? 'cursor-pointer' : 'cursor-not-allowed'}
          ${isActive && canInteract
            ? (variant === 'compact' ? 'border-purple-500 bg-purple-500/10' : 'border-purple-400 bg-purple-500/10 scale-[1.02]')
            : hasSpace
              ? (variant === 'compact' ? 'hover:border-gray-600 hover:bg-gray-800/80' : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/5')
              : 'border-gray-700 bg-gray-800/50'
          }
          ${disabled ? 'opacity-50' : ''}
        `}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23ffffff' fill-opacity='1'%3e%3ccircle cx='7' cy='7' r='1'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
            backgroundSize: '20px 20px'
          }} />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {getZoneContent()}
        </div>
        
        {/* Active Indicator */}
        {isActive && canInteract && (
          <div className={`absolute inset-0 rounded-xl ${variant==='compact' ? 'bg-purple-500/15 border border-purple-400' : 'bg-purple-500/20 border-2 border-purple-400'} animate-pulse`} />
        )}
      </div>
      
      {/* Upload Tips */}
      {canInteract && (
        <div className="mt-2 text-center">
          <p className="text-[11px] text-gray-500">Supported: JPG, PNG, GIF, WebP • Up to 20MB</p>
        </div>
      )}
    </div>
  );
}
