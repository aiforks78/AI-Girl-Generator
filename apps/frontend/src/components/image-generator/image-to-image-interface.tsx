"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDownIcon, SparklesIcon, XMarkIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useAppContext } from "@/contexts/app";
import { CREDIT_COSTS, FEATURE_COSTS } from "@/lib/credit-config";
import { MODEL_IDS, MODEL_LABELS } from "@shared/model-ids";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
// Unified viewer via context
import { useViewer } from "@/contexts/viewer-store";
import HistoryList, { type HistoryItem as ContentHistoryItem } from "@/components/content/history-list";
import CurrentTaskCard from "@/components/content/current-task-card";
import ViewToggle from "@/components/common/view-toggle";
import CharacterFilter from "@/components/common/character-filter";
// Enhanced upload components
import { useImageUpload } from "@/hooks/useImageUpload";
import ImageUploadPreview from "./ImageUploadPreview";
import ImageDropZoneEnhanced from "./ImageDropZoneEnhanced";
import type { UploadItem as UploadItemType } from "@/hooks/useImageUpload";
import { buildImageUrl, resolvePublicAssetUrl } from "@/lib/url-utils";
import { apiFetch } from "@/lib/api-client";

const SAMPLE_IMAGE_KEYS = [
  "public/Sample/bed.png",
  "public/Sample/cafa.png",
  "public/Sample/car.png",
  "public/Sample/outdoor.png"
];

// Build CDN URLs directly for sample images to enable browser caching
const buildSampleImageUrl = (key: string): string => {
  const cdnBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (cdnBase) {
    const cleanKey = key.replace(/^\/+/, '');
    return `${cdnBase}/${cleanKey}?fmt=webp&w=768&q=95`;
  }
  return buildImageUrl({ base: resolvePublicAssetUrl(key), preview: true, width: 768, fmt: 'webp', quality: 95, watermark: false });
};

const DEFAULT_SAMPLE_IMAGES = SAMPLE_IMAGE_KEYS.map(buildSampleImageUrl);
const MAX_DYNAMIC_SAMPLE_IMAGES = 8;

const toOptimizedSceneUrl = (rawUrl: string | null | undefined, width = 768, quality = 85): string | null => {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null;
  const clean = rawUrl.split('#')[0];
  if (clean.includes('fmt=webp') && clean.includes('w=')) {
    return clean;
  }
  const delimiter = clean.includes('?') ? '&' : '?';
  return `${clean}${delimiter}w=${width}&fmt=webp&q=${quality}`;
};

type MiniHistoryItem = {
  id: number;
  image_url: string | null;
  prompt: string;
  created_at: string;
  status: string;
  character_id?: string | null;
};

type HistoryEntry = {
  id: number;
  displayUrl: string;
  processUrl: string;
};

type CharacterImageItem = {
  id: number | string;
  job_id: number;
  url: string;
  type?: string;
  character_name?: string;
};

const TASK_HISTORY_PAGE_SIZE = 12;
const CHARACTER_IMAGE_PAGE_SIZE = 12;

const extractCharacterId = (value: unknown): string | null | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (value === null) {
    return null;
  }
  return undefined;
};

const collectCandidateUrls = (item: any): string[] => {
  const seen = new Set<string>();
  const push = (url: unknown) => {
    if (typeof url !== 'string') return;
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
  };

  push(item?.hd_url);
  push(item?.image_url);
  push(item?.raw_image_url);

  if (Array.isArray(item?.image_variants)) {
    for (const variant of item.image_variants) {
      if (typeof variant === 'string') {
        push(variant);
      } else if (variant && typeof variant === 'object' && typeof variant.url === 'string') {
        push(variant.url);
      }
    }
  }

  if (Array.isArray(item?.images)) {
    for (const img of item.images) {
      if (img && typeof img === 'object' && typeof img.url === 'string') {
        push(img.url);
      }
    }
  }

  if (Array.isArray(item?.preview_images)) {
    for (const img of item.preview_images) {
      if (img && typeof img === 'object' && typeof img.url === 'string') {
        push(img.url);
      }
    }
  }

  return Array.from(seen);
};

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB

// validateImageFile moved to useImageUpload hook

// PreviewImage component removed: we upload immediately and use public URLs for previews

export default function ImageToImageInterface() {
  const [prompt, setPrompt] = useState("");
  // Model selection (TTI-style): inline provider | external provider
  const [engine, setEngine] = useState<'inline' | 'replicate'>("inline");
  const [isModelOpen, setIsModelOpen] = useState(false);

  // Handle URL parameters for model selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modelParam = params.get('model');

      if (modelParam) {
        // Map model_id to engine for img2img
        // img2img only supports inline or external providers
        const normalizedParam = modelParam.toLowerCase().replace(/\s+/g, '-');
        if (normalizedParam === 'banana' || normalizedParam === 'nano-banana' || normalizedParam === MODEL_IDS.INLINE_TXT2IMG.toLowerCase()) {
          setEngine('inline');
        } else if (normalizedParam === 'seedream4.0' || normalizedParam === MODEL_IDS.IMG2IMG.toLowerCase()) {
          setEngine('replicate');
        }
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSampleScenes = async () => {
      try {
        const featuredRes = await apiFetch('/gallery/featured', { cache: 'no-store' });
        if (!featuredRes.ok) {
          return;
        }
        const featuredData = await featuredRes.json().catch(() => null);
        const characterList: any[] = Array.isArray(featuredData?.characters) ? featuredData.characters : [];
        if (characterList.length === 0) {
          return;
        }

        const randomCharacter = characterList[Math.floor(Math.random() * characterList.length)];
        const slug = typeof randomCharacter?.slug === 'string' ? randomCharacter.slug : null;
        const name = typeof randomCharacter?.name === 'string' ? randomCharacter.name : null;
        if (!slug) {
          return;
        }

        try {
          const scenesRes = await apiFetch(`/gallery/characters/${encodeURIComponent(slug)}/scenes?page=1&limit=50`, { cache: 'no-store' });
          if (!scenesRes.ok) {
            return;
          }
          const scenesData = await scenesRes.json().catch(() => null);
          const scenesArray: any[] = Array.isArray(scenesData?.scenes) ? scenesData.scenes : [];
          if (scenesArray.length === 0) {
            return;
          }

          const collected = scenesArray
            .filter((scene) => scene?.image_url || scene?.hd_url)
            .map((scene) => toOptimizedSceneUrl(scene?.hd_url || scene?.image_url))
            .filter((url): url is string => typeof url === 'string' && url.length > 0)
            .slice(0, MAX_DYNAMIC_SAMPLE_IMAGES);

          if (!cancelled && collected.length > 0) {
            setSampleImages(collected);
            setSampleCharacter(name || slug);
            setCurrentImageIndex(0);
          }
        } catch (error) {
          console.warn('[img2img] failed to load character scenes', slug, error);
        }
      } catch (error) {
        console.error('[img2img] failed to load sample scenes', error);
      }
    };

    loadSampleScenes();

    return () => {
      cancelled = true;
    };
  }, []);
  
  // Enhanced upload management
  const imageUpload = useImageUpload({
    maxFiles: 4,
    maxSize: 20 * 1024 * 1024, // 20MB
    onUploadComplete: (url) => {
      console.info('[IMG2IMG] Upload completed:', url);
    },
    onUploadError: (error, file) => {
      console.error('[IMG2IMG] Upload failed:', error, file.name);
    },
    onAuthRequired: () => {
      setIsLoginOpen?.(true);
    }
  });
  const [isPublic, setIsPublic] = useState(true);
  // Removed "Generate with AI" feature
  const [isGenerating, setIsGenerating] = useState(false);
  const [containerHeight, setContainerHeight] = useState("calc(100vh - 104px)");
  const [isMdUp, setIsMdUp] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [modalLoaded, setModalLoaded] = useState(false);
  // fileInputRef removed - handled by ImageDropZone
  const [showHistory, setShowHistory] = useState(false);
  const [sampleImages, setSampleImages] = useState<string[]>(DEFAULT_SAMPLE_IMAGES);
  const [sampleCharacter, setSampleCharacter] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [directHistoryUrls, setDirectHistoryUrls] = useState<{displayUrl: string; processUrl: string}[]>([]); // URLs from history, bypass upload
  // Character view state
  const [historyViewMode, setHistoryViewMode] = useState<'character' | 'task'>('task');
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [characterImages, setCharacterImages] = useState<CharacterImageItem[]>([]);
  const [characterImagesPage, setCharacterImagesPage] = useState(1);
  const [characterImagesHasMore, setCharacterImagesHasMore] = useState(false);
  const [characterImagesLoadingMore, setCharacterImagesLoadingMore] = useState(false);
  // Mini "My Generations" feed like text-to-image
  const [myHistoryLoading, setMyHistoryLoading] = useState(false);
  const [myHistoryItems, setMyHistoryItems] = useState<ContentHistoryItem[]>([]);
  const [creatingCharacter, setCreatingCharacter] = useState<Record<number, boolean>>({});
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [pendingCharacterJob, setPendingCharacterJob] = useState<MiniHistoryItem | null>(null);
  const CHARACTER_COST = FEATURE_COSTS?.create_character ?? 10;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState<MiniHistoryItem | null>(null);
  // generation state
  const [jobId, setJobId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [currentJobCharacterId, setCurrentJobCharacterId] = useState<string | null>(null);
  const prettyStatus = (v?: string | null) => {
    const s = String(v || '').toLowerCase();
    if (s.includes('ready') || s.includes('succeeded') || s.includes('completed')) return 'ready';
    if (s.includes('failed') || s.includes('blocked') || s.includes('error')) return 'failed';
    return s || 'pending';
  };
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewVariants, setPreviewVariants] = useState<string[]>([]);
  const [jobPrompt, setJobPrompt] = useState<string>("");
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncedPromptRef = useRef<boolean>(false);
  // Strength control not supported; removed from UI and payload
  const { setIsLoginOpen } = useAppContext();
  const { status: authStatus, user } = useAuth();
  const { openViewer } = useViewer();

  // Credits: used to disable Create when insufficient
  const [availableCredits, setAvailableCredits] = useState<number | null>(null);
  const neededCredits = CREDIT_COSTS[engine === 'inline' ? MODEL_IDS.INLINE_TXT2IMG : MODEL_IDS.IMG2IMG];
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
      try { const val = Number(e?.detail); if (Number.isFinite(val)) setAvailableCredits(val); } catch {}
    };
    try { window.addEventListener('credits:update', onUpdate as any); } catch {}
    return () => { cancelled = true; try { window.removeEventListener('credits:update', onUpdate as any); } catch {} };
  }, [authStatus]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handleMq = (e: MediaQueryListEvent | MediaQueryList) => {
      // Both MediaQueryListEvent and MediaQueryList expose `matches`
      // Cast to simplify TS inference
      const m = (e as MediaQueryList).matches as boolean;
      setIsMdUp(!!m);
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

  useEffect(() => {
    if (!isPreviewOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPreviewOpen]);

  // Reset modal fade state when modal opens or source changes
  useEffect(() => {
    if (!isPreviewOpen) return;
    setModalLoaded(false);
  }, [isPreviewOpen, previewUrl, previewVariants, currentImageIndex]);

  const clearTimers = () => {
    if (previewPollRef.current) clearInterval(previewPollRef.current);
    previewPollRef.current = null;
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  // uploadToR2 function moved to useImageUpload hook

  const fetchMyHistory = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) setMyHistoryLoading(true);
      const r = await apiFetch('/user/generation/history?limit=5&page=1', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const items = Array.isArray(j?.data?.items) ? j.data.items : [];
      setMyHistoryItems(items as ContentHistoryItem[]);
    } finally {
      if (!silent) setMyHistoryLoading(false);
    }
  };

  useEffect(() => { try { fetchMyHistory(); } catch {} }, []);

  const handleCreateCharacter = (job: MiniHistoryItem) => {
    const jobIdNum = Number(job.id);
    if (!Number.isFinite(jobIdNum)) return;
    if (creatingCharacter[jobIdNum]) return;
    const statusLabel = prettyStatus(job.status);
    if (statusLabel !== 'ready') {
      toast.error('This task is not yet complete, cannot create character');
      return;
    }
    setPendingCharacterJob(job);
    setCharacterName('');
    setShowCharacterModal(true);
  };

  const confirmCreateCharacter = async () => {
    if (!pendingCharacterJob) return;
    const jobIdNum = Number(pendingCharacterJob.id);
    if (!Number.isFinite(jobIdNum)) return;

    const name = characterName.replace(/\s+/g, ' ').trim();
    if (!name) {
      toast.error('Name cannot be empty');
      return;
    }
    if (!/^[A-Za-z0-9 ]{1,64}$/.test(name)) {
      toast.error('Name can only contain English letters, numbers and spaces, up to 64 characters');
      return;
    }

    setShowCharacterModal(false);
    setCreatingCharacter((prev) => ({ ...prev, [jobIdNum]: true }));

    try {
      const res = await apiFetch('/user/character/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobIdNum, name })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        const message = data?.error?.message || 'Failed to create character, please try again later';
        throw new Error(message);
      }

      toast.success('Character created successfully');
      const characterId = data?.data?.character_id ?? 'created';
      setMyHistoryItems((prev) => prev.map((item) => (
        Number(item.id) === jobIdNum
          ? ({ ...item, character_id: characterId } as ContentHistoryItem)
          : item
      )));
      if (jobId === jobIdNum) {
        setCurrentJobCharacterId(characterId);
      }
      try { fetchMyHistory({ silent: true }); } catch {}
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create character, please try again later';
      toast.error(message);
    } finally {
      setCreatingCharacter((prev) => {
        const next = { ...prev };
        delete next[jobIdNum];
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
    if (pendingDeleteJob && deleting[Number(pendingDeleteJob.id)]) return;
    setShowDeleteModal(false);
    setPendingDeleteJob(null);
  };

  const deleteJob = async (jobIdNum: number) => {
    if (!Number.isFinite(jobIdNum)) return false;
    if (deleting[jobIdNum]) return false;
    setDeleting((prev) => ({ ...prev, [jobIdNum]: true }));
    try { window.dispatchEvent(new CustomEvent('global:loading', { detail: true })); } catch {}
    try {
      const res = await apiFetch('/user/generation/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobIdNum })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j?.error?.message || 'Delete failed');
        return false;
      }

      toast.success('Deleted');
      clearTimers();
      setMyHistoryItems((prev) => prev.filter((item) => Number(item.id) !== jobIdNum));
      setHistoryItems((prev) => prev.filter((item) => Number(item.id) !== jobIdNum));
      if (jobId === jobIdNum) {
        setJobId(null);
        setStatus('');
        setErrorReason(null);
        setPreviewUrl(null);
        setPreviewVariants([]);
        setJobPrompt('');
        setIsGenerating(false);
        setCurrentJobCharacterId(null);
      }
      try { fetchMyHistory({ silent: true }); } catch {}
      return true;
    } catch (error) {
      console.error('[ImageToImage] deleteJob failed', error);
      toast.error('Delete failed');
      return false;
    } finally {
      setDeleting((prev) => {
        const next = { ...prev };
        delete next[jobIdNum];
        return next;
      });
      try { window.dispatchEvent(new CustomEvent('global:loading', { detail: false })); } catch {}
    }
  };

const confirmDelete = async () => {
  if (!pendingDeleteJob) return;
  const jobIdNum = Number(pendingDeleteJob.id);
  if (!Number.isFinite(jobIdNum)) return;
  const success = await deleteJob(jobIdNum);
  if (success) {
    setShowDeleteModal(false);
    setPendingDeleteJob(null);
  }
};

  const mapHistoryEntries = useCallback((list: any[]): HistoryEntry[] => {
    return list
      .map((it: any) => {
        const urls = collectCandidateUrls(it);
        if (!Array.isArray(urls) || urls.length === 0) {
          return null;
        }
        const primary = urls[0];
        const processCandidate = typeof it?.raw_image_url === 'string' && it.raw_image_url.trim()
          ? it.raw_image_url.trim()
          : primary;
        const id = Number(it?.id);
        if (!Number.isFinite(id)) {
          return null;
        }
        return { id, displayUrl: primary, processUrl: processCandidate } as HistoryEntry;
      })
      .filter((entry): entry is HistoryEntry => Boolean(entry?.displayUrl && entry?.processUrl));
  }, []);

  const loadTaskHistoryPage = useCallback(async (page: number, append: boolean) => {
    if (append) {
      setHistoryLoadingMore(true);
    }
    try {
      const response = await apiFetch(`/user/generation/history?limit=${TASK_HISTORY_PAGE_SIZE}&page=${page}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        if (!append) {
          setHistoryItems([]);
          setHistoryHasMore(false);
          setHistoryPage(1);
        }
        return;
      }
      const payload = await response.json().catch(() => null);
      const list = Array.isArray(payload?.data?.items) ? payload.data.items : [];
      const entries = mapHistoryEntries(list);

      setHistoryItems((prev) => {
        if (!append) {
          return entries;
        }
        const existing = new Map<number, HistoryEntry>();
        for (const item of prev) {
          existing.set(item.id, item);
        }
        for (const entry of entries) {
          if (!existing.has(entry.id)) {
            existing.set(entry.id, entry);
          }
        }
        return Array.from(existing.values());
      });

      const pagination = payload?.data?.pagination;
      const hasMore = pagination ? Boolean(pagination.has_next) : entries.length === TASK_HISTORY_PAGE_SIZE;
      setHistoryHasMore(hasMore);
      setHistoryPage(page);
    } catch (error) {
      console.error('[ImageToImage] loadTaskHistoryPage failed', error);
      if (!append) {
        setHistoryItems([]);
        setHistoryHasMore(false);
        setHistoryPage(1);
      }
    } finally {
      if (append) {
        setHistoryLoadingMore(false);
      }
    }
  }, [mapHistoryEntries]);

  const loadCharacterImages = async (characterId: string, page: number, append: boolean) => {
    if (append) {
      setCharacterImagesLoadingMore(true);
    }
    const limit = CHARACTER_IMAGE_PAGE_SIZE;
    const offset = (page - 1) * limit;
    try {
      const res = await apiFetch(`/user/characters/${characterId}/images?limit=${limit}&offset=${offset}`, {
        cache: 'no-store'
      });
      if (!res.ok) {
        if (!append) {
          setCharacterImages([]);
          setCharacterImagesHasMore(false);
          setCharacterImagesPage(1);
        }
        return;
      }
      const data = await res.json().catch(() => null);
      const items = Array.isArray(data?.items) ? data.items : [];

      setCharacterImages((prev) => {
        const base: CharacterImageItem[] = append ? [...prev] : [];
        const seen = new Set(base.map((img) => `${img.job_id}:${img.url}`));
        for (const item of items) {
          const jobId = Number(item?.job_id);
          const url = typeof item?.url === 'string' ? item.url.trim() : '';
          if (!url || !Number.isFinite(jobId)) continue;
          const key = `${jobId}:${url}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const rawId = Number(item?.id);
          const identifier = Number.isFinite(rawId) ? rawId : key;
          base.push({
            id: identifier,
            job_id: jobId,
            url,
            type: typeof item?.type === 'string' ? item.type : undefined,
            character_name: typeof item?.character_name === 'string' ? item.character_name : undefined
          });
        }
        return base;
      });

      const pagination = data?.pagination;
      const hasMore = pagination ? Boolean(pagination.has_more) : items.length === limit;
      setCharacterImagesHasMore(hasMore);
      setCharacterImagesPage(page);
    } catch (error) {
      console.error('[ImageToImage] loadCharacterImages failed', error);
      if (!append) {
        setCharacterImages([]);
        setCharacterImagesHasMore(false);
        setCharacterImagesPage(1);
      }
    } finally {
      if (append) {
        setCharacterImagesLoadingMore(false);
      }
    }
  };

  const handleLoadMoreHistory = async () => {
    if (historyLoadingMore || !historyHasMore) return;
    await loadTaskHistoryPage(historyPage + 1, true);
  };

  const handleLoadMoreCharacterImages = async () => {
    if (!selectedCharacter || characterImagesLoadingMore || !characterImagesHasMore) return;
    await loadCharacterImages(selectedCharacter, characterImagesPage + 1, true);
  };

  const openHistory = async () => {
    if (authStatus !== 'authenticated') {
      try { setIsLoginOpen?.(true); } catch {}
      return;
    }
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryItems([]);
    setHistoryPage(1);
    setHistoryHasMore(false);
    setHistoryLoadingMore(false);
    setDirectHistoryUrls([]);
    setCharacters([]);
    setCharacterImages([]);
    setCharacterImagesPage(1);
    setCharacterImagesHasMore(false);
    setCharacterImagesLoadingMore(false);

    let initializedViaCharacters = false;

    try {
      const charRes = await apiFetch('/user/characters', { cache: 'no-store' });
      let charList: any[] = [];
      if (charRes.ok) {
        const charData = await charRes.json();
        charList = Array.isArray(charData?.items) ? charData.items : [];
        setCharacters(charList);
      }

      if (charList.length > 0) {
        initializedViaCharacters = true;
        setHistoryViewMode('character');
        setSelectedCharacter((prev) => {
          if (prev && charList.some((c: any) => c.id === prev)) {
            return prev;
          }
          return charList[0]?.id ?? null;
        });
      } else {
        setHistoryViewMode('task');
        await loadTaskHistoryPage(1, false);
      }
    } catch (error) {
      console.error('[ImageToImage] openHistory failed', error);
    } finally {
      if (!initializedViaCharacters) {
        setHistoryLoading(false);
      }
    }
  };

  // Fetch character images when character is selected
  useEffect(() => {
    if (!selectedCharacter || historyViewMode !== 'character') return;

    let cancelled = false;
    const run = async () => {
      setHistoryLoading(true);
      setCharacterImages([]);
      setCharacterImagesHasMore(false);
      setCharacterImagesPage(1);
      await loadCharacterImages(selectedCharacter, 1, false);
      if (!cancelled) {
        setHistoryLoading(false);
      }
    };

    run().catch((error) => {
      console.error('[ImageToImage] fetchCharacterImages failed', error);
      if (!cancelled) {
        setHistoryLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCharacter, historyViewMode]);

  useEffect(() => {
    if (historyViewMode !== 'character') {
      setCharacterImages([]);
      setCharacterImagesHasMore(false);
      setCharacterImagesPage(1);
      setCharacterImagesLoadingMore(false);
      return;
    }
    if (characters.length === 0) {
      setSelectedCharacter(null);
      setCharacterImages([]);
      setCharacterImagesHasMore(false);
      setCharacterImagesPage(1);
      return;
    }
    setSelectedCharacter((prev) => {
      if (prev && characters.some((c: any) => c.id === prev)) {
        return prev;
      }
      return characters[0]?.id ?? null;
    });
  }, [historyViewMode, characters]);

  useEffect(() => {
    if (!isHistoryOpen) return;
    if (historyViewMode !== 'task') return;
    if (historyItems.length > 0) return;

    let cancelled = false;
    const run = async () => {
      setHistoryLoading(true);
      await loadTaskHistoryPage(1, false);
      if (!cancelled) {
        setHistoryLoading(false);
      }
    };

    run().catch((error) => {
      console.error('[ImageToImage] load task history on demand failed', error);
      if (!cancelled) {
        setHistoryLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [historyViewMode, isHistoryOpen, historyItems.length, loadTaskHistoryPage]);

  // Canonicalize URL for dedup (ignore queries like raw/preview)
const closeHistoryModal = () => {
  setIsHistoryOpen(false);
  setHistoryViewMode('task');
  setSelectedCharacter(null);
  setHistoryItems([]);
  setHistoryPage(1);
  setHistoryHasMore(false);
  setHistoryLoading(false);
  setHistoryLoadingMore(false);
  setDirectHistoryUrls([]);
  setCharacterImages([]);
  setCharacterImagesPage(1);
  setCharacterImagesHasMore(false);
  setCharacterImagesLoadingMore(false);
};

  const canonicalize = (u: string) => {
    try {
      const x = new URL(u);
      return `${x.origin}${x.pathname}`;
    } catch {
      return String(u || '').split('?')[0];
    }
  };

  const addHistoryImage = async (entry: { displayUrl: string; processUrl: string }) => {
    try {
      const totalImages = imageUpload.stats.success + directHistoryUrls.length;
      if (totalImages >= 4) {
        toast.warning('Maximum number of images reached');
        return;
      }

      // Normalize for dedup (remove query) and add raw=1 for model quality
      const baseCanon = canonicalize(entry.processUrl);
      const existingCanon = new Set<string>();
      try {
        imageUpload.getSuccessfulUrls().forEach(u => existingCanon.add(canonicalize(u)));
      } catch {}
      directHistoryUrls.forEach(item => existingCanon.add(canonicalize(item.processUrl)));
      if (existingCanon.has(baseCanon)) {
        toast.info('This image is already added');
        return;
      }

      // Generate two URLs: one for display (with watermark), one for processing (without watermark)
      const displayUrl = buildImageUrl({
        base: entry.displayUrl,
        preview: true,
        width: 1024,
        fmt: 'webp',
        quality: 90,
        watermark: true
      });

      const processUrl = entry.processUrl;

      setDirectHistoryUrls(prev => [...prev, { displayUrl, processUrl }]);
      toast.success('Image added from history');
      console.log('[IMG2IMG] addHistoryImage', { displayUrl, processUrl });
    } catch (error) {
      toast.error('Failed to add image from history');
      console.error('[IMG2IMG][addHistoryImage] error:', error);
    } finally {
      setIsHistoryOpen(false);
    }
  };

  // File input reset no longer needed - handled by ImageDropZone

  const pollPreviewStatus = (jid: number) => {
    if (previewPollRef.current) clearInterval(previewPollRef.current);
    let ticks = 0;
    previewPollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/generation/status?job_id=${jid}`);
        if (!res.ok) {
          setIsGenerating(false);
          if (previewPollRef.current) clearInterval(previewPollRef.current);
          previewPollRef.current = null;
          return;
        }
        if (res.status === 401) { try { setIsLoginOpen?.(true); } catch {}; return; }
        const data = await res.json();
        const job = data && typeof data === 'object' ? (data.job && typeof data.job === 'object' ? data.job : data) : null;
        const statusVal = job?.status ? String(job.status) : '';
        setStatus((prev) => prev === statusVal ? prev : statusVal);
        // One-time sync of enhanced prompt from generation/status
        if (!syncedPromptRef.current) {
          try {
            try { const { debugStatusFetch } = await import('@/lib/debug-status'); debugStatusFetch(jid, 'img2img:prompt-sync'); } catch {}
            const { fetchStatus } = await import('@/lib/status-fetcher');
            const j2 = await fetchStatus(jid, 'img2img:prompt-sync') as any;
            if (j2) {
              const p = j2?.job?.prompt_enhanced || j2?.job?.prompt;
              if (typeof p === 'string' && p.trim()) {
                setJobPrompt((prev) => prev === String(p) ? prev : String(p));
                syncedPromptRef.current = true;
              }
            }
          } catch {}
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
        const purl = job && (((job as any).image_url) || (job as any).hd_url) || null;
        if (purl) setPreviewUrl((prev) => prev === purl ? prev : purl);
        const variantsSource = job && (Array.isArray((job as any).images) ? (job as any).images.map((img: any) => typeof img?.url === 'string' ? img.url : null).filter(Boolean) : (job as any).image_variants);
        if (Array.isArray(variantsSource)) {
          const vars = variantsSource as string[];
          setPreviewVariants((prev) => {
            const sameLen = prev.length === vars.length;
            const same = sameLen && prev.every((v, i) => v === vars[i]);
            return same ? prev : vars;
          });
        }
        const isDone = purl || /(img2img_ready|hd_ready|ready|completed|succeeded)/i.test(statusVal);
        if (isDone) {
          setIsGenerating(false);
          try { fetchMyHistory({ silent: true }); } catch {}
          if (previewPollRef.current) clearInterval(previewPollRef.current);
          previewPollRef.current = null;
        }
        if (/\b(blocked|failed|error)\b/i.test(statusVal)) {
          setIsGenerating(false);
          // Try to fetch detailed error reason from status API
          try {
            try { const { debugStatusFetch } = await import('@/lib/debug-status'); debugStatusFetch(jid, 'img2img:error-sync'); } catch {}
            const { fetchStatus } = await import('@/lib/status-fetcher');
            const j3 = await fetchStatus(jid, 'img2img:error-sync') as any;
            if (j3) {
              const em = j3?.job?.error_message;
              if (typeof em === 'string' && em.trim()) setErrorReason(String(em));
            }
          } catch {}
          if (previewPollRef.current) clearInterval(previewPollRef.current);
          previewPollRef.current = null;
        }
        ticks += 1;
        if (ticks >= 60) { setIsGenerating(false); if (previewPollRef.current) clearInterval(previewPollRef.current); previewPollRef.current = null; } // 60 * 5s = 5 minutes
      } catch (e) {
        setIsGenerating(false);
        if (previewPollRef.current) clearInterval(previewPollRef.current);
        previewPollRef.current = null;
      }
    }, 5000);
  };

  // HD polling removed

  const handleGenerate = async () => {
    // Combine uploaded URLs and direct history URLs (use processUrl for API)
    const uploadedUrls = imageUpload.getSuccessfulUrls();
    const historyProcessUrls = directHistoryUrls.map(item => item.processUrl);
    const allUrls = [...uploadedUrls, ...historyProcessUrls];
    if (allUrls.length === 0) return;
    
    try {
      // Clear any previous pollers before starting
      clearTimers();
      setIsGenerating(true);
      setStatus("pending");
      setPreviewUrl(null);
      setPreviewVariants([]);
      setJobId(null);
      setCurrentJobCharacterId(null);
      setErrorReason(null);

      // Use uploaded public URLs and direct history URLs
      const urls: string[] = allUrls.slice(0, 4);
      if (urls.length === 0) { setIsGenerating(false); return; }

      // Use raw prompt for image-to-image (no translation helpers)
      const finalPrompt = prompt;

      // Immediately switch panel and show a pending card with the final prompt
      setShowHistory(true);
      setJobPrompt(finalPrompt);

      // Call unified image API with img2img mode
      const payload = {
        model_id: engine === 'inline' ? MODEL_IDS.INLINE_TXT2IMG : MODEL_IDS.IMG2IMG,
        mode: "img2img",
        prompt: finalPrompt,
        init_images: urls,
      } as const;
      try { console.info('[IMG2IMG][request]', payload); } catch {}
        const res = await apiFetch("/generation/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      if (res.status === 401) { try { setIsLoginOpen?.(true); } catch {}; setIsGenerating(false); setShowHistory(false); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const message = err?.message || err?.error?.message || err?.error || '';
          const retryAfter = err?.retry_after ? ` (retry in ${err.retry_after}s)` : '';
          const desc = message ? String(message) + retryAfter : 'You\'re making requests too quickly. Please wait a moment and try again.';
          toast.error('Request Limit', { description: desc });
        } else {
          const msg = err?.error?.message || err?.message || 'Failed to start generation';
          toast.error(msg);
          // Keep the panel open and show failure reason so user understands why
          setStatus('failed');
          const detail = err?.error?.message || err?.message || err?.error || '';
          if (detail) setErrorReason(String(detail));
          setShowHistory(true);
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
          setStatus('ready');
          try { fetchMyHistory({ silent: true }); } catch {}
          pollPreviewStatus(duplicateId);
          try { toast.info('Reused recent image-to-image result.'); } catch {}
          return;
        }
      }
      if (!res.ok || !data?.job_id) {
        try {
          if (typeof data?.credits_remaining !== 'undefined') {
            window.dispatchEvent(new CustomEvent('credits:update', { detail: data.credits_remaining }));
          }
        } catch {}
        setIsGenerating(false);
        setShowHistory(false);
        return;
      }
      const jid = Number(data.job_id);
      setJobId(jid);
      const jobCharacterId = extractCharacterId(data?.character_id);
      setCurrentJobCharacterId(jobCharacterId ?? null);
      pollPreviewStatus(jid);
    } catch (e) {
      setIsGenerating(false);
      setShowHistory(true);
      setStatus('failed');
    }
  };

  // HD upgrade removed in unified flow

  // Legacy upload handlers removed - now handled by ImageDropZone and useImageUpload


  const nextImage = () => {
    setCurrentImageIndex((prev) => {
      if (sampleImages.length === 0) return 0;
      return (prev + 1) % sampleImages.length;
    });
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => {
      if (sampleImages.length === 0) return 0;
      return (prev - 1 + sampleImages.length) % sampleImages.length;
    });
  };

  // Auto carousel functionality - 5 seconds
  useEffect(() => {
    if (sampleImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => {
        if (sampleImages.length === 0) return 0;
        return (prev + 1) % sampleImages.length;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [sampleImages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showProModal, setShowProModal] = useState(false);
  const handleTogglePublic = async () => {
    if (isPublic) {
      if (authStatus !== 'authenticated') { try { setIsLoginOpen?.(true); } catch {}; return; }
      try {
        const uid = user?.id;
        if (!uid) { try { setIsLoginOpen?.(true); } catch {}; return; }
        const res = await apiFetch('/user/check_pro_status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid })
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.isPro) { setIsPublic(false); }
        else { setShowProModal(true); setIsPublic(true); }
      } catch {
        setShowProModal(true); setIsPublic(true);
      }
    } else {
      setIsPublic(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-[72px]">

      {/* Main Content */}
      <div
        className="flex flex-col md:flex-row gap-4 p-4"
        style={{ height: isMdUp ? containerHeight : undefined }}
      >
        {/* Left Panel - Generation Controls */}
        <div
          className="w-full bg-gray-900 border border-gray-800 rounded-xl h-auto md:h-full relative flex flex-col"
          style={{ flex: '0 1 450px', maxWidth: '450px', minWidth: '350px', width: '100%' }}
        >
          {/* Main Content Area - Scrollable */}
          {/* Increase bottom padding to ensure selects are not hidden behind sticky footer */}
          <div className="flex-1 overflow-y-auto p-6 pb-56">
            <div className="mb-6">
              <h1 className="text-1xl font-bold text-white mb-2">Image to Image</h1>
              <p className="text-sm text-white/60">Transform existing images with AI-powered style transfer and variations</p>
            </div>
          
            {/* Model Select (TTI-style) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
              <div className="mb-2 relative">
                <button
                  type="button"
                  onClick={() => setIsModelOpen(v => !v)}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-600/40 to-blue-600/40 p-[1px] hover:from-purple-600/60 hover:to-blue-600/60 transition"
                  aria-expanded={isModelOpen}
                >
                  <div className="flex items-center justify-between rounded-2xl bg-[#0b1220] px-4 py-4">
                    <div className="text-white text-base md:text-[15px] font-medium">
                      {engine === 'replicate' ? MODEL_LABELS[MODEL_IDS.IMG2IMG] : MODEL_LABELS[MODEL_IDS.INLINE_TXT2IMG]}
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isModelOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isModelOpen && (
                  <div className="absolute z-50 mt-2 w-full rounded-2xl bg-[#0b1220] border border-gray-800 shadow-2xl overflow-hidden" role="listbox">
                    {/* Banana */}
                    <div
                      onClick={() => { setEngine('inline'); setIsModelOpen(false); }}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition ${engine==='inline' ? 'bg-white/5' : ''}`}
                      role="option" aria-selected={engine==='inline'}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border ${engine==='inline' ? 'border-purple-400' : 'border-gray-600'} flex items-center justify-center`}>
                          {engine==='inline' && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">{MODEL_LABELS[MODEL_IDS.INLINE_TXT2IMG]}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">Recommended</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">Faster image-to-image engine for style transfer and quick tries.</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300/90">
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md"><ClockIcon className="w-3.5 h-3.5"/> ~60 sec</span>
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md">{CREDIT_COSTS[MODEL_IDS.INLINE_TXT2IMG]} credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Replicate provider option */}
                    <div
                      onClick={() => { setEngine('replicate'); setIsModelOpen(false); }}
                      className={`p-4 cursor-pointer hover:bg-white/5 transition ${engine==='replicate' ? 'bg-white/5' : ''}`}
                      role="option" aria-selected={engine==='replicate'}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-4 h-4 rounded-full border ${engine==='replicate' ? 'border-purple-400' : 'border-gray-600'} flex items-center justify-center`}>
                          {engine==='replicate' && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{MODEL_LABELS[MODEL_IDS.IMG2IMG]}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Alt</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">More realistic details for high-quality image-to-image.</div>
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-300/90">
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md"><ClockIcon className="w-3.5 h-3.5"/> ~60 sec</span>
                            <span className="inline-flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md">{CREDIT_COSTS[MODEL_IDS.IMG2IMG]} credits</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Images Upload */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Images
                  </label>
                  <span className="text-xs text-gray-400">{imageUpload.stats.success + directHistoryUrls.length}/{4}</span>
                </div>
                <button 
                  type="button" 
                  className="text-xs text-white/70 hover:text-white" 
                  onClick={openHistory}
                >
                  Browse history
                </button>
              </div>

              {(imageUpload.stats.total === 0 && directHistoryUrls.length === 0) ? (
                /* Enhanced drop zone when no images */
                <ImageDropZoneEnhanced
                  onFilesSelected={(files) => {
                    const used = imageUpload.stats.success + directHistoryUrls.length;
                    const remaining = Math.max(0, 4 - used);
                    if (remaining <= 0) { toast.warning('Maximum 4 images'); return; }
                    const toAdd = files.slice(0, remaining);
                    if (toAdd.length < files.length) {
                      toast.warning(`Only added ${toAdd.length} files (max 4 total)`);
                    }
                    imageUpload.addFiles(toAdd);
                  }}
                  maxFiles={4}
                  currentCount={imageUpload.stats.success + directHistoryUrls.length}
                  maxSizeBytes={20 * 1024 * 1024}
                  compact
                  disabled={isGenerating}
                />
              ) : (
                /* Compact grid with thumbnails + add tile */
                <div className="space-y-3">
                  {(() => {
                    // Merge upload items with history selections into a single preview list (use displayUrl for preview)
                    const historyItems: UploadItemType[] = directHistoryUrls.map((item, idx) => {
                      try {
                        const f = new File([], `history-${idx + 1}.jpg`, { type: 'image/jpeg' });
                        return { id: `hist:${item.processUrl}`, file: f, url: item.displayUrl, status: 'success', progress: 100, retryCount: 0 } as UploadItemType;
                      } catch {
                        return { id: `hist:${item.processUrl}`, file: { name: `history-${idx + 1}.jpg`, size: 0, type: 'image/jpeg' } as any, url: item.displayUrl, status: 'success', progress: 100, retryCount: 0 } as UploadItemType;
                      }
                    });
                    const combined: UploadItemType[] = [...imageUpload.uploadItems, ...historyItems];
                    const handleRemove = (itemId: string) => {
                      if (itemId.startsWith('hist:')) {
                        const processUrl = itemId.slice(5);
                        setDirectHistoryUrls(prev => prev.filter(item => item.processUrl !== processUrl));
                        return;
                      }
                      imageUpload.removeItem(itemId);
                    };
                    const handleAddFiles = (files: File[]) => {
                      const used = imageUpload.stats.success + directHistoryUrls.length;
                      const remaining = Math.max(0, 4 - used);
                      if (remaining <= 0) { toast.warning('Maximum 4 images'); return; }
                      const toAdd = files.slice(0, remaining);
                      if (toAdd.length < files.length) {
                        toast.warning(`Only added ${toAdd.length} files (max 4 total)`);
                      }
                      imageUpload.addFiles(toAdd);
                    };
                    return (
                      <ImageUploadPreview
                        uploadItems={combined}
                        onRetry={imageUpload.retryUpload}
                        onRemove={handleRemove}
                        onAddFiles={handleAddFiles}
                        maxFiles={4}
                        compact
                      />
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Strength control removed (not supported) */}

            {/* Prompt Input */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-300">Prompt</label>
              </div>
              <div className="relative">
                <textarea
                  className="w-full p-4 bg-[#111827] border border-gray-700 rounded-xl text-white text-sm placeholder:text-sm resize-none h-36 focus:ring-0 focus:border-gray-600 focus:outline-none outline-none placeholder-gray-500"
                  placeholder="Describe what you want to create..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={2000}
                />
                <div className="absolute right-4 bottom-4 text-xs text-gray-500 pointer-events-none">{prompt.length} / 2000</div>
              </div>
            </div>
          </div>

          {/* Fixed Bottom Area */}
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

              {/* Credits */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Credits required: <span className="text-white font-medium">{neededCredits}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={(imageUpload.stats.success + directHistoryUrls.length) === 0 || isGenerating || imageUpload.stats.isUploading || (authStatus === 'authenticated' && availableCredits !== null && availableCredits < neededCredits)}
                  className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${
                    (imageUpload.stats.success + directHistoryUrls.length === 0) || (authStatus === 'authenticated' && availableCredits !== null && availableCredits < neededCredits)
                      ? 'bg-gray-700 text-white/70 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  <SparklesIcon className="w-4 h-4" />
                  {isGenerating ? "Creating..." : imageUpload.stats.isUploading ? "Uploading..." : "Create"}
                </button>
              </div>
            </div>
          </div>

          {/* History Modal */}
          {isHistoryOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={closeHistoryModal}>
              <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0b1220] text-white rounded-2xl border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div className="text-sm text-white/80">Select from your history</div>
                  <button onClick={closeHistoryModal} className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4 space-y-4 overflow-auto" style={{ maxHeight: 'calc(85vh - 56px)' }}>
                  {/* View Toggle */}
                  <ViewToggle value={historyViewMode} onChange={setHistoryViewMode} size="sm" />

                  {historyViewMode === 'character' ? (
                    <>
                      {/* Character Filter */}
                      <CharacterFilter
                        characters={characters.map(c => ({ id: c.id, name: c.name, image_count: c.image_count }))}
                        value={selectedCharacter}
                        onChange={setSelectedCharacter}
                      />

                      {/* Character Images Grid */}
                      {historyLoading ? (
                        <div className="text-center text-white/60 py-10">Loading…</div>
                      ) : (() => {
                        // Determine images to show
                        let imagesToShow: Array<{ id: string; job_id: number; url: string; character_name?: string }> = [];
                        if (selectedCharacter) {
                          imagesToShow = characterImages.map((img, idx) => ({
                            id: `${img.job_id}-${img.id ?? idx}`,
                            job_id: img.job_id,
                            url: img.url,
                            character_name: img.character_name
                          }));
                        } else {
                          imagesToShow = characters.flatMap((c: any) =>
                            (c.preview_images || []).map((img: any, idx: number) => ({
                              id: `${c.id}-${img.job_id}-${idx}`,
                              job_id: img.job_id,
                              url: img.url,
                              character_name: c.name
                            }))
                          );
                        }

                        imagesToShow = imagesToShow.filter((img) => img.url);

                        if (imagesToShow.length === 0) {
                          return <div className="text-center text-white/60 py-10">No images found</div>;
                        }

                        return (
                          <>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                              {imagesToShow.map((img) => (
                                <button
                                  key={img.id}
                                  className="relative group border border-white/10 rounded-lg overflow-hidden hover:border-white/20"
                                  onClick={() => {
                                    addHistoryImage({
                                      displayUrl: img.url,
                                      processUrl: img.url
                                    });
                                    setIsHistoryOpen(false);
                                  }}
                                >
                                  <img
                                    src={buildImageUrl({ base: img.url, preview: true, width: 256, fmt: 'webp', quality: 75 })}
                                    alt={img.character_name ? `${img.character_name} image` : 'Character image'}
                                    className="w-full h-32 object-cover"
                                  />
                                  {img.character_name && !selectedCharacter && (
                                    <div className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/70 text-white border border-white/20">
                                      {img.character_name}
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20" />
                                </button>
                              ))}
                            </div>
                            {selectedCharacter && characterImagesHasMore && (
                              <div className="mt-4 flex justify-center">
                                <button
                                  onClick={handleLoadMoreCharacterImages}
                                  disabled={characterImagesLoadingMore}
                                  className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {characterImagesLoadingMore ? 'Loading…' : 'Load more'}
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <>
                      {/* Task View - Original */}
                      {historyLoading ? (
                        <div className="text-center text-white/60 py-10">Loading…</div>
                      ) : historyItems.length === 0 ? (
                        <div className="text-center text-white/60 py-10">No history found</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                            {historyItems.map(it => (
                              <button key={it.id} className="relative group border border-white/10 rounded-lg overflow-hidden hover:border-white/20" onClick={() => addHistoryImage(it)}>
                                <img
                                  src={buildImageUrl({ base: it.displayUrl, preview: true, width: 256, fmt: 'webp', quality: 75 })}
                                  alt={`Job ${it.id}`}
                                  className="w-full h-32 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20" />
                              </button>
                            ))}
                          </div>
                          {historyHasMore && (
                            <div className="mt-4 flex justify-center">
                              <button
                                onClick={handleLoadMoreHistory}
                                disabled={historyLoadingMore}
                                className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {historyLoadingMore ? 'Loading…' : 'Load more'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Right Panel - Image Preview */}
        <div className="flex-1 w-full md:w-auto md:mt-0 mt-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl h-full flex flex-col overflow-hidden">
            <div className="px-6 pt-6 pb-3">
              <h2 className="text-1xl font-bold text-white">{showHistory ? 'My Generations' : ((previewUrl || previewVariants.length > 0) ? 'Result' : 'Sample')}</h2>
            </div>
            {!showHistory ? (
              <div className="p-6 flex-1 min-h-0 flex flex-col">
                <div className="relative flex-1 min-h-[240px] sm:min-h-[300px] lg:min-h-[340px] bg-[#111827] rounded-2xl overflow-hidden border border-gray-700">
                  {previewUrl || previewVariants.length > 0 ? (
                    <img
                      src={previewUrl || previewVariants[0]}
                      alt="Generated image"
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => { if (jobId) { openViewer(Number(jobId)); } else { setIsPreviewOpen(true); } }}
                    />
                  ) : (
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
                      {sampleCharacter && (
                        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 text-white text-xs tracking-wide uppercase">
                          {sampleCharacter}
                        </div>
                      )}
                      <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"><ChevronDownIcon className="w-5 h-5 text-white rotate-90"/></button>
                      <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center"><ChevronDownIcon className="w-5 h-5 text-white -rotate-90"/></button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {sampleImages.map((_, index) => (
                          <button key={index} onClick={() => setCurrentImageIndex(index)} className={`w-2 h-2 rounded-full ${index===currentImageIndex?'bg-white':'bg-white/50'}`}/>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                <div className="space-y-4">
                  {(isGenerating || jobId || prettyStatus(status) === 'failed') && (
                    <div className="mb-4">
                      <CurrentTaskCard
                        tool="Image to Image"
                        model={engine === 'replicate' ? MODEL_LABELS[MODEL_IDS.IMG2IMG] : MODEL_LABELS[MODEL_IDS.INLINE_TXT2IMG]}
                        createdAt={new Date()}
                        statusText={prettyStatus(status)}
                        failureReason={errorReason || undefined}
                        prompt={jobPrompt || prompt || '—'}
                        kind="image"
                        imageThumbs={(() => {
                          const variants = Array.isArray(previewVariants) ? previewVariants.filter(Boolean) : [];
                          const ready = variants.length > 0 ? variants : (previewUrl ? [String(previewUrl)] : []);
                          return ready;
                        })()}
                        onOpen={() => { if (jobId) { openViewer(Number(jobId)); } }}
                        renderActions={() => {
                          if (!jobId) return null;
                          const statusLabel = prettyStatus(status);
                          const job: MiniHistoryItem = {
                            id: jobId,
                            image_url: previewUrl,
                            prompt: jobPrompt || prompt || '',
                            created_at: new Date().toISOString(),
                            status,
                            character_id: currentJobCharacterId ?? null
                          };
                          const actions: React.ReactNode[] = [];

                          if (statusLabel === 'ready' && !job.character_id) {
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

                          if (statusLabel === 'ready' || statusLabel === 'failed') {
                            actions.push(
                              <button
                                key="delete"
                                onClick={(e) => { e.stopPropagation?.(); openDeleteConfirm(job); }}
                                disabled={!!deleting[jobId]}
                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deleting[jobId] ? 'Deleting…' : 'Delete'}
                              </button>
                            );
                          }

                          if (!actions.length) return null;
                          return <>{actions}</>;
                        }}
                      />
                    </div>
                  )}
                  {myHistoryLoading ? (
                    <div className="text-center text-white/60 py-10">Loading history…</div>
                  ) : myHistoryItems.length === 0 ? (
                    <div className="text-center text-white/60 py-10">No history yet</div>
                  ) : (
                    <>
                      <HistoryList
                        items={myHistoryItems.filter((it) => Number(it?.id) !== (jobId ?? NaN))}
                        onOpen={(it) => { openViewer(Number((it as any).id)); }}
                        renderActions={(it: any) => {
                          const jobIdNum = Number(it?.id);
                          if (!Number.isFinite(jobIdNum)) return null;
                          const normalizedItem: MiniHistoryItem = {
                            id: jobIdNum,
                            image_url: typeof it?.image_url === 'string' ? it.image_url : (typeof it?.hd_url === 'string' ? it.hd_url : null),
                            prompt: typeof it?.prompt === 'string' ? it.prompt : '',
                            created_at: typeof it?.created_at === 'string' ? it.created_at : new Date().toISOString(),
                            status: typeof it?.status === 'string' ? it.status : '',
                            character_id: it?.character_id ?? null
                          };
                          const statusLabel = prettyStatus(normalizedItem.status);
                          const actions: React.ReactNode[] = [];

                          if (statusLabel === 'ready' && !normalizedItem.character_id) {
                            actions.push(
                              <button
                                key="create"
                                onClick={(e) => { e.stopPropagation?.(); handleCreateCharacter(normalizedItem); }}
                                disabled={!!creatingCharacter[jobIdNum]}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span>✨</span>
                                <span>{creatingCharacter[jobIdNum] ? 'Creating…' : 'Create Character'}</span>
                              </button>
                            );
                          }

                          if (statusLabel === 'ready' || statusLabel === 'failed') {
                            actions.push(
                              <button
                                key="delete"
                                onClick={(e) => { e.stopPropagation?.(); openDeleteConfirm(normalizedItem); }}
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
                disabled={!!deleting[Number(pendingDeleteJob.id)]}
                className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!!deleting[Number(pendingDeleteJob.id)]}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting[Number(pendingDeleteJob.id)] ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCharacterModal && pendingCharacterJob && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!creatingCharacter[Number(pendingCharacterJob.id)]) {
              setShowCharacterModal(false);
              setPendingCharacterJob(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-md bg-[#0b1220] border border-white/10 rounded-2xl p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
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
              <button
                onClick={() => { setShowCharacterModal(false); setPendingCharacterJob(null); }}
                disabled={!!creatingCharacter[Number(pendingCharacterJob.id)]}
                className="px-4 py-2 rounded-lg border border-white/15 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateCharacter}
                disabled={!!creatingCharacter[Number(pendingCharacterJob.id)]}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingCharacter[Number(pendingCharacterJob.id)] ? 'Creating…' : 'Confirm'}
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

      {/* Image Viewer */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* skeleton overlay for modal image */}
            {!modalLoaded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                <div className="w-[70%] h-[70%] rounded-xl bg-white/10 animate-pulse" />
              </div>
            )}
            <img
              src={previewUrl || previewVariants[0] || sampleImages[currentImageIndex]}
              alt="Image"
              className={`max-w-full max-h-[90vh] object-contain rounded-lg transition-opacity duration-300 ${modalLoaded ? 'opacity-100' : 'opacity-0'}`}
              decoding="async"
              fetchPriority="high"
              onLoad={() => setModalLoaded(true)}
            />
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/20"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Unified viewer handled by ViewerDrawer via context */}
    </div>
  );
}
