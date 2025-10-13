import { useState, useCallback, useRef, useEffect } from 'react';

export interface ImageLoadState {
  src: string;
  loading: boolean;
  error: boolean;
  retryCount: number;
}

export interface UseImageLoaderOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (src: string, error: Event, retryCount: number) => void;
  fallbackSrc?: string;
}

export function useImageLoader(
  initialSrc: string,
  options: UseImageLoaderOptions = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    fallbackSrc
  } = options;

  const [state, setState] = useState<ImageLoadState>({
    src: initialSrc,
    loading: Boolean(initialSrc),
    error: false,
    retryCount: 0
  });

  const retryTimeoutRef = useRef<number | null>(null);
  const currentSrcRef = useRef(initialSrc);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Reset state when src changes
  useEffect(() => {
    if (currentSrcRef.current !== initialSrc) {
      currentSrcRef.current = initialSrc;
      setState({
        src: initialSrc,
        loading: Boolean(initialSrc),
        error: false,
        retryCount: 0
      });
      
      // Clear any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }
  }, [initialSrc]);

  const handleLoad = useCallback(() => {
    setState(prev => ({
      ...prev,
      loading: false,
      error: false
    }));
  }, []);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setState(prev => {
      const newRetryCount = prev.retryCount + 1;
      
      // Log error for tracking
      console.error(`Image load failed: ${prev.src} (attempt ${newRetryCount}/${maxRetries + 1})`);
      
      // Call external error handler
      onError?.(prev.src, event.nativeEvent, newRetryCount);

      // Check if we should retry or use fallback
      if (newRetryCount <= maxRetries) {
        // Schedule retry with exponential backoff
        const delay = retryDelay * Math.pow(2, newRetryCount - 1);
        retryTimeoutRef.current = window.setTimeout(() => {
          setState(current => ({
            ...current,
            loading: true,
            error: false,
            src: `${current.src}${current.src.includes('?') ? '&' : '?'}_retry=${newRetryCount}&_t=${Date.now()}`
          }));
        }, delay);

        return {
          ...prev,
          loading: false,
          error: true,
          retryCount: newRetryCount
        };
      } else if (fallbackSrc && prev.src !== fallbackSrc) {
        // Use fallback image
        return {
          src: fallbackSrc,
          loading: true,
          error: false,
          retryCount: newRetryCount
        };
      } else {
        // Final failure
        return {
          ...prev,
          loading: false,
          error: true,
          retryCount: newRetryCount
        };
      }
    });
  }, [maxRetries, retryDelay, onError, fallbackSrc]);

  const retry = useCallback(() => {
    if (state.error && state.retryCount < maxRetries) {
      setState(prev => ({
        ...prev,
        loading: true,
        error: false,
        retryCount: prev.retryCount + 1,
        src: `${initialSrc}${initialSrc.includes('?') ? '&' : '?'}_retry=${prev.retryCount + 1}&_t=${Date.now()}`
      }));
    }
  }, [state.error, state.retryCount, maxRetries, initialSrc]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setState({
      src: initialSrc,
      loading: Boolean(initialSrc),
      error: false,
      retryCount: 0
    });
  }, [initialSrc]);

  return {
    ...state,
    handleLoad,
    handleError,
    retry,
    reset,
    canRetry: state.error && state.retryCount < maxRetries,
    isMaxRetries: state.retryCount >= maxRetries
  };
}