import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export interface UploadItem {
  id: string;
  file: File;
  url?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  retryCount: number;
}

export interface UseImageUploadOptions {
  maxFiles?: number;
  maxSize?: number; // bytes
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string, file: File) => void;
  onAuthRequired?: () => void;
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 1000; // ms

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    maxFiles = 4,
    maxSize = 20 * 1024 * 1024, // 20MB
    onUploadComplete,
    onUploadError,
    onAuthRequired
  } = options;

  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const uploadAbortControllers = useRef<Map<string, AbortController>>(new Map());

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!file || typeof file.type !== 'string' || !file.type.toLowerCase().startsWith('image/')) {
      return 'Only image files are allowed';
    }
    if (typeof file.size === 'number' && file.size > maxSize) {
      return `Image too large: ${(file.size/1024/1024).toFixed(1)}MB (max ${(maxSize/1024/1024).toFixed(0)}MB)`;
    }
    return null;
  }, [maxSize]);

  // Upload single file with progress
  const uploadFile = useCallback(async (item: UploadItem): Promise<string> => {
    const controller = new AbortController();
    uploadAbortControllers.current.set(item.id, controller);

    try {
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i
      ));

      const signResponse = await apiFetch('/r2/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: item.file.name || 'upload.bin',
          fileType: item.file.type || 'application/octet-stream'
        }),
        cache: 'no-store'
      });

      if (signResponse.status === 401) {
        throw new Error('AUTH_REQUIRED');
      }

      if (!signResponse.ok) {
        let errorMessage = 'Failed to prepare upload';
        try {
          const errorJson = await signResponse.json();
          errorMessage = String(errorJson?.error || errorMessage);
        } catch {
          try {
            errorMessage = await signResponse.text();
          } catch {}
        }
        throw new Error(errorMessage || `Failed to prepare upload (${signResponse.status})`);
      }

      let signature: {
        uploadUrl?: string;
        uploadMethod?: string;
        headers?: Record<string, string>;
        publicUrl?: string;
      };

      try {
        signature = await signResponse.json();
      } catch {
        throw new Error('Invalid upload signature response');
      }

      const uploadUrl = signature?.uploadUrl;
      const publicUrl = signature?.publicUrl;
      const uploadMethod = (signature?.uploadMethod || 'PUT').toUpperCase();
      const uploadHeaders = signature?.headers || {};

      if (!uploadUrl || !publicUrl) {
        throw new Error('Upload signature missing required fields');
      }

      // Create a promise that tracks upload progress
      const uploadPromise = new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadItems(prev => prev.map(i => 
              i.id === item.id ? { ...i, progress } : i
            ));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(publicUrl);
          } else if (xhr.status === 401 || xhr.status === 403) {
            reject(new Error('AUTH_REQUIRED'));
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Upload failed with status ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });

        // Set up abort handling
        controller.signal.addEventListener('abort', () => {
          xhr.abort();
        });

        xhr.open(uploadMethod, uploadUrl, true);

        // Do not set any headers for presigned URL uploads
        // The signature only includes 'host' which is automatically set by the browser

        xhr.send(item.file);
      });

      const url = await uploadPromise;
      
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'success', url, progress: 100 } : i
      ));

      onUploadComplete?.(url);
      return url;

    } catch (error: any) {
      const errorMessage = error.message || 'Upload failed';
      
      setUploadItems(prev => prev.map(i => 
        i.id === item.id ? { 
          ...i, 
          status: 'error', 
          error: errorMessage,
          retryCount: i.retryCount + 1
        } : i
      ));

      if (errorMessage === 'AUTH_REQUIRED') {
        onAuthRequired?.();
      } else {
        onUploadError?.(errorMessage, item.file);
      }

      throw error;
    } finally {
      uploadAbortControllers.current.delete(item.id);
    }
  }, [onUploadComplete, onUploadError, onAuthRequired]);

  // Add files to upload queue
  const addFiles = useCallback((files: File[]) => {
    const remainingSlots = maxFiles - uploadItems.filter(item => item.status === 'success').length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newItems: UploadItem[] = [];
    
    for (const file of filesToAdd) {
      const error = validateFile(file);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      newItems.push({
        id,
        file,
        status: 'pending',
        progress: 0,
        retryCount: 0
      });
    }

    if (newItems.length > 0) {
      setUploadItems(prev => [...prev, ...newItems]);
      
      // Start uploading immediately
      newItems.forEach(item => {
        uploadFile(item).catch(() => {
          // Error already handled in uploadFile
        });
      });
    }

    if (filesToAdd.length < files.length) {
      toast.warning(`Only added ${filesToAdd.length} files (max ${maxFiles})`);
    }
  }, [maxFiles, uploadItems, validateFile, uploadFile]);

  // Retry failed upload
  const retryUpload = useCallback((itemId: string) => {
    const item = uploadItems.find(i => i.id === itemId);
    if (!item || item.status !== 'error' || item.retryCount >= MAX_RETRY_COUNT) {
      return;
    }

    setTimeout(() => {
      uploadFile(item).catch(() => {
        // Error already handled in uploadFile
      });
    }, RETRY_DELAY);
  }, [uploadItems, uploadFile]);

  // Remove item from list
  const removeItem = useCallback((itemId: string) => {
    // Cancel upload if in progress
    const controller = uploadAbortControllers.current.get(itemId);
    if (controller) {
      controller.abort();
      uploadAbortControllers.current.delete(itemId);
    }

    setUploadItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  // Clear all items
  const clearAll = useCallback(() => {
    // Cancel all ongoing uploads
    uploadAbortControllers.current.forEach(controller => {
      controller.abort();
    });
    uploadAbortControllers.current.clear();
    
    setUploadItems([]);
  }, []);

  // Get successful URLs
  const getSuccessfulUrls = useCallback(() => {
    return uploadItems
      .filter(item => item.status === 'success' && item.url)
      .map(item => item.url!);
  }, [uploadItems]);

  // Check if has space for more files
  const hasSpace = uploadItems.filter(item => item.status === 'success').length < maxFiles;
  
  // Upload statistics
  const stats = {
    total: uploadItems.length,
    pending: uploadItems.filter(i => i.status === 'pending').length,
    uploading: uploadItems.filter(i => i.status === 'uploading').length,
    success: uploadItems.filter(i => i.status === 'success').length,
    error: uploadItems.filter(i => i.status === 'error').length,
    hasSpace,
    isUploading: uploadItems.some(i => i.status === 'uploading'),
  };

  return {
    uploadItems,
    stats,
    addFiles,
    retryUpload,
    removeItem,
    clearAll,
    getSuccessfulUrls,
  };
}
