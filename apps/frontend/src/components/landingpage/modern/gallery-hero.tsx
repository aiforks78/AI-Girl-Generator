"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useViewer } from "@/contexts/viewer-store";
import { apiFetch } from "@/lib/api-client";
import { buildImageUrl } from "@/lib/url-utils";
import type { Job } from "@/types/generation";
import { toast } from "sonner";
import type { GalleryFeaturedCharacter, GallerySceneItem } from "@/app/gallery/types";
type Character = GalleryFeaturedCharacter;
type Scene = GallerySceneItem;

interface GalleryHeroProps {
  getStartedHref?: string;
  initialCharacters?: Character[];
  initialScenes?: Scene[];
  initialCharacterSlug?: string | null;
}

export default function GalleryHero({ getStartedHref, initialCharacters, initialScenes, initialCharacterSlug }: GalleryHeroProps) {
  const normalizedInitialCharacters = useMemo<Character[]>(() => {
    if (!Array.isArray(initialCharacters)) return [];
    return initialCharacters.slice(0, 6);
  }, [initialCharacters]);
  const initialScenesProvided = initialScenes !== undefined && initialScenes !== null;
  const initialSlug = initialCharacterSlug ?? normalizedInitialCharacters[0]?.slug ?? null;
  const initialIndex = useMemo(() => {
    if (!initialSlug) return 0;
    const idx = normalizedInitialCharacters.findIndex((item) => item.slug === initialSlug);
    return idx >= 0 ? idx : 0;
  }, [normalizedInitialCharacters, initialSlug]);

  const [characters, setCharacters] = useState<Character[]>(() => normalizedInitialCharacters);
  const [scenes, setScenes] = useState<Scene[]>(() => (initialScenesProvided ? [...(initialScenes ?? [])] : []));
  const [currentCharacter, setCurrentCharacter] = useState(() =>
    normalizedInitialCharacters.length === 0 ? 0 : initialIndex
  );
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [loading, setLoading] = useState(normalizedInitialCharacters.length === 0);
  const [scenesLoading, setScenesLoading] = useState(!initialScenesProvided);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { openViewer } = useViewer();

  // Cache for preloaded scenes
  const scenesCache = useRef<Record<number, Scene[]>>({});
  const prefetchingRef = useRef<Set<number>>(new Set());

  const resolveAvatarUrl = useCallback((character: Character) => {
    if (character.avatar_url) {
      return buildImageUrl({
        base: character.avatar_url,
        width: 160,
        fmt: 'webp',
        quality: 85,
        preview: true
      });
    }
    return '/placeholder.png';
  }, []);

  const resolveSceneImage = useCallback((scene: Scene) => {
    const base = scene.hd_url || scene.image_url;
    if (!base) return '/placeholder.png';
    return buildImageUrl({
      base,
      preview: true,
      width: 400,
      fmt: 'webp',
      quality: 80
    });
  }, []);

  const resolveSceneAlt = useCallback(
    (scene: Scene, index: number) =>
      scene.prompt || `${characters[currentCharacter]?.name ?? 'AI girl'} scene ${index + 1}`,
    [characters, currentCharacter]
  );

  // Auto-play pause state
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ pointerId: number | null; startX: number; scrollLeft: number }>({
    pointerId: null,
    startX: 0,
    scrollLeft: 0
  });
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const pointerCapturedRef = useRef(false);
  const lastDragTimeRef = useRef(0);

  // Fetch featured characters on mount (skip when initial data exists)
  useEffect(() => {
    if (normalizedInitialCharacters.length > 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchCharacters = async () => {
      try {
        const res = await apiFetch('/gallery/featured', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch characters');
        const data = await res.json();
        if (!cancelled && data.ok && data.characters) {
          scenesCache.current = {};
          setCharacters(data.characters.slice(0, 6));
          setCurrentCharacter(0);
          setScenes([]);
          setScenesLoading(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[gallery-hero] Failed to fetch characters:', error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCharacters();
    return () => {
      cancelled = true;
    };
  }, [normalizedInitialCharacters.length]);

  const initialCachePopulatedRef = useRef(false);
  useEffect(() => {
    if (!initialScenesProvided) return;
    if (initialCachePopulatedRef.current) return;
    const index = Math.min(initialIndex, characters.length > 0 ? characters.length - 1 : initialIndex);
    scenesCache.current[index] = initialScenes ?? [];
    initialCachePopulatedRef.current = true;
    setScenes(initialScenes ?? []);
    setScenesLoading(false);
    setCurrentSceneIndex(0);
  }, [initialScenesProvided, initialScenes, initialIndex, characters.length]);

  // Prefetch scenes for a specific character
  const prefetchScenes = useCallback(async (characterIndex: number) => {
    if (characterIndex < 0 || characterIndex >= characters.length) return;
    if (scenesCache.current[characterIndex]) return; // Already cached
    if (prefetchingRef.current.has(characterIndex)) return; // Already fetching

    prefetchingRef.current.add(characterIndex);

    try {
      const character = characters[characterIndex];
      const res = await apiFetch(
        `/gallery/characters/${encodeURIComponent(character.slug)}/scenes?page=1&limit=12`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to prefetch scenes');
      const data = await res.json();
      if (data.ok && data.scenes) {
        scenesCache.current[characterIndex] = data.scenes;
      }
    } catch (error) {
      console.error('[gallery-hero] Failed to prefetch scenes:', error);
    } finally {
      prefetchingRef.current.delete(characterIndex);
    }
  }, [characters]);

  // Fetch scenes when character changes
  useEffect(() => {
    if (characters.length === 0) return;

    const fetchScenes = async () => {
      // Check cache first
      if (scenesCache.current[currentCharacter]) {
        setScenes(scenesCache.current[currentCharacter]);
        setCurrentSceneIndex(0);
        setScenesLoading(false);
        return;
      }

      setScenesLoading(true);
      try {
        const character = characters[currentCharacter];
        const res = await apiFetch(
          `/gallery/characters/${encodeURIComponent(character.slug)}/scenes?page=1&limit=12`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('Failed to fetch scenes');
        const data = await res.json();
        if (data.ok && data.scenes) {
          scenesCache.current[currentCharacter] = data.scenes;
          setScenes(data.scenes);
          setCurrentSceneIndex(0);
        }
      } catch (error) {
        console.error('[gallery-hero] Failed to fetch scenes:', error);
        setScenes([]);
      } finally {
        setScenesLoading(false);
      }
    };

    fetchScenes();
  }, [currentCharacter, characters]);

  // Auto-scroll logic
  const scrollToScene = useCallback((sceneIndex: number) => {
    if (!scrollContainerRef.current || scenes.length === 0) return;

    const container = scrollContainerRef.current;
    const sceneCards = container.querySelectorAll('.scene-card');
    const targetCard = sceneCards[sceneIndex] as HTMLElement;

    if (targetCard) {
      const cardLeft = targetCard.offsetLeft;
      const containerWidth = container.offsetWidth;
      const cardWidth = targetCard.offsetWidth;
      const scrollPosition = cardLeft - (containerWidth / 2) + (cardWidth / 2);

      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [scenes.length]);

  // Scroll to first scene when scenes are loaded
  useEffect(() => {
    if (scenes.length > 0 && !scenesLoading && currentSceneIndex === 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => scrollToScene(0), 100);
    }
  }, [scenes.length, scenesLoading, currentSceneIndex, scrollToScene]);

  // Prefetch next character's scenes when approaching the end
  useEffect(() => {
    if (scenes.length === 0 || characters.length === 0) return;

    // Trigger prefetch when we're at the last 2 scenes
    const shouldPrefetch = currentSceneIndex >= scenes.length - 2;

    if (shouldPrefetch) {
      const nextCharIndex = (currentCharacter + 1) % characters.length;
      prefetchScenes(nextCharIndex);
    }
  }, [currentSceneIndex, scenes.length, currentCharacter, characters.length, prefetchScenes]);

  const advanceFrom = useCallback(
    (startIndex: number) => {
      if (scenes.length === 0) {
        return;
      }

      const next = startIndex + 1;

      if (next >= scenes.length) {
        setCurrentCharacter(prevChar => {
          if (characters.length === 0) return prevChar;
          return (prevChar + 1) % characters.length;
        });
        setCurrentSceneIndex(0);
        return;
      }

      setCurrentSceneIndex(next);
      scrollToScene(next);
    },
    [characters.length, scenes.length, scrollToScene]
  );

  const nextScene = useCallback(() => {
    advanceFrom(currentSceneIndex);
  }, [advanceFrom, currentSceneIndex]);

  // Auto-play interval (with pause support)
  useEffect(() => {
    // Clear existing interval
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    // Don't start interval if no scenes, still loading, or paused
    if (scenes.length === 0 || scenesLoading || isPaused) {
      return;
    }

    // Start new interval
    playIntervalRef.current = setInterval(nextScene, 3000);

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [scenes.length, scenesLoading, isPaused, nextScene]);

  // Character selection handler
  const handleCharacterSelect = (index: number) => {
    setCurrentCharacter(index);
    setCurrentSceneIndex(0);
  };

  const stopDragging = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const container = scrollContainerRef.current;
    const pointerId = dragStateRef.current.pointerId;
    if (container && pointerId !== null) {
      try {
        if (pointerCapturedRef.current && container.hasPointerCapture(pointerId)) {
          container.releasePointerCapture(pointerId);
        }
      } catch (error) {
        console.warn('[gallery-hero] Failed to release pointer capture', error);
      }
    }
    dragStateRef.current.pointerId = null;
    pointerCapturedRef.current = false;
    if (dragMovedRef.current) {
      lastDragTimeRef.current = Date.now();
      dragMovedRef.current = false;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const container = scrollContainerRef.current;
    if (!container) return;
    draggingRef.current = true;
    dragMovedRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: container.scrollLeft
    };
    setIsDragging(true);
    setIsPaused(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (!draggingRef.current || !scrollContainerRef.current) return;
    const delta = event.clientX - dragStateRef.current.startX;
    if (Math.abs(delta) > 4) {
      dragMovedRef.current = true;
      if (!pointerCapturedRef.current) {
        try {
          scrollContainerRef.current.setPointerCapture(event.pointerId);
          pointerCapturedRef.current = true;
        } catch (error) {
          console.warn('[gallery-hero] Failed to set pointer capture', error);
        }
      }
    }
    scrollContainerRef.current.scrollLeft = dragStateRef.current.scrollLeft - delta;
    if (dragMovedRef.current) {
      event.preventDefault();
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const container = scrollContainerRef.current;
    let targetIndex = currentSceneIndex;
    if (container && dragMovedRef.current) {
      const cards = Array.from(container.querySelectorAll<HTMLElement>('.scene-card'));
      if (cards.length > 0) {
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + containerRect.width / 2;
        let closestIndex = 0;
        let closestDistance = Infinity;
        cards.forEach((card, idx) => {
          const rect = card.getBoundingClientRect();
          const cardCenter = rect.left + rect.width / 2;
          const distance = Math.abs(cardCenter - containerCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = idx;
          }
        });
        targetIndex = Math.min(Math.max(closestIndex, 0), Math.max(cards.length - 1, 0));
      }
    }
    stopDragging();
    setCurrentSceneIndex(targetIndex);
    setIsPaused(false);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    stopDragging();
    setIsPaused(false);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    stopDragging();
    setIsPaused(false);
  };

  // Scene click handler
  const handleSceneClick = useCallback(async (scene: Scene) => {
    if (Date.now() - lastDragTimeRef.current < 150) {
      return;
    }

    try {
      const res = await apiFetch(`/gallery/scenes/${scene.id}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to load scene detail: ${res.status}`);
      }

      const data = await res.json();
      const detail = data?.scene;
      if (!data?.ok || !detail) {
        throw new Error(data?.error || 'Scene detail missing');
      }

      const imageVariants = Array.isArray(detail.images)
        ? detail.images.map((img: any) => img?.url).filter(Boolean)
        : [];
      const imageUrl = detail.hd_url || detail.image_url || detail.primary_image || scene.hd_url || scene.image_url || null;
      const rawAction = String(detail.action || scene.action || 'txt2img').toLowerCase();
      const allowedActions: Job['action'][] = ['txt2img', 'img2img', 'img2vid'];
      const action = (allowedActions.includes(rawAction as Job['action']) ? rawAction : 'txt2img') as Job['action'];

      const jobId = typeof detail.id === 'number' ? detail.id : Number(detail.id ?? scene.id);

      const job: Job = {
        id: Number.isFinite(jobId) ? jobId : scene.id,
        prompt: detail.prompt || scene.prompt || '',
        model_id: detail.model_id || scene.model_id || null,
        action,
        status: detail.status || scene.status || 'ready',
        image_url: imageUrl,
        image_variants: imageVariants.length > 0 ? imageVariants : undefined,
        video_url: detail.video_url || scene.video_url || null,
        aspect_ratio: detail.aspect_ratio || scene.aspect_ratio || null,
        image_width: detail.image_width ?? scene.image_width ?? null,
        image_height: detail.image_height ?? scene.image_height ?? null,
        created_at: detail.created_at || scene.created_at,
        updated_at: detail.updated_at || detail.created_at || scene.created_at,
        is_public: detail.is_public ?? scene.is_public ?? null,
        public_id: detail.public_id ?? scene.public_id ?? null,
        related: detail.related || undefined,
      };

      await openViewer(job);
    } catch (error) {
      console.error('[gallery-hero] Failed to open scene viewer', error);
      toast.error('Unable to load scene details');
    }
  }, [openViewer]);

  if (loading) {
    return (
      <section className="relative min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-visible flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </section>
    );
  }

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#1a0f2e] via-[#0a0a0a] to-[#000000] overflow-visible">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-[#6d28d9]/40 to-[#ec4899]/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#3b82f6]/10 to-[#8b5cf6]/30 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-gradient-to-r from-[#a855f7]/5 to-[#d946ef]/5 blur-[150px]" />
      </div>

      {/* Header and Character Selection - Centered with max-width */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-40 md:pt-48 pb-12">
        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
            <span className="block text-white">AI Girl Generator</span>
            <span className="block bg-gradient-to-r from-[#a855f7] to-[#ec4899] bg-clip-text text-transparent">
              Bring Her to Life in Any Scene
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 leading-relaxed max-w-3xl mx-auto font-light">
            One Portrait → 100+ Lifestyle Scenes → Cinematic Videos
          </p>

          <div className="pt-4">
            <Link
              href={getStartedHref ?? "/text-to-image"}
              className="inline-flex items-center justify-center bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white hover:from-[#9333ea] hover:to-[#db2777] font-semibold px-12 py-5 text-xl rounded-xl transition-all duration-200 shadow-lg hover:scale-105"
            >
              Start Creating for Free
            </Link>
          </div>
        </div>

        {/* Character Selection Row */}
        <div className="flex gap-3 md:gap-4 justify-center mb-10 flex-wrap px-4">
          {characters.map((character, index) => (
            <button
              key={character.slug}
              onClick={() => handleCharacterSelect(index)}
              className={`flex flex-col items-center transition-all duration-300 hover:scale-105 ${
                currentCharacter === index ? 'scale-105' : ''
              }`}
            >
              <div
                className={`w-16 h-16 md:w-24 md:h-24 rounded-full border-3 transition-all overflow-hidden bg-black/40 ${
                  currentCharacter === index
                    ? 'border-[#ec4899] shadow-[0_8px_30px_rgba(236,72,153,0.6)]'
                    : 'border-transparent'
                }`}
              >
                <img
                  src={resolveAvatarUrl(character)}
                  alt={`${character.name} avatar`}
                  className="w-full h-full object-contain"
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  loading={index < 4 ? 'eager' : 'lazy'}
                />
              </div>
              <div
                className={`mt-2 text-xs md:text-sm font-semibold transition-colors ${
                  currentCharacter === index
                    ? 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] bg-clip-text text-transparent'
                    : 'text-white/70'
                }`}
              >
                {character.name}
              </div>
              <div className="text-[10px] md:text-xs text-white/40 mt-1">
                {character.image_count} scenes
              </div>
            </button>
          ))}
        </div>

        {/* Scene Gallery Title */}
          <div className="text-center mb-2 md:mb-3">
            <h2 className="text-2xl font-semibold text-white mb-2">
              {characters[currentCharacter]?.name ?? 'Character'}'s Lifestyle Scenes
            </h2>
            <div className="text-sm text-white/60">
              {scenes.length} lifestyle scenes
            </div>
          </div>
      </div>

      {/* Horizontal Scrolling Scene Gallery - Full Width */}
      <div className="relative z-10 pb-20">
        <div className="relative w-full overflow-visible min-h-[22rem] md:min-h-[24rem]">
          <div
            ref={scrollContainerRef}
            className={`flex items-center gap-4 md:gap-5 overflow-x-auto overflow-y-visible scroll-smooth px-4 md:px-6 scrollbar-hide ${
              isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
            }`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => {
              setIsPaused(false);
            }}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => {
              setIsPaused(false);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerCancel}
          >
            {scenesLoading ? (
              // Skeleton loading state
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="scene-card flex-shrink-0 rounded-xl md:rounded-2xl overflow-hidden border-2 border-white/10 transition-all duration-300"
                >
                  <div className="w-[200px] sm:w-[240px] md:w-[280px] h-[200px] sm:h-[240px] md:h-[280px] bg-slate-900/40 animate-pulse rounded-xl md:rounded-2xl" />
                </div>
              ))
            ) : scenes.length === 0 ? (
              <div className="w-full flex items-center justify-center py-20">
                <div className="text-white/60">No scenes available</div>
              </div>
            ) : (
              scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`scene-card flex-shrink-0 cursor-pointer transition-all duration-300 relative ${
                    currentSceneIndex === index ? 'z-20' : 'z-0 hover:scale-[1.03]'
                  }`}
                  onClick={() => { void handleSceneClick(scene); }}
                >
                  <div className={`rounded-xl md:rounded-2xl border-2 md:border-3 bg-slate-950/70 transition-all duration-300 ${
                      currentSceneIndex === index
                        ? 'w-[230px] sm:w-[280px] md:w-[320px] h-[230px] sm:h-[280px] md:h-[320px] border-white/40 shadow-[0_18px_45px_rgba(0,0,0,0.55)] md:shadow-[0_25px_70px_rgba(0,0,0,0.6)]'
                        : 'w-[200px] sm:w-[240px] md:w-[280px] h-[200px] sm:h-[240px] md:h-[280px] border-transparent hover:border-white/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] md:hover:shadow-[0_18px_48px_rgba(0,0,0,0.55)]'
                    }`}
                    style={{
                      width: currentSceneIndex === index ? '320px' : '280px',
                      height: currentSceneIndex === index ? '320px' : '280px'
                    }}
                  >
                    <div className="w-full h-full rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300">
                      <img
                        src={resolveSceneImage(scene)}
                        alt={resolveSceneAlt(scene, index)}
                        loading={index < 7 ? 'eager' : 'lazy'}
                        className="w-full h-full object-cover select-none"
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* View More Button */}
        <div className="text-center mt-8">
          <Link
            href={`/gallery?character=${characters[currentCharacter]?.slug || ''}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 text-white rounded-xl transition-all duration-200"
          >
            <span>View More Scenes</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      <noscript>
        <div className="px-6 pb-12 text-white">
          <h2 className="text-lg font-semibold mb-3">Gallery Preview</h2>
          {scenes.length === 0 ? (
            <p className="text-sm text-white/60">Please enable JavaScript to explore more characters and scenes.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {scenes.slice(0, 6).map((scene, index) => (
                <img
                  key={scene.id ?? index}
                  src={resolveSceneImage(scene)}
                  alt={resolveSceneAlt(scene, index)}
                  className="w-full h-auto object-cover border border-white/10"
                />
              ))}
            </div>
          )}
        </div>
      </noscript>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
