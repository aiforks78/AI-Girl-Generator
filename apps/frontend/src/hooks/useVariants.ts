import { useMemo, useState, useCallback } from 'react';
import type { Job, ProcessedVariants } from '@/types/generation';
import { isValidMediaUrl, buildImageUrl } from '@/lib/url-utils';

export function useVariants(job: Job | null) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const variants = useMemo((): ProcessedVariants => {
    if (!job) {
      return { urls: [], selectedIndex: 0, externalSources: [], rawMap: {} };
    }

    const canonicalMediaKey = (value: string): string => {
      if (!value) return '';
      try {
        const isAbsolute = /^https?:\/\//i.test(value);
        const parsed = isAbsolute ? new URL(value) : new URL(value, 'https://placeholder.local');
        const keyParam = parsed.searchParams.get('key');
        if (keyParam) {
          try { return decodeURIComponent(keyParam); } catch { return keyParam; }
        }
        const pathname = parsed.pathname || '';
        const normalizedPath = (() => {
          if (pathname.includes('/img/')) {
            return pathname.slice(pathname.indexOf('/img/'));
          }
          if (pathname.includes('/public/')) {
            return pathname.slice(pathname.indexOf('/public/'));
          }
          return pathname;
        })();
        const hostPart = isAbsolute ? (parsed.host || '').toLowerCase() : '';
        const combined = `${hostPart}${normalizedPath}`.toLowerCase();
        return combined.replace(/\/+$/, '');
      } catch {
        const base = value.split('?')[0] || value;
        if (base.includes('/img/')) {
          return base.slice(base.indexOf('/img/')).toLowerCase().replace(/\/+$/, '');
        }
        if (base.includes('/public/')) {
          return base.slice(base.indexOf('/public/')).toLowerCase().replace(/\/+$/, '');
        }
        return base.toLowerCase().replace(/\/+$/, '');
      }
    };

    const dedupeByCanonical = (values: string[]): string[] => {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const raw of values) {
        if (typeof raw !== 'string' || !raw) continue;
        const key = canonicalMediaKey(raw);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(raw);
      }
      return out;
    };

    // Get image variants array (merge standard + img2img/hd)
    const std = Array.isArray(job.image_variants) ? job.image_variants : [];
    const i2i = Array.isArray((job as any).img2img_variants) ? (job as any).img2img_variants as string[] : [];
    const candidateVariants = dedupeByCanonical([...std, ...i2i]);

    const mainImage = typeof job.image_url === 'string' ? job.image_url : null;
    const generatedCandidates = dedupeByCanonical([
      ...(mainImage ? [mainImage] : []),
      ...candidateVariants
    ]);

    const rawOutputCount = Number((job as any)?.output_count);
    const hasValidOutputCount = Number.isFinite(rawOutputCount) && rawOutputCount > 0;
    const isImg2Img = String(job.action || '').toLowerCase() === 'img2img';
    const allowedVariantCount = isImg2Img
      ? 1
      : hasValidOutputCount
        ? Math.min(rawOutputCount, generatedCandidates.length)
        : generatedCandidates.length;

    let generatedUrls = generatedCandidates.slice(0, Math.max(1, allowedVariantCount));
    if (!generatedUrls.length && mainImage) {
      generatedUrls = [mainImage];
    }
    
    // Get external sources (for img2img originals)
    const externalSourcesRaw: string[] = [];
    if (job.related?.external_sources && Array.isArray(job.related.external_sources)) {
      externalSourcesRaw.push(...job.related.external_sources.filter(isValidMediaUrl));
    }

    // Build combined list: variants first, then externals (avoiding duplicates)
    const urls: string[] = [];
    const urlSet = new Set<string>();
    const rawMap: Record<string, string> = {};

    for (const url of generatedUrls) {
      if (typeof url !== 'string' || !url) continue;
      const key = canonicalMediaKey(url);
      if (urlSet.has(key)) continue;
      urlSet.add(key);
      urls.push(url);
      rawMap[url] = url;
    }

    const externalDisplayUrls: string[] = [];
    for (const url of externalSourcesRaw) {
      const display = buildImageUrl({ base: url, preview: true, width: 512, fmt: 'webp', quality: 85, watermark: true });
      const key = canonicalMediaKey(display);
      if (!urlSet.has(key)) {
        urls.push(display);
        urlSet.add(key);
      }
      rawMap[display] = url;
      externalDisplayUrls.push(display);
    }

    // Filter and validate URLs (support both images and videos)
    const validUrls = urls.filter(isValidMediaUrl);

    return {
      urls: validUrls,
      selectedIndex: Math.min(selectedIndex, Math.max(0, validUrls.length - 1)),
      externalSources: externalDisplayUrls,
      rawMap
    };
  }, [job, selectedIndex]);

  // Reset selection when job changes
  const resetSelection = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  // Navigate with bounds checking
  const navigateVariant = useCallback((direction: 'prev' | 'next') => {
    setSelectedIndex(current => {
      const maxIndex = variants.urls.length - 1;
      if (direction === 'prev') {
        return current > 0 ? current - 1 : maxIndex;
      } else {
        return current < maxIndex ? current + 1 : 0;
      }
    });
  }, [variants.urls.length]);

  const selectVariant = useCallback((index: number) => {
    setSelectedIndex(Math.max(0, Math.min(index, variants.urls.length - 1)));
  }, [variants.urls.length]);

  return {
    variants: variants.urls,
    selectedIndex: variants.selectedIndex,
    externalSources: variants.externalSources,
    rawMap: variants.rawMap,
    setSelectedIndex: selectVariant,
    navigateVariant,
    resetSelection,
    hasMultiple: variants.urls.length > 1,
    currentUrl: variants.urls[variants.selectedIndex] || '',
    isExternalSource: (url: string) => variants.externalSources.includes(url)
  };
}
