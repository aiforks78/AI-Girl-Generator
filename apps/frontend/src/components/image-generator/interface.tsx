"use client";

import React, { useState, useEffect, useRef } from "react";
import { getRandomSeed } from "@/data/prompt_seeds";
import { CREDIT_COSTS, FEATURE_COSTS } from "@/lib/credit-config";
import { MODEL_IDS } from "@shared/model-ids";
import { ChevronDownIcon, SparklesIcon, XMarkIcon, CheckCircleIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/providers/auth-provider";
import { useAppContext } from "@/contexts/app";
import { useRouter } from "next/navigation";
// Unified viewer via context
import { useViewer } from "@/contexts/viewer-store";
import HistoryList from "@/components/content/history-list";
import CurrentTaskCard from "@/components/content/current-task-card";
import { toast } from "sonner";
import { useProStatus } from "@/hooks/useProStatus";
import { buildImageUrl, resolvePublicAssetUrl } from "@/lib/url-utils";
import { apiFetch } from "@/lib/api-client";
import { getTxt2ImgDimensions, type AspectRatio } from "@/lib/generation-config";
import { modelLabel as formatModelLabel } from "@/lib/labels";
 

const FALLBACK_SAMPLE_IMAGE_KEYS = [
  "public/Sample/FLux_pro.png",
  "public/Sample/FLux_max.png"
];

// Build CDN URLs directly for sample images to enable browser caching
const buildSampleImageUrl = (key: string): string => {
  const cdnBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (cdnBase) {
    // Direct CDN URL with query params for format conversion
    const cleanKey = key.replace(/^\/+/, '');
    return `${cdnBase}/${cleanKey}?fmt=webp&w=768&q=95`;
  }
  // Fallback to API route if CDN not configured
  return buildImageUrl({ base: resolvePublicAssetUrl(key), preview: true, width: 768, fmt: 'webp', quality: 95, watermark: false });
};

type MiniHistoryItem = {
  id: number;
  image_url: string | null;
  prompt: string;
  created_at: string;
  status: string;
  character_id?: string | null;
};

const ideaSuggestions = [
  "Frosted Pane",
  "Seaside Stillness", 
  "Mountain Dog",
  "Evening's Urban Rush"
];

const aspectRatios: { label: string; value: AspectRatio }[] = [
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "3:2", value: "3:2" },
  { label: "2:3", value: "2:3" },
  { label: "3:4", value: "3:4" },
  { label: "4:3", value: "4:3" },
  { label: "9:16", value: "9:16" },
];

type ModelEngine = 'inline' | 'replicate';

const MODEL_OPTION_BADGE_STYLES: Record<string, { background: string; text: string }> = {
  green: { background: 'bg-green-500/20', text: 'text-green-300' },
  blue: { background: 'bg-blue-500/20', text: 'text-blue-300' }
};

const MODEL_OPTIONS: Array<{
  engine: ModelEngine;
  id: string;
  badge?: { text: string; tone: keyof typeof MODEL_OPTION_BADGE_STYLES };
  description: string;
  duration: string;
}> = [
  {
    engine: 'inline',
    id: MODEL_IDS.INLINE_TXT2IMG,
    badge: { text: 'Recommended', tone: 'green' },
    description: 'Fast and creative text-to-image generation.',
    duration: '~30 sec'
  },
  {
    engine: 'replicate',
    id: MODEL_IDS.PRIMARY_TXT2IMG,
    badge: { text: 'Alt', tone: 'blue' },
    description: 'Low-latency primary model tuned for previews.',
    duration: '~10 sec'
  },
  {
    engine: 'replicate',
    id: MODEL_IDS.PREMIUM_TXT2IMG,
    description: 'Balanced quality and speed for production use.',
    duration: '~60 sec'
  },
  {
    engine: 'replicate',
    id: MODEL_IDS.MAX_TXT2IMG,
    description: 'Maximum detail at the cost of longer runtimes.',
    duration: '~120 sec'
  }
];

const extractCharacterId = (value: unknown): string | null | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (value === null) {
    return null;
  }
  return undefined;
};

export default function ImageGeneratorInterface() {
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState<'replicate' | 'inline'>('inline');
  const [modelId, setModelId] = useState<string>(MODEL_IDS.INLINE_TXT2IMG);

  // Handle URL parameters for model selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modelParam = params.get('model');

      if (modelParam) {
        const normalizedParam = modelParam.toLowerCase().replace(/\s+/g, '-');
        switch (normalizedParam) {
          case MODEL_IDS.PREMIUM_TXT2IMG:
          case 'flux-kontext-pro':
            setEngine('replicate');
            setModelId(MODEL_IDS.PREMIUM_TXT2IMG);
            break;
          case MODEL_IDS.MAX_TXT2IMG:
          case 'flux-kontext-max':
            setEngine('replicate');
            setModelId(MODEL_IDS.MAX_TXT2IMG);
            break;
          case MODEL_IDS.PRIMARY_TXT2IMG:
          case 'flux-schnell':
            setEngine('replicate');
            setModelId(MODEL_IDS.PRIMARY_TXT2IMG);
            break;
          case MODEL_IDS.ALT_INLINE_TXT2IMG:
          case 'gemini-2.5-flash-image-hd':
            setEngine('inline');
            setModelId(MODEL_IDS.ALT_INLINE_TXT2IMG);
            break;
          case MODEL_IDS.INLINE_TXT2IMG:
          case 'banana':
          case 'nano-banana':
            setEngine('inline');
            setModelId(MODEL_IDS.INLINE_TXT2IMG);
            break;
          case MODEL_IDS.IMG2IMG:
          case 'seedream4.0':
            setEngine('replicate');
            setModelId(MODEL_IDS.IMG2IMG);
            break;
          default:
            break;
        }
      }
    }
  }, []);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("1:1");
  const [outputCount, setOutputCount] = useState(1);

  // Auto-reset outputCount when switching models
  useEffect(() => {
    // Only the primary replicate model supports multiple outputs, others default to 1
    if (modelId !== MODEL_IDS.PRIMARY_TXT2IMG) {
      setOutputCount(1);
    }
  }, [modelId]);
  const [isPublic, setIsPublic] = useState(true);
  const [copyProtection, setCopyProtection] = useState(false);
  const [translatePrompt, setTranslatePrompt] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const [containerHeight, setContainerHeight] = useState("calc(100vh - 104px)");
  const [isMdUp, setIsMdUp] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sampleImages, setSampleImages] = useState<string[]>(() => FALLBACK_SAMPLE_IMAGE_KEYS.map(buildSampleImageUrl));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [jobId, setJobId] = useState<number | null>(null);
  const { openViewer } = useViewer();
  const [status, setStatus] = useState<string>("");
  const [jobPrompt, setJobPrompt] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVariants, setPreviewVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number>(0);
  const [loadedStrip, setLoadedStrip] = useState<Record<number, boolean>>({});
  const [loadedGrid, setLoadedGrid] = useState<Record<number, boolean>>({});
  const skeletonStyle = React.useMemo(() => {
    const map: Record<string, [number, number]> = {
      '1:1': [1,1], '16:9': [16,9], '9:16': [9,16], '3:2': [3,2], '2:3': [2,3], '4:3': [4,3], '3:4': [3,4]
    };
    const [w,h] = map[String(selectedRatio||'1:1').toLowerCase()] || [1,1];
    return { aspectRatio: `${w}/${h}`, width: '85%', maxWidth: '90%', maxHeight: '90%' } as React.CSSProperties;
  }, [selectedRatio]);
  const { isPro } = useProStatus();
  const isReplicateModel = engine === 'replicate' &&
    (modelId === MODEL_IDS.PRIMARY_TXT2IMG || modelId === MODEL_IDS.ALT_INLINE_TXT2IMG);
  const supportsHighResClient = !isReplicateModel;
  const targetLongEdge = isPro && supportsHighResClient ? 2048 : 1024;
  const currentDimensions = React.useMemo(() => getTxt2ImgDimensions(selectedRatio, targetLongEdge), [selectedRatio, targetLongEdge]);
  const resolutionLabel = supportsHighResClient
    ? (isPro ? 'Pro tier' : 'Free tier')
    : (isPro ? 'Pro tier (model capped)' : 'Free tier');
  const previewWidth = targetLongEdge;
  const buildPreviewSrc = React.useCallback((base: string) => {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}preview=1&w=${previewWidth}&fmt=webp&q=95&v=3`;
  }, [previewWidth]);
  const [showProModal, setShowProModal] = useState(false);
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [pendingCharacterJob, setPendingCharacterJob] = useState<MiniHistoryItem | null>(null);
  const prettyStatus = (v?: string | null) => {
    const s = String(v || '').toLowerCase();
    if (s.includes('ready') || s.includes('succeeded') || s.includes('completed')) return 'ready';
    if (s.includes('failed') || s.includes('blocked') || s.includes('error')) return 'failed';
    return s || 'pending';
  };
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readyHandledRef = useRef<boolean>(false);
  const { status: authStatus, user } = useAuth();
  const router = useRouter();
  const { setIsLoginOpen } = useAppContext();
  // History feed state (right panel)
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<MiniHistoryItem[]>([]);
  // Pinned pending jobs so they don't disappear when a new job starts
  const [pinnedItems, setPinnedItems] = useState<MiniHistoryItem[]>([]);
  // Use history page's viewer by navigating with query ?open=ID
  // Memoized merged list to keep identity stable across renders
  const mergedHistory = React.useMemo(() => {
    const pinned = pinnedItems.filter((p) => p && p.id !== jobId);
    const hist = historyItems.filter((h: any) => h && h.id !== jobId && !pinned.some((p) => Number(p.id) === Number(h.id)));
    return { list: [...pinned, ...hist], pinnedIds: pinned.map((p) => Number(p.id)) };
  }, [pinnedItems, historyItems, jobId]);

  // Credits state for disabling Create when insufficient
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const getNeededCredits = React.useCallback(() => {
    const per = perImageCost();
    const outputs = Math.max(1, Math.min(outputCount || 1, 4));
    return per * outputs;
  }, [outputCount, modelId, engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Character creation state
  const [creatingCharacter, setCreatingCharacter] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState<MiniHistoryItem | null>(null);
  const CHARACTER_COST = FEATURE_COSTS?.create_character ?? 10;
  const [currentJobCharacterId, setCurrentJobCharacterId] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus !== 'authenticated') { setAvailableCredits(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch('/user/credits', { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        const available = Number(j?.data?.credits ?? NaN);
        if (!Number.isNaN(available) && !cancelled) setAvailableCredits(available);
      } catch {}
    })();
    const onUpdate = (e: any) => {
      try {
        const val = Number(e?.detail);
        if (Number.isFinite(val)) setAvailableCredits(val);
      } catch {}
    };
    try { window.addEventListener('credits:update', onUpdate as any); } catch {}
    return () => { cancelled = true; try { window.removeEventListener('credits:update', onUpdate as any); } catch {} };
  }, [authStatus]);

  const fetchHistory = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) setHistoryLoading(true);
      const r = await apiFetch('/user/generation/history?limit=5&page=1', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const raw = Array.isArray(j?.data?.items) ? j.data.items : [];
      const normalized: MiniHistoryItem[] = raw
        .map((item: any) => {
          const id = Number(item?.id);
          if (!Number.isFinite(id)) return null;
          const imageUrl = typeof item?.image_url === 'string'
            ? item.image_url
            : (typeof item?.hd_url === 'string' ? item.hd_url : null);
          return {
            id,
            image_url: imageUrl,
            prompt: typeof item?.prompt === 'string' ? item.prompt : '',
            created_at: typeof item?.created_at === 'string' ? item.created_at : new Date().toISOString(),
            status: typeof item?.status === 'string' ? item.status : '',
            character_id: typeof item?.character_id === 'string'
              ? item.character_id
              : item?.character_id === null
                ? null
                : undefined
          } as MiniHistoryItem;
        })
        .filter((it: MiniHistoryItem | null | undefined): it is MiniHistoryItem => Boolean(it));
      setHistoryItems(normalized);
      // Drop pinned items that now appear in history
      setPinnedItems((prev) => prev.filter((p) => !normalized.some((x) => Number(x.id) === Number(p.id))));
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  };


  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handleMq = (event: MediaQueryListEvent | MediaQueryList) => {
      const matches = (event as MediaQueryList).matches as boolean;
      setIsMdUp(Boolean(matches));
    };

    handleMq(mq);
    mq.addEventListener('change', handleMq as any);

    const calculateHeight = () => {
      const navbarHeight = 72;
      const availableHeight = window.innerHeight - navbarHeight;
      setContainerHeight(`${availableHeight}px`);
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => {
      mq.removeEventListener('change', handleMq as any);
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

  // Allow closing image preview with Escape
  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPreviewOpen]);

  const nextImage = () => {
    if (sampleImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % sampleImages.length);
  };

  // Preload adjacent variants in the preview strip for faster switching
  useEffect(() => {
    try {
      if (!Array.isArray(previewVariants) || previewVariants.length === 0) return;
      const idxs = [selectedVariant + 1, selectedVariant - 1].filter((i) => i >= 0 && i < previewVariants.length);
      idxs.forEach((i) => {
        const base = String(previewVariants[i] || '');
        if (!base) return;
        const sep = base.includes('?') ? '&' : '?';
        const url = `${base}${sep}preview=1&w=290&h=290&fit=crop&fmt=webp&q=75&v=3`;
        const img = new Image();
        img.decoding = 'async' as any;
        img.src = url;
      });
    } catch {}
  }, [previewVariants, selectedVariant]);

  // Light polling for pinned items to update status and image_url, and auto-merge into history
  const pinnedRef = React.useRef(pinnedItems);
  useEffect(() => { pinnedRef.current = pinnedItems; }, [pinnedItems]);
  const pinnedAttemptsRef = React.useRef<Record<number, number>>({});
  const pollPinnedOnce = React.useCallback(async () => {
    const list = pinnedRef.current;
    if (!Array.isArray(list) || list.length === 0) return;
    try {
      const updates = await Promise.all(list.slice(0, 4).map(async (p) => {
        try {
          try { const { debugStatusFetch } = await import('@/lib/debug-status'); debugStatusFetch(Number(p.id), 'tti:pinned'); } catch {}
          const { fetchStatus } = await import('@/lib/status-fetcher');
          const idn = Number(p.id);
          const j = await fetchStatus(idn, 'tti:pinned') as any;
          if (!j) {
            const at = (pinnedAttemptsRef.current[idn] || 0) + 1;
            pinnedAttemptsRef.current[idn] = at;
            if (at >= 30) return { ...p, status: 'failed', image_url: p.image_url } as any;
            return p;
          }
          const job = j?.job || j || {};
          const ns = String(job?.status || p.status || '').toLowerCase();
          const img = job?.image_url || job?.hd_url || p.image_url || null;
          const charId = Object.prototype.hasOwnProperty.call(job || {}, 'character_id')
            ? (typeof job?.character_id === 'string'
              ? String(job.character_id)
              : job?.character_id === null
                ? null
                : p.character_id ?? null)
            : p.character_id ?? null;
          return { ...p, status: ns || p.status, image_url: img, character_id: charId };
        } catch { return p; }
      }));
      // Build next state and only update when changed to avoid re-render loops
      setPinnedItems((prev) => {
        const byId = new Map(prev.map((x) => [Number(x.id), x]));
        for (const u of updates) byId.set(Number(u.id), u);
        const next = Array.from(byId.values());
        const sameLen = next.length === prev.length;
        const same = sameLen && next.every((n) => {
          const p = prev.find((x) => Number(x.id) === Number(n.id));
          return p && p.status === n.status && (p.image_url || '') === (n.image_url || '');
        });
        return same ? prev : next;
      });
      // Auto-unpin and refresh history when job reaches final state
      const finalStates = updates.filter(u => /\b(ready|completed|succeeded|failed|blocked)\b/i.test(String(u.status||'')));
      if (finalStates.length > 0) {
        try { fetchHistory({ silent: true }); } catch {}
        // Remove completed/failed jobs from pinned
        setPinnedItems((prev) => prev.filter((p) => !finalStates.some(f => Number(f.id) === Number(p.id))));
      }
    } catch {}
  }, []);
  useEffect(() => {
    if (pinnedItems.length === 0) return;
    const h = setInterval(() => { void pollPinnedOnce(); }, 10000);
    void pollPinnedOnce();
    return () => clearInterval(h);
  }, [pinnedItems.length, pollPinnedOnce]);

  const prevImage = () => {
    if (sampleImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + sampleImages.length) % sampleImages.length);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/gallery/featured?limit=12', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const characters = Array.isArray(data?.characters) ? data.characters : [];
        const avatars = characters
          .map((c: any) => (typeof c?.avatar_url === 'string' ? c.avatar_url.trim() : ''))
          .filter((url: string) => !!url);
        if (!avatars.length) return;
        const urls = avatars.map((url: string) =>
          buildImageUrl({ base: url, preview: true, width: 768, fmt: 'webp', quality: 95, watermark: false })
        );
        if (!cancelled && urls.length) {
          setSampleImages(urls);
          setCurrentImageIndex(0);
        }
      } catch (error) {
        console.error('[text-to-image] failed to fetch featured characters', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto carousel functionality
  useEffect(() => {
    if (sampleImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % sampleImages.length);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [sampleImages.length]);

  const clearTimers = () => {
    if (previewPollRef.current) clearInterval(previewPollRef.current);
    previewPollRef.current = null;
    // Also clear any stray global poller (guards against dev Fast Refresh)
    try {
      const g: any = typeof window !== 'undefined' ? (window as any) : {};
      if (g.__ggPreviewPollRef) { clearInterval(g.__ggPreviewPollRef); g.__ggPreviewPollRef = null; }
    } catch {}
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const pollPreviewStatus = (jid: number) => {
    // Ensure only one poller exists across HMR/fast-refresh cycles
    clearTimers();
    let ticks = 0; // safety cap to avoid endless polling
    const intervalId = setInterval(async () => {
      try {
        const res = await apiFetch(`/generation/status?job_id=${jid}`);
        if (!res.ok) {
          // Stop polling on server error to avoid infinite loops
          setIsGenerating(false);
          clearInterval(intervalId);
          if (previewPollRef.current === intervalId) previewPollRef.current = null;
          try { const g: any = (window as any); if (g.__ggPreviewPollRef === intervalId) g.__ggPreviewPollRef = null; } catch {}
          return;
        }
        const data = await res.json();
        const job = data && typeof data === 'object' ? (data.job && typeof data.job === 'object' ? data.job : data) : null;
        const statusVal = job?.status ? String(job.status) : '';
        setStatus((prev) => prev === statusVal ? prev : statusVal);
        // If backend supplies prompt, lock it for this job (do not bind to input)
        const srvPrompt = job && (job as any).prompt;
        if (typeof srvPrompt === 'string' && srvPrompt.trim()) {
          setJobPrompt((prev) => prev === String(srvPrompt) ? prev : String(srvPrompt));
        }
        if (job && Object.prototype.hasOwnProperty.call(job, 'character_id')) {
          const charId = typeof (job as any).character_id === 'string'
            ? String((job as any).character_id)
            : (job as any).character_id === null
              ? null
              : undefined;
          if (typeof charId === 'string') {
            setCurrentJobCharacterId((prev) => (prev === charId ? prev : charId));
          } else if (charId === null) {
            setCurrentJobCharacterId((prev) => (prev === null ? prev : null));
          }
        }
        const purl = job && ((job as any).image_url || (job as any).hd_url) || null;
        if (purl) {
          setPreviewUrl((prev) => prev === purl ? prev : purl);
        }
        const pvarsSource = job && (Array.isArray((job as any).images) ? (job as any).images.map((img: any) => typeof img?.url === 'string' ? img.url : null).filter(Boolean) : (job as any).image_variants);
        if (Array.isArray(pvarsSource)) {
          const pvars = pvarsSource as string[];
          setPreviewVariants((prev) => {
            const sameLen = prev.length === pvars.length;
            const same = sameLen && prev.every((v, i) => v === pvars[i]);
            return same ? prev : pvars;
          });
          // Keep selection in range
          setSelectedVariant((idx) => Math.max(0, Math.min(idx, Math.max(0, (pvars as string[]).length - 1))));
        }
        const isReady = purl || /\bready\b/i.test(statusVal) || /\bcompleted?\b/i.test(statusVal) || /\bsucceeded?\b/i.test(statusVal);
        if (isReady) {
          setIsGenerating(false);
          if (!readyHandledRef.current) {
            readyHandledRef.current = true;
            try { fetchHistory({ silent: true }); } catch {}
          }
          clearInterval(intervalId);
          if (previewPollRef.current === intervalId) previewPollRef.current = null;
          try { const g: any = (window as any); if (g.__ggPreviewPollRef === intervalId) g.__ggPreviewPollRef = null; } catch {}
          return;
        }
        if (/\b(blocked|failed|error)\b/i.test(statusVal)) {
          setIsGenerating(false);
          clearInterval(intervalId);
          if (previewPollRef.current === intervalId) previewPollRef.current = null;
          try { const g: any = (window as any); if (g.__ggPreviewPollRef === intervalId) g.__ggPreviewPollRef = null; } catch {}
          return;
        }
        // stop after ~5 minutes regardless
        ticks += 1;
        if (ticks >= 100) { // 100 * 5s = ~8.3 minutes (increased tolerance for external providers)
          setIsGenerating(false);
          clearInterval(intervalId);
          if (previewPollRef.current === intervalId) previewPollRef.current = null;
          try { const g: any = (window as any); if (g.__ggPreviewPollRef === intervalId) g.__ggPreviewPollRef = null; } catch {}
          return;
        }
      } catch (e) {
        // stop polling on error
        setIsGenerating(false);
        clearInterval(intervalId);
        if (previewPollRef.current === intervalId) previewPollRef.current = null;
        try { const g: any = (window as any); if (g.__ggPreviewPollRef === intervalId) g.__ggPreviewPollRef = null; } catch {}
        return;
      }
    }, 5000);
    previewPollRef.current = intervalId;
    try { (window as any).__ggPreviewPollRef = intervalId; } catch {}
  };

  // HD flow removed in single-stage mode

  const modelLabel = formatModelLabel(modelId);

  const perImageCost = () => {
    const cost = (CREDIT_COSTS as Record<string, number | undefined>)[modelId];
    if (cost === undefined) {
      console.error(`[perImageCost] Invalid model: ${modelId}`);
      return 1;
    }
    return cost;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (authStatus !== 'authenticated') {
      try { setIsLoginOpen?.(true); } catch {}
      return;
    }
    // If previous job exists and may still be pending, pin it so UI keeps it visible
    if (jobId && !/\b(ready|completed|succeeded|failed|blocked)\b/i.test(status)) {
      setPinnedItems((prev) => {
        const exists = prev.some((p) => Number(p.id) === Number(jobId));
        if (exists) return prev;
        const created = new Date().toISOString();
        const item: MiniHistoryItem = {
          id: jobId,
          image_url: previewUrl,
          prompt: jobPrompt || prompt,
          created_at: created,
          status: status || 'processing',
          character_id: currentJobCharacterId ?? null
        };
        return [item, ...prev].slice(0, 4);
      });
    }
    // Ensure any previous polling is cleared before starting a new job
    clearTimers();
    // Reset current-job visuals so the right card doesn't show old thumbnails
    setIsGenerating(true);
    readyHandledRef.current = false;
    setStatus("pending");
    setJobId(null);
    setCurrentJobCharacterId(null);
    setJobPrompt("");
    setPreviewUrl(null);
    setPreviewVariants([]);
    setLoadedStrip({});
    setLoadedGrid({});
    setShowHistory(true);
    setSelectedVariant(0);
    
    try {
      // Prompt translation/optimization via SiliconFlow (DeepSeek)
      // For image-to-image providers ensure prompts are localized via the existing translation API
      // For replicate-based models, honor the user toggle (optional, English)
      let finalPrompt = prompt;
      if (finalPrompt.trim() && translatePrompt) {
        try {
          const tr = await apiFetch('/translate/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalPrompt.trim(), target_lang: 'en' })
          });
          if (tr.ok) {
            const tj = await tr.json();
            if (tj?.translated) finalPrompt = String(tj.translated);
          }
        } catch {}
      }

      // Pre-check credits on client before creating
      try {
        const r = await apiFetch('/user/credits', { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          const available = Number(j?.data?.credits ?? 0);
          const needed = perImageCost() * Math.max(1, Math.min(outputCount, 4));
          if (available < needed) {
            setIsGenerating(false);
            toast.error(`Insufficient credits: need ${needed}, available ${available}.`, {
              description: 'Please add credits to continue.',
              action: { label: 'Add credits', onClick: () => { try { window.location.href = '/pricing'; } catch {} } }
            });
            return;
          }
        }
      } catch {}

      const res = await apiFetch("/generation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          aspect_ratio: selectedRatio,
          output_count: outputCount,
          is_public: isPublic,
          model_id: modelId, // Must be set, no fallback allowed
        }),
      });
      if (res.status === 401) {
        setIsGenerating(false);
        try { setIsLoginOpen?.(true); } catch {}
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        try {
          if (typeof err?.credits_remaining !== 'undefined') {
            window.dispatchEvent(new CustomEvent('credits:update', { detail: err.credits_remaining }));
          }
        } catch {}
        if (res.status === 429) {
          const message = err?.message || err?.error?.message || err?.error || '';
          const retryAfter = err?.retry_after ? ` (retry in ${err.retry_after}s)` : '';
          const desc = message ? String(message) + retryAfter : 'You\'re making requests too quickly. Please wait a moment and try again.';
          toast.error('Request Limit', { description: desc });
        } else {
          const msg = err?.error?.message || err?.message || 'Failed to start generation';
          toast.error(msg);
        }
        setIsGenerating(false);
        return;
      }
      const data = await res.json();
      // Notify navbar to refresh credits immediately
      try {
        if (typeof data?.credits_remaining !== 'undefined') {
          window.dispatchEvent(new CustomEvent('credits:update', { detail: data.credits_remaining }));
        }
      } catch {}
      if (data?.duplicate && data?.job?.id) {
        const duplicateId = Number(data.job.id);
        if (Number.isFinite(duplicateId)) {
          setJobId(duplicateId);
          const duplicateCharacterId = extractCharacterId(data?.job?.character_id);
          if (duplicateCharacterId !== undefined) {
            setCurrentJobCharacterId(duplicateCharacterId);
          } else {
            setCurrentJobCharacterId(null);
          }
          const promptFromJob = typeof data.job.prompt === 'string' && data.job.prompt.trim()
            ? String(data.job.prompt)
            : finalPrompt;
          setJobPrompt(promptFromJob);
          setIsGenerating(false);
          try { fetchHistory({ silent: true }); } catch {}
          pollPreviewStatus(duplicateId);
          try { toast.info('Reused recent generation result.'); } catch {}
          return;
        }
      }
      if (Array.isArray(data.job_ids) && data.job_ids.length) {
        // Fan-out path: multiple jobs created
        try {
          toast.success(`Created ${data.job_ids.length} tasks`);
        } catch {}
        setShowHistory(true);
        try { fetchHistory({ silent: true }); } catch {}
        // Optionally poll the first one for visual feedback
        const first = Number(data.job_ids[0]);
        if (Number.isFinite(first)) {
          setJobId(first);
          setCurrentJobCharacterId(null);
          setJobPrompt(finalPrompt);
          pollPreviewStatus(first);
        } else {
          setIsGenerating(false);
        }
      } else if (typeof data.job_id === "number") {
        setJobId(data.job_id);
        const jobCharacterId = extractCharacterId(data?.character_id);
        setCurrentJobCharacterId(jobCharacterId ?? null);
        // Freeze the prompt for this job so it doesn't follow input changes
        setJobPrompt(finalPrompt);
        pollPreviewStatus(data.job_id);
        try { fetchHistory({ silent: true }); } catch {}
      } else {
        setIsGenerating(false);
      }
    } catch (e) {
      setIsGenerating(false);
      toast.error("Network error starting generation");
    }
  };

  // Generate prompt only (DeepSeek) and fill textarea
  const handleSuggestPrompt = async () => {
    // Prefer local seed to avoid any network request
    try {
      setIsSuggesting(true);
      const local = getRandomSeed();
      if (local) {
        setPrompt(local);
        return;
      }
      // Fallback to API only if local list is empty
      try {
        const r = await apiFetch('/prompt/generate', { method: 'POST' });
        if (r.ok) {
          const j = await r.json();
          if (j?.phrase) setPrompt(String(j.phrase));
        }
      } catch {}
    } finally {
      setIsSuggesting(false);
    }
  };

  // USD estimate removed per requirements

  // Removed HD upgrade in single-stage flow

  const insertIdea = (idea: string) => {
    setPrompt(idea);
  };

  const handleTogglePublic = async () => {
    // If currently public and user tries to disable, enforce paid-only restriction
    if (isPublic) {
      if (authStatus !== 'authenticated') {
        try { setIsLoginOpen?.(true); } catch {}
        return;
      }
      try {
        const uid = user?.id;
        if (!uid) { try { setIsLoginOpen?.(true); } catch {}; return; }
        const res = await apiFetch('/user/check_pro_status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: uid })
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.isPro) {
          setIsPublic(false);
        } else {
          setShowProModal(true);
          setIsPublic(true);
        }
      } catch {
        setShowProModal(true);
        setIsPublic(true);
      }
    } else {
      // Re-enabling public is always allowed
      setIsPublic(true);
    }
  };

  const handleCreateCharacter = async (job: MiniHistoryItem) => {
    if (creatingCharacter[job.id]) return;
    const statusLabel = prettyStatus(job.status);
    if (statusLabel !== 'ready') {
      toast.error('This task is not yet complete, cannot create character');
      return;
    }

    // Open modal instead of using window.prompt
    setPendingCharacterJob(job);
    setCharacterName('');
    setShowCharacterModal(true);
  };

  const confirmCreateCharacter = async () => {
    if (!pendingCharacterJob) return;

    const name = characterName.replace(/\s+/g, ' ').trim();
    if (!name) {
      toast.error('Name cannot be empty');
      return;
    }
    if (!/^[A-Za-z0-9 ]{1,64}$/.test(name)) {
      toast.error('Name can only contain English letters, numbers and spaces, up to 64 characters');
      return;
    }

    const job = pendingCharacterJob;
    setShowCharacterModal(false);
    setCreatingCharacter((prev) => ({ ...prev, [job.id]: true }));

    try {
      const res = await apiFetch('/user/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, name })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const message = data?.error?.message || 'Failed to create character, please try again later';
        throw new Error(message);
      }

      toast.success('Character created successfully');
      // Update both pinned and history items
      setPinnedItems((prev) => prev.map((item) => (
        item.id === job.id
          ? { ...item, character_id: data?.data?.character_id ?? 'created' }
          : item
      )));
      setHistoryItems((prev) => prev.map((item) => (
        item.id === job.id
          ? { ...item, character_id: data?.data?.character_id ?? 'created' }
          : item
      )));
      if (job.id === jobId) {
        setCurrentJobCharacterId(data?.data?.character_id ?? 'created');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create character, please try again later';
      toast.error(message);
    } finally {
      setCreatingCharacter((prev) => {
        const next = { ...prev };
        delete next[job.id];
        return next;
      });
      setPendingCharacterJob(null);
    }
  };

  const openDeleteConfirm = (job: MiniHistoryItem) => {
    setPendingDeleteJob(job);
    setShowDeleteModal(true);
  };

  const closeDeleteConfirm = () => {
    if (pendingDeleteJob && deleting[pendingDeleteJob.id]) return;
    setShowDeleteModal(false);
    setPendingDeleteJob(null);
  };

  const deleteJob = async (id: number) => {
    if (deleting[id]) return false;
    setDeleting((prev) => ({ ...prev, [id]: true }));
    try { window.dispatchEvent(new CustomEvent('global:loading', { detail: true })); } catch {}
    try {
      const res = await apiFetch('/user/generation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: id })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error?.message || 'Delete failed');
        return false;
      }

      toast.success('Deleted');
      clearTimers();
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
      setPinnedItems((prev) => prev.filter((item) => item.id !== id));
      if (jobId === id) {
        setJobId(null);
        setStatus('');
        setJobPrompt('');
        setPreviewUrl(null);
        setPreviewVariants([]);
        setIsGenerating(false);
        setCurrentJobCharacterId(null);
      }
      try { fetchHistory({ silent: true }); } catch {}
      return true;
    } catch (error) {
      console.error('[TextToImage] deleteJob failed', error);
      toast.error('Delete failed');
      return false;
    } finally {
      setDeleting((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try { window.dispatchEvent(new CustomEvent('global:loading', { detail: false })); } catch {}
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteJob) return;
    const success = await deleteJob(pendingDeleteJob.id);
    if (success) {
      setShowDeleteModal(false);
      setPendingDeleteJob(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-[72px]">

      {/* Main Content */}
      <div
        className="flex flex-col md:flex-row gap-4 p-4"
        style={{
          height: isMdUp ? containerHeight : undefined
        }}
      >

        {/* Left Panel - Generation Controls */}
        <div
          className="w-full bg-gray-900 border border-gray-800 rounded-xl h-auto md:h-full relative flex flex-col"
          style={{ flex: '0 1 450px', maxWidth: '450px', minWidth: '350px', width: '100%' }}
        >
          {/* Main Content Area - Scrollable */}
          {/* Increase bottom padding to prevent fixed footer from covering dropdowns and last controls */}
          <div className="flex-1 overflow-y-auto p-6 pb-56">
            <div className="mb-6">
              <h1 className="text-1xl font-bold text-white mb-2">Text to Image</h1>
            </div>
          
            {/* Model Selection removed */}

            {/* Model Select + Prompt Input */}
            <div className="mb-6">
              {/* Model Select */}
              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                <button
                  type="button"
                  onClick={() => setIsModelOpen(v => !v)}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-600/40 to-blue-600/40 p-[1px] hover:from-purple-600/60 hover:to-blue-600/60 transition"
                >
                  <div className="flex items-center justify-between rounded-2xl bg-[#0b1220] px-4 py-4">
                    <div className="text-white text-base md:text-[15px] font-medium">
                      {modelLabel}
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isModelOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-2xl bg-[#0b1220] border border-gray-800 shadow-2xl overflow-hidden">
                    {/* Inline provider option */}
                    <div
                      onClick={() => { setEngine('inline'); setModelId(MODEL_IDS.INLINE_TXT2IMG); setIsModelOpen(false); }}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition ${(engine==='inline' && modelId===MODEL_IDS.INLINE_TXT2IMG) ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border ${(engine==='inline' && modelId===MODEL_IDS.INLINE_TXT2IMG) ? 'border-purple-400' : 'border-gray-600'} flex items-center justify-center`}>
                          {(engine==='inline' && modelId===MODEL_IDS.INLINE_TXT2IMG) && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{formatModelLabel(MODEL_IDS.INLINE_TXT2IMG)}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">Recommended</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Fast and creative AI generation with great quality.</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300/90">
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md"><ClockIcon className="w-3.5 h-3.5"/> ~30 sec</span>
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md">{CREDIT_COSTS[MODEL_IDS.INLINE_TXT2IMG]} credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Primary replicate model */}
                    <div
                      onClick={() => { setEngine('replicate'); setModelId(MODEL_IDS.PRIMARY_TXT2IMG); setIsModelOpen(false); }}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition ${(engine==='replicate' && modelId===MODEL_IDS.PRIMARY_TXT2IMG) ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border ${(engine==='replicate' && modelId===MODEL_IDS.PRIMARY_TXT2IMG) ? 'border-purple-400' : 'border-gray-600'} flex items-center justify-center`}>
                          {(engine==='replicate' && modelId===MODEL_IDS.PRIMARY_TXT2IMG) && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{formatModelLabel(MODEL_IDS.PRIMARY_TXT2IMG)}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Alt</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Lightning-fast generation with excellent quality.</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300/90">
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md"><ClockIcon className="w-3.5 h-3.5"/> ~10 sec</span>
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md">{CREDIT_COSTS[MODEL_IDS.PRIMARY_TXT2IMG]} credit</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Premium replicate option */}
                    <div
                      onClick={() => { setEngine('replicate'); setModelId(MODEL_IDS.PREMIUM_TXT2IMG); setIsModelOpen(false); }}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition ${(engine==='replicate' && modelId===MODEL_IDS.PREMIUM_TXT2IMG) ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border ${(engine==='replicate' && modelId===MODEL_IDS.PREMIUM_TXT2IMG) ? 'border-purple-400' : 'border-gray-600'} flex items-center justify-center`}>
                          {(engine==='replicate' && modelId===MODEL_IDS.PREMIUM_TXT2IMG) && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{formatModelLabel(MODEL_IDS.PREMIUM_TXT2IMG)}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">High quality, balanced speed.</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300/90">
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md"><ClockIcon className="w-3.5 h-3.5"/> ~60 sec</span>
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md">{CREDIT_COSTS[MODEL_IDS.PREMIUM_TXT2IMG]} credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Max replicate option */}
                    <div
                      onClick={() => { setEngine('replicate'); setModelId(MODEL_IDS.MAX_TXT2IMG); setIsModelOpen(false); }}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition ${(engine==='replicate' && modelId===MODEL_IDS.MAX_TXT2IMG) ? 'bg-white/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border ${(engine==='replicate' && modelId===MODEL_IDS.MAX_TXT2IMG) ? 'border-purple-400' : 'border-gray-600'} flex items-center justify-center`}>
                          {(engine==='replicate' && modelId===MODEL_IDS.MAX_TXT2IMG) && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{formatModelLabel(MODEL_IDS.MAX_TXT2IMG)}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Highest quality, slower.</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300/90">
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md"><ClockIcon className="w-3.5 h-3.5"/> ~90 sec</span>
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md">{CREDIT_COSTS[MODEL_IDS.MAX_TXT2IMG]} credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">Prompt</label>
                {/* Translate Prompt Toggle - Right side */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Translate Prompt</span>
                  <button
                    onClick={() => setTranslatePrompt(!translatePrompt)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      translatePrompt ? "bg-purple-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        translatePrompt ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <div className="relative">
                <textarea
                  className="w-full p-4 bg-[#111827] border border-gray-700 rounded-xl text-white text-sm placeholder:text-sm resize-none h-36 focus:ring-0 focus:border-gray-600 focus:outline-none outline-none placeholder-gray-500"
                  placeholder="Describe what you want to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                />
                <button
                  onClick={handleSuggestPrompt}
                  disabled={isSuggesting || isGenerating}
                  className="absolute left-3 bottom-4 text-xs text-white hover:text-purple-400 focus:text-purple-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                  title="Generate prompt with AI"
                >
                  <SparklesIcon className="w-4 h-4 text-current" />
                  <span>Generate with AI</span>
                </button>
                <div className="absolute right-4 bottom-4 text-xs text-gray-500 pointer-events-none">{prompt.length} / 2000</div>
              </div>
            </div>

            {/* Advanced Settings - Collapsible */}
            <div className="mb-6">
              <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-300 hover:text-white transition-colors mb-3"
              >
                <span>Advanced Settings</span>
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${
                  isAdvancedOpen ? 'rotate-180' : ''
                }`} />
              </button>
              {isAdvancedOpen && (
                <div className="space-y-4">

                  {/* Aspect Ratio */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-3">Aspect Ratio</label>
                    <div className="grid grid-cols-4 gap-2">
                      {aspectRatios.map((ratio) => (
                        <button
                          key={ratio.value}
                          onClick={() => setSelectedRatio(ratio.value)}
                          className={`p-3 text-sm rounded-xl border transition-all duration-200 ${
                            selectedRatio === ratio.value
                              ? "bg-[#111827] text-purple-400 border-gray-700"
                              : "bg-[#111827] text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-[#111827]/70"
                          }`}
                        >
                          {ratio.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Output resolution: {currentDimensions.width} × {currentDimensions.height} ({resolutionLabel})
                    </p>
                  </div>

                  

              {/* Output Image Number - Only show for primary replicate model */}
              {modelId === MODEL_IDS.PRIMARY_TXT2IMG && (
                <div>
                  <label className="block text-xs text-gray-500 mb-3">Output Image Number</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setOutputCount(num)}
                        className={`w-12 h-12 text-sm rounded-xl border transition-all duration-200 ${
                          outputCount === num
                            ? "bg-[#111827] text-purple-400 border-gray-700"
                            : "bg-[#111827] text-gray-300 border-gray-700 hover:border-gray-600 hover:bg-[#111827]/70"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
          </div>


          {/* Fixed Bottom Area - 20px from container bottom */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
            <div className="p-6 pb-6 space-y-4">
              {/* Settings */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Public Visibility</span>
                <button
                  onClick={handleTogglePublic}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? "bg-purple-600" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Cost display based on unified credit config */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Cost: <span className="text-white font-medium">{perImageCost() * Math.max(1, Math.min(outputCount, 4))}</span> {outputCount>1?'credits':'credit'}
                </div>
              </div>

              {/* Generate / Regenerate Buttons */}
              {!previewUrl ? (
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || (authStatus === 'authenticated' && availableCredits !== null && availableCredits < getNeededCredits())}
                  className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${
                    !prompt.trim()
                      ? 'bg-gray-700 text-white/70 cursor-not-allowed'
                      : ((authStatus === 'authenticated' && availableCredits !== null && availableCredits < getNeededCredits())
                          ? 'bg-gray-700 text-white/70 cursor-not-allowed'
                          : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700')
                  }`}
                >
                  <SparklesIcon className="w-4 h-4" />
                  {isGenerating ? "Creating..." : `Create (${getNeededCredits()} ${outputCount>1?'credits':'credit'})`}
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (authStatus === 'authenticated' && availableCredits !== null && availableCredits < getNeededCredits())}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {isGenerating ? "Creating..." : `Regenerate (${getNeededCredits()} ${outputCount>1?'credits':'credit'})`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - History Feed */}
        <div className="flex-1">
          <div className="bg-gray-900 border border-gray-800 rounded-xl h-full flex flex-col overflow-hidden">
            <div className="px-6 pt-6 pb-3">
              <h2 className="text-1xl font-bold text-white">{showHistory ? 'My Generations' : (previewUrl ? 'Result' : 'Sample')}</h2>
            </div>
            {!showHistory ? (
              <div className="p-6 flex-1 min-h-0 flex flex-col">
                <div className="relative flex-1 min-h-[240px] sm:min-h-[300px] lg:min-h-[340px] bg-[#111827] rounded-2xl overflow-hidden border border-gray-700">
                  {!isGenerating && (previewUrl || previewVariants.length > 0) ? (
                    <img
                      src={(() => {
                        if (previewUrl) return buildPreviewSrc(String(previewUrl));
                        const base = String(previewVariants[selectedVariant] || previewVariants[0]);
                        return buildPreviewSrc(base);
                      })()}
                      alt="Generated image"
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => setIsPreviewOpen(true)}
                    />
                  ) : !isGenerating ? (
                    <>
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="relative aspect-square w-[clamp(280px,70vw,900px)]">
                          <img
                            src={sampleImages[currentImageIndex]}
                            alt="Sample generated image"
                            className="absolute inset-0 w-full h-full object-cover cursor-zoom-in rounded-2xl shadow-[0_28px_55px_rgba(15,23,42,0.45)]"
                            onClick={() => setIsPreviewOpen(true)}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10" aria-hidden="true" />
                        </div>
                      </div>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                      >
                        <ChevronDownIcon className="w-5 h-5 text-white rotate-90" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                      >
                        <ChevronDownIcon className="w-5 h-5 text-white -rotate-90" />
                      </button>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        {sampleImages.map((url, index) => (
                          <button
                            key={`${url}-${index}`}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <SparklesIcon className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Generating your image...</p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Variant thumbnails */}
                {!isGenerating && previewVariants.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {previewVariants.map((u, i) => {
                      const base = String(u); const sep = base.includes('?') ? '&' : '?';
                      const src = `${base}${sep}preview=1&w=290&fmt=webp&q=75&v=3`;
                      const active = (previewUrl ? base && previewUrl.startsWith(base) : i === selectedVariant);
                      return (
                        <button key={i} className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border ${active ? 'border-purple-400' : 'border-gray-700'}`} onClick={() => { setPreviewUrl(u); setSelectedVariant(i); }}>
                          {!loadedStrip[i] && <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" aria-hidden="true" />}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`variant ${i+1}`}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${loadedStrip[i] ? 'opacity-100' : 'opacity-0'}`}
                            loading="lazy"
                            decoding="async"
                            fetchPriority="low"
                            onLoad={() => setLoadedStrip((prev) => ({ ...prev, [i]: true }))}
                          />
                          {active && <span className="absolute inset-0 ring-2 ring-purple-400 pointer-events-none" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(isGenerating || jobId) && (
                  <div className="mb-4">
                    <CurrentTaskCard
                      tool="Text to Image"
                      model={modelLabel}
                      createdAt={new Date()}
                      statusText={prettyStatus(status)}
                    prompt={jobPrompt || prompt || '—'}
                    kind="image"
                    imageThumbs={(() => {
                      const variants = Array.isArray(previewVariants) ? previewVariants.filter(Boolean) : [];
                      const readyThumbs = variants.length > 0 ? variants : (previewUrl ? [String(previewUrl)] : []);
                      const desired = Math.max(1, Math.min(outputCount || 1, 4));
                      const total = Math.max(desired, readyThumbs.length);
                      const arr = Array.from({ length: total }).map((_, i) => readyThumbs[i]).filter(Boolean) as string[];
                      return arr.length > 0 ? arr : [];
                    })()}
                    desiredImageCount={Math.max(1, Math.min(outputCount || 1, 4))}
                    onOpen={() => { if (jobId) { clearTimers(); openViewer(Number(jobId)); } }}
                    renderActions={() => {
                      if (!jobId) return null;
                      const st = prettyStatus(status);
                      const job: MiniHistoryItem = {
                        id: jobId,
                        image_url: previewUrl,
                        prompt: jobPrompt || prompt || '',
                        created_at: new Date().toISOString(),
                        status,
                        character_id: currentJobCharacterId ?? null
                      };

                      const actions: React.ReactNode[] = [];

                      if (st === 'ready' && !job.character_id) {
                        actions.push(
                          <button
                            key="create"
                            onClick={(e) => { e.stopPropagation?.(); handleCreateCharacter(job); }}
                            disabled={!!creatingCharacter[jobId]}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span>✨</span>
                            <span>{creatingCharacter[jobId] ? 'Creating…' : 'Create Character'}</span>
                          </button>
                        );
                      }

                      if (st === 'ready' || st === 'failed') {
                        actions.push(
                          <button
                            key="delete"
                            onClick={(e) => {
                              e.stopPropagation?.();
                              openDeleteConfirm(job);
                            }}
                            disabled={!!deleting[jobId]}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting[jobId] ? 'Deleting…' : 'Delete'}
                          </button>
                        );
                      }

                      return <>{actions}</>;
                    }}
                  />
                  </div>
                )}

                {historyLoading ? (
                  <div className="text-center text-white/60 py-10">Loading history…</div>
                ) : historyItems.length === 0 ? (
                  (isGenerating || jobId) ? (
                    <div className="space-y-4" aria-hidden="true">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border border-gray-800 bg-[#0f172a] p-4">
                          <div className="flex items-center gap-3 text-sm mb-3">
                            <div className="w-24 h-4 bg-white/5 rounded animate-pulse" />
                            <div className="w-20 h-4 bg-white/5 rounded animate-pulse" />
                            <div className="w-28 h-4 bg-white/5 rounded animate-pulse" />
                          </div>
                          <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse mb-3" />
                          <div className="flex gap-2 flex-wrap">
                            {Array.from({ length: 3 }).map((__, j) => (
                              <div key={j} className="w-[160px] h-[160px] sm:w-[192px] sm:h-[192px] md:w-[224px] md:h-[224px] lg:w-[256px] lg:h-[256px] xl:w-[290px] xl:h-[290px] rounded-lg bg-white/5 animate-pulse border border-gray-700" />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center text-white/60 py-10">No history yet</div>
                ) : (
                  <>
                    {(() => (
                      <HistoryList
                        items={mergedHistory.list as any}
                        onOpen={(it: any) => { clearTimers(); openViewer(Number(it.id)); }}
                        pinnedIds={mergedHistory.pinnedIds}
                        renderActions={(it: any) => {
                          const st = prettyStatus(it.status);
                          const jobIdNum = Number(it.id);
                          if (!Number.isFinite(jobIdNum)) return null;
                          const normalizedItem: MiniHistoryItem = {
                            id: jobIdNum,
                            image_url: typeof it.image_url === 'string' ? it.image_url : null,
                            prompt: typeof it.prompt === 'string' ? it.prompt : '',
                            created_at: typeof it.created_at === 'string' ? it.created_at : new Date().toISOString(),
                            status: typeof it.status === 'string' ? it.status : '' ,
                            character_id: it.character_id ?? null
                          };
                          const actions: React.ReactNode[] = [];

                          if (st === 'ready' && !normalizedItem.character_id) {
                            actions.push(
                              <button
                                key="create"
                                onClick={(e) => {
                                  e.stopPropagation?.();
                                  handleCreateCharacter(normalizedItem);
                                }}
                                disabled={!!creatingCharacter[jobIdNum]}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span>✨</span>
                                <span>{creatingCharacter[jobIdNum] ? 'Creating…' : 'Create Character'}</span>
                              </button>
                            );
                          }

                          if (st === 'ready' || st === 'failed') {
                            actions.push(
                              <button
                                key="delete"
                                onClick={(e) => {
                                  e.stopPropagation?.();
                                  openDeleteConfirm(normalizedItem);
                                }}
                                disabled={!!deleting[jobIdNum]}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deleting[jobIdNum] ? 'Deleting…' : 'Delete'}
                              </button>
                            );
                          }

                      if (!actions.length) return null;
                      return <>{actions}</>;
                    }}
                  />
                    ))()}
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => { try { window.location.href = '/content'; } catch {} }}
                        className="px-4 py-2 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm hover:bg-[#1b2236]"
                      >
                        View more
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDeleteModal && pendingDeleteJob && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeDeleteConfirm}
        >
          <div
            className="relative w-full max-w-sm bg-[#0b1220] border border-white/10 rounded-2xl p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold mb-2">Delete Task</h4>
            <p className="text-sm text-white/70 mb-4">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeDeleteConfirm}
                disabled={!!deleting[pendingDeleteJob.id]}
                className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deleting[pendingDeleteJob.id]}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting[pendingDeleteJob.id] ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setShowProModal(false)}>
          <div className="relative w-full max-w-md bg-[#0b1220] border border-white/10 rounded-2xl p-6 text-white" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Private visibility is a Pro feature</h4>
            <p className="text-sm text-white/70 mb-6">Only paid users can disable Public Visibility. Upgrade your plan to make generations private.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowProModal(false)} className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15">OK</button>
              <button onClick={() => (window.location.href = '/pricing')} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white">Upgrade</button>
            </div>
          </div>
        </div>
      )}

      {showCharacterModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setShowCharacterModal(false)}>
          <div className="relative w-full max-w-md bg-[#0b1220] border border-white/10 rounded-2xl p-6 text-white" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Create Character</h4>
            <p className="text-sm text-white/70 mb-4">Enter character name in English. {CHARACTER_COST} credits will be deducted.</p>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmCreateCharacter(); }}
              placeholder="Character name"
              maxLength={64}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 transition-colors"
              autoFocus
            />
            <p className="text-xs text-white/50 mt-2">Only English letters, numbers and spaces allowed (max 64 characters)</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCharacterModal(false)} className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 transition-colors">Cancel</button>
              <button onClick={confirmCreateCharacter} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer */}
      {/* Unified viewer handled by ViewerDrawer via context */}

      {/* Content Sections - All content from Pollo AI below the tool interface */}
      {/* Commented out the marketing content sections below */}

      {/* Viewer handled on /content via ?open=ID */}

      {/* Commented out marketing content sections
      <div className="bg-gray-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 mb-16">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-8">
            {Array.from({ length: 16 }).map((_, index) => (
              <div key={index} className="aspect-square bg-gray-800 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {Array.from({ length: 16 }).map((_, index) => (
              <div key={index} className="aspect-square bg-gray-800 rounded-lg"></div>
            ))}
          </div>
        </div>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">All-in-One AI Image Generator</h2>
            <p className="text-lg text-gray-300 max-w-4xl mx-auto">
              Never switch platforms again. Generate professional-grade images all in one place using a curated mix of leading diffusion, remix, and video engines.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              'Creative Studio', 'Visionary Suite', 'Prompt Fabric', 'Inline Painter',
              'Primary Diffusion', 'Detail Booster', 'Max Precision', 'Ultra Render',
              'Photo Engine', 'Vector Crafter', 'Dream Canvas', 'Motion Forge'
            ].map((model) => (
              <div key={model} className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-center hover:bg-gray-800 transition-colors cursor-pointer">
                <p className="text-sm text-gray-300">{model}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Turn Words into Wow With Our AI Image Generator</h2>
              <p className="text-lg text-gray-300 mb-8">
                Turn your ideas to stunning visuals with Girl Generator AI. Our text to image generator creates lifelike images strictly following any given prompt. Get appealing, detail-rich, and believable AI images ready for fun, social media, and even professional uses.
              </p>
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors">
                Try Our AI Image Generator
              </button>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 aspect-video flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="w-24 h-24 bg-gray-700 rounded-lg mx-auto mb-4"></div>
                <p>AI Image Generator with Stunning Results</p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Unleash Your Wildest Creative Ideas With Our Text to Image Generators</h2>
            <p className="text-lg text-gray-300 max-w-4xl mx-auto">
              Instantly create lifelike images across countless themes—cars, girls, cats, fantasy art, and more—with Girl Generator's wide range of powerful text to image generators. Your imagination is the only limit to the stunning, detail-rich visuals you can bring to life.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              'AI Shirt Design Generator',
              'AI Emoji Generator', 
              'AI Cat Generator',
              'AI Word Art Generator',
              'AI Sketch Generator',
              'AI Movie Poster Generator'
            ].map((tool) => (
              <div key={tool} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:bg-gray-800 transition-colors group cursor-pointer">
                <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                  <div className="w-16 h-16 bg-gray-700 rounded-lg"></div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-medium">Use This Tool</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-white">{tool}</h3>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <button className="text-purple-400 hover:text-purple-300 font-medium">
              View More AI Image Generators →
            </button>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">2000+ Custom, Commercial-ready LoRA Models</h2>
              <p className="text-lg text-gray-300 mb-8">
                Explore endless possibilities with Girl Generator's 2000+ unique LoRA models. Generate professional, commercial-ready images that are strikingly real and true to your vision—fast and easy!
              </p>
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors">
                Try Our AI Image Generator
              </button>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 aspect-video flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="w-24 h-24 bg-gray-700 rounded-lg mx-auto mb-4"></div>
                <p>Diverse Image Styles for Every Vision</p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Versatile AI Image Generator, Built for All</h2>
          
          <div className="mb-8">
            <div className="flex justify-center space-x-8">
              <button className="px-6 py-2 bg-purple-600 text-white rounded-lg">Online Influencers</button>
              <button className="px-6 py-2 text-gray-400 hover:text-white">Advertisers</button>
              <button className="px-6 py-2 text-gray-400 hover:text-white">Animators & Game Creators</button>
              <button className="px-6 py-2 text-gray-400 hover:text-white">Creative Artists</button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Online Influencers',
                benefit: 'Increase social engagement by up to 70%',
                description: 'Generate fun and engaging images to share online with just a few clicks. Increase your online posting rate and watch your likes, views, and comments numbers start climbing to the next level.'
              },
              {
                title: 'Advertisers', 
                benefit: 'Boost online sale conversions by at least 40%',
                description: 'Experiment with unique promotional art ideas. Instantly generate eye-catching visuals that entice potential customers to sign up, subscribe, or make purchases on any product or service.'
              },
              {
                title: 'Animators & Game Creators',
                benefit: 'Reduce character design time by around 60%', 
                description: 'Visualize imaginative character designs in minutes. Feel free to experiment with different animated styles, colors, expressions, etc, to create a unique character that stuns audiences.'
              },
              {
                title: 'Creative Artists',
                benefit: 'Reduce creative design block by about 50%',
                description: 'Conceptualize unique and rough art design ideas in a flash. Visualize any imaginative or eccentric idea and use the generated images to stimulate your creative workflow.'
              }
            ].map((item, index) => (
              <div key={index} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="w-12 h-12 bg-purple-600 rounded-lg mb-4"></div>
                <h3 className="font-bold text-white mb-2">{item.benefit}</h3>
                <p className="text-sm text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How Our AI Text to Image Generator Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="font-bold mb-2">Step 1</h3>
              <p className="text-gray-300">Enter your text prompt.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="font-bold mb-2">Step 2</h3>
              <p className="text-gray-300">Generate your image with our advanced image AI.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="font-bold mb-2">Step 3</h3>
              <p className="text-gray-300">Download the generated image and use or share it as you like.</p>
            </div>
          </div>
          
          <div className="text-center">
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors">
              Try Our AI Image Generator
            </button>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Experience the Full Power of Our Other AI Image Generators</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="w-24 h-24 bg-gray-700 rounded-lg mx-auto mb-4"></div>
              <h3 className="font-bold text-white">Image to Image</h3>
            </div>
            
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center hover:bg-gray-800 transition-colors cursor-pointer">
              <div className="w-24 h-24 bg-gray-700 rounded-lg mx-auto mb-4"></div>
              <h3 className="font-bold text-white">Chat to Image</h3>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold mb-6">Discover Our Advanced AI Image Tools</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'Image Inpaint',
                  'AI Clothes Changer', 
                  'AI Product Photo Generator',
                  'AI Plush Pillow Generator',
                  'AI Polaroid Maker',
                  'Ghibli AI Generator',
                  'Image to Prompt Generator',
                  'Cartoon Character Maker'
                ].map((tool) => (
                  <div key={tool} className="text-purple-400 hover:text-purple-300 cursor-pointer text-sm">
                    {tool}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-6">Explore Our Fun AI Photo Effects</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'AI LEGO Minifigure Display Effect',
                  'AI Superhero Comic Strip Generator',
                  'AI Neon Line Art Generator', 
                  'AI 90s Retro Room Filter',
                  'AI Prussian Blue Portrait Generator',
                  'AI Geometric Face Effect',
                  'AI Pixel Dissolve Effect',
                  'AI Mount Rushmore Generator'
                ].map((effect) => (
                  <div key={effect} className="text-purple-400 hover:text-purple-300 cursor-pointer text-sm">
                    {effect}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16 text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-gray-800 rounded-2xl p-12">
            <h2 className="text-3xl font-bold mb-4">Join 10M+ Users Using Girl Generator AI to Create and Inspire</h2>
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors">
              Get Started Now
            </button>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">FAQs</h2>
          
          <div className="space-y-4">
            {[
              'What makes Girl Generator AI image generator stand out?',
              'What kind of images can I create with your image AI generator?',
              'How to use your unique LoRA models for image generation?',
              'Can I use the generated images for commercial purposes?',
              'What image formats are available for download?',
              'Is your text to image generator free to use?'
            ].map((question) => (
              <div key={question} className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between cursor-pointer">
                  <h3 className="font-medium text-white">{question}</h3>
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-gray-800 rounded-2xl p-12">
            <div className="w-24 h-24 bg-gray-700 rounded-lg mx-auto mb-4"></div>
            <h2 className="text-3xl font-bold mb-4">Bringing Your Imagination to Life</h2>
            <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors">
              Try Our AI Image Generator Now
            </button>
          </div>
        </section>
      </div>
      */}
    </div>
  );
}
