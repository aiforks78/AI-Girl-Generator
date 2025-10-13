"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useViewer } from "@/contexts/viewer-store";
import type { Job } from "@/types/generation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { buildImageUrl } from "@/lib/url-utils";
import type {
  GalleryCharacterDetail as CharacterDetail,
  GalleryFeaturedCharacter as FeaturedCharacter,
  GalleryPagination as Pagination,
  GallerySceneItem as SceneItem,
} from "./types";

const PAGE_SIZE = 12;

function computeAspectRatio(scene: SceneItem): number {
  if (scene.aspect_ratio) {
    const parts = scene.aspect_ratio.split(":").map((part) => Number(part));
    if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
      return parts[0] / parts[1];
    }
  }
  if (scene.image_width && scene.image_height && scene.image_width > 0 && scene.image_height > 0) {
    return scene.image_width / scene.image_height;
  }
  return 1;
}

interface GalleryClientProps {
  initialFeatured?: FeaturedCharacter[];
  initialScenes?: SceneItem[];
  initialPagination?: Pagination | null;
  initialCharacter?: CharacterDetail | null;
  initialSelectedSlug?: string | null;
  initialFeaturedError?: string | null;
  initialScenesError?: string | null;
}

export default function GalleryClient({
  initialFeatured,
  initialScenes,
  initialPagination,
  initialCharacter,
  initialSelectedSlug,
  initialFeaturedError,
  initialScenesError,
}: GalleryClientProps) {
  const { openViewer } = useViewer();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scenesEndRef = useRef<HTMLDivElement>(null);

  const normalizedInitialFeatured = useMemo<FeaturedCharacter[]>(() => {
    const list = Array.isArray(initialFeatured) ? [...initialFeatured] : [];
    if (initialCharacter?.slug) {
      const exists = list.some((item) => item.slug === initialCharacter.slug);
      if (!exists) {
        list.unshift({
          slug: initialCharacter.slug,
          name: initialCharacter.name,
          avatar_url: initialCharacter.avatar_url,
          image_count: initialCharacter.image_count,
          like_count: initialCharacter.like_count,
          view_count: initialCharacter.view_count,
          description: initialCharacter.description,
          tags: initialCharacter.tags,
        });
      }
    }
    return list;
  }, [initialFeatured, initialCharacter]);

  const initialFeaturedLoadedRef = useRef(normalizedInitialFeatured.length > 0);

  const [featured, setFeatured] = useState<FeaturedCharacter[]>(() => normalizedInitialFeatured);
  const [featuredLoading, setFeaturedLoading] = useState(normalizedInitialFeatured.length === 0);
  const [featuredError, setFeaturedError] = useState<string | null>(initialFeaturedError ?? null);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    () => initialSelectedSlug ?? (normalizedInitialFeatured[0]?.slug ?? null)
  );

  const initialScenesProvided = initialScenes !== undefined && initialScenes !== null;
  const [scenes, setScenes] = useState<SceneItem[]>(() =>
    initialScenesProvided ? [...(initialScenes ?? [])] : []
  );
  const [scenesLoading, setScenesLoading] = useState(!(initialScenesProvided && !initialScenesError));
  const [scenesError, setScenesError] = useState<string | null>(initialScenesError ?? null);
  const [pagination, setPagination] = useState<Pagination | null>(() => initialPagination ?? null);
  const [characterDetail, setCharacterDetail] = useState<CharacterDetail | null>(
    () => initialCharacter ?? null
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const initialSlugRef = useRef<string | null>(initialSelectedSlug ?? null);
  const initialScenesRef = useRef<SceneItem[] | undefined>(
    initialScenesProvided ? initialScenes ?? [] : undefined
  );
  const initialScenesErrorRef = useRef<string | null>(initialScenesError ?? null);
  const initialScenesConsumedRef = useRef(false);

  useEffect(() => {
    if (initialFeaturedLoadedRef.current) {
      setFeaturedLoading(false);
      return;
    }

    let cancelled = false;
    const loadFeatured = async () => {
      setFeaturedLoading(true);
      setFeaturedError(null);
      try {
        const res = await apiFetch("/gallery/featured", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "FAILED");
        if (!cancelled) {
          setFeatured(json.characters || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[gallery] failed to load featured characters", error);
          setFeaturedError("Failed to load featured characters");
        }
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    };

    void loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (featured.length === 0) return;
    if (!selectedSlug) {
      setSelectedSlug(featured[0].slug);
      return;
    }
    if (featured.some((c) => c.slug === selectedSlug)) {
      return;
    }
    if (characterDetail && characterDetail.slug === selectedSlug) {
      return;
    }
    setSelectedSlug(featured[0].slug);
  }, [featured, selectedSlug, characterDetail]);

  useEffect(() => {
    if (!selectedSlug) return;

    const shouldUseInitial =
      !initialScenesConsumedRef.current &&
      initialSlugRef.current &&
      selectedSlug === initialSlugRef.current &&
      initialScenesRef.current !== undefined &&
      !initialScenesErrorRef.current;

    if (shouldUseInitial) {
      initialScenesConsumedRef.current = true;
      setScenesLoading(false);
      return;
    }

    initialScenesConsumedRef.current = true;

    let cancelled = false;
    const loadScenes = async (slug: string) => {
      setScenesLoading(true);
      setScenesError(null);
      try {
        const res = await apiFetch(
          `/gallery/characters/${encodeURIComponent(slug)}/scenes?page=1&limit=${PAGE_SIZE}`,
          {
            cache: "no-store",
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || "FAILED");
        if (!cancelled) {
          setCharacterDetail(json.character || null);
          setScenes(json.scenes || []);
          setPagination(json.pagination || null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[gallery] failed to load scenes", error);
          setScenesError("Failed to load scenes");
          setScenes([]);
          setPagination(null);
        }
      } finally {
        if (!cancelled) setScenesLoading(false);
      }
    };

    void loadScenes(selectedSlug);
    return () => {
      cancelled = true;
    };
  }, [selectedSlug]);

  const loadMoreScenes = useCallback(async () => {
    if (!selectedSlug || !pagination?.has_next || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = (pagination?.page || 1) + 1;
      const res = await apiFetch(`/gallery/characters/${encodeURIComponent(selectedSlug)}/scenes?page=${nextPage}&limit=${PAGE_SIZE}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "FAILED");

      setScenes((prev) => [...prev, ...(json.scenes || [])]);
      setPagination(json.pagination || null);
    } catch (error) {
      console.error("[gallery] failed to load more scenes", error);
      toast.error("Failed to load more scenes");
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedSlug, pagination, isLoadingMore]);

  useEffect(() => {
    const target = scenesEndRef.current;
    if (!target || scenesLoading || isLoadingMore || !pagination?.has_next) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMoreScenes();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [scenesLoading, isLoadingMore, pagination, loadMoreScenes]);

  const selectedCharacter = useMemo(
    () => featured.find((c) => c.slug === selectedSlug) || null,
    [featured, selectedSlug]
  );

  const displayCharacter = characterDetail || selectedCharacter;
  const totalScenes = pagination?.total ?? displayCharacter?.image_count ?? scenes.length;

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleImageClick = async (scene: SceneItem) => {
    try {
      const res = await apiFetch(`/gallery/scenes/${scene.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.ok || !json.scene) throw new Error(json?.error || "FAILED");
      const detail = json.scene;
      const imageVariants = Array.isArray(detail.images)
        ? detail.images.map((img: any) => img.url).filter(Boolean)
        : [];
      const imageUrl = detail.hd_url || detail.image_url || detail.primary_image || scene.hd_url || scene.image_url || null;
      const rawAction = String(detail.action || scene.action || "txt2img").toLowerCase();
      const allowedActions: Job["action"][] = ["txt2img", "img2img", "img2vid"];
      const action = (allowedActions.includes(rawAction as Job["action"]) ? rawAction : "txt2img") as Job["action"];
      const job: Job = {
        id: detail.id,
        prompt: detail.prompt || "",
        model_id: detail.model_id || scene.model_id || null,
        action,
        status: detail.status || scene.status || "ready",
        image_url: imageUrl,
        image_variants: imageVariants.length > 0 ? imageVariants : undefined,
        video_url: detail.video_url || null,
        aspect_ratio: detail.aspect_ratio || scene.aspect_ratio || null,
        image_width: detail.image_width ?? scene.image_width ?? null,
        image_height: detail.image_height ?? scene.image_height ?? null,
        created_at: detail.created_at || scene.created_at,
        updated_at: detail.updated_at || detail.created_at || scene.created_at,
        is_public: detail.is_public,
        public_id: detail.public_id,
        related: detail.related || undefined,
      };
      await openViewer(job);
    } catch (error) {
      console.error("[gallery] failed to open viewer", error);
      toast.error("Failed to load scene detail");
    }
  };

  const getDisplayUrl = useCallback((scene: SceneItem) => {
    const base = scene.hd_url || scene.image_url;
    if (!base) return "/placeholder.png";
    return buildImageUrl({
      base,
      preview: true,
      width: 768,
      fmt: "webp",
      quality: 80,
    });
  }, []);

  const primaryScenes: Array<SceneItem & { displayUrl: string | null; displayRatio: number }> = scenes.map((scene) => ({
    ...scene,
    displayUrl: getDisplayUrl(scene),
    displayRatio: computeAspectRatio(scene),
  }));

  return (
    <main className="min-h-screen bg-black">
      <div className="pt-52 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Girl
            </span>
            <span className="text-white"> Gallery</span>
          </h1>
          <p className="text-white/70 text-lg">
            Explore our featured AI girls and their stunning lifestyle scenes
          </p>
        </div>
      </div>

      <section className="bg-gradient-to-b from-black via-purple-950/5 to-black py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-6">Featured Characters</h2>

          {featuredError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {featuredError}
            </div>
          )}

          <div className="relative">
            {/* Desktop scroll buttons */}
            <button
              onClick={() => scroll("left")}
              className="hidden md:flex absolute -left-4 top-[128px] -translate-y-1/2 z-20 w-12 h-12 bg-black/90 hover:bg-black border border-white/30 rounded-full items-center justify-center text-white shadow-xl transition-all hover:scale-110"
              aria-label="Scroll left"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => scroll("right")}
              className="hidden md:flex absolute -right-4 top-[128px] -translate-y-1/2 z-20 w-12 h-12 bg-black/90 hover:bg-black border border-white/30 rounded-full items-center justify-center text-white shadow-xl transition-all hover:scale-110"
              aria-label="Scroll right"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Mobile hint: swipe indicator */}
            <div className="md:hidden text-center mb-2">
              <p className="text-xs text-white/40 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                Swipe to see more characters
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </p>
            </div>

            <div
              ref={scrollContainerRef}
              className="overflow-x-auto hide-scrollbar scroll-smooth px-2 md:px-8 py-2"
            >
              <div className="flex gap-3 sm:gap-4">
                {(featuredLoading && featured.length === 0
                  ? Array.from({ length: 6 }).map((_, idx) => ({ slug: `placeholder-${idx}` }))
                  : featured
                ).map((character: FeaturedCharacter | { slug: string }) => {
                  const isPlaceholder = !("name" in character);
                  const slug = character.slug;
                  const isSelected = selectedSlug === slug || (!selectedSlug && !isPlaceholder && featured[0]?.slug === slug);
                  return (
                    <button
                      key={slug}
                      onClick={() => !isPlaceholder && setSelectedSlug(slug)}
                      className="flex-shrink-0 group/card transition-all duration-300"
                      disabled={isPlaceholder}
                    >
                      <div
                        className={`w-36 h-36 sm:w-60 sm:h-60 rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                          isSelected
                            ? "border-purple-500 ring-2 ring-purple-500/50"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        {isPlaceholder ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-purple-800/20 to-purple-700/40 animate-pulse" />
                        ) : (
                          <img
                            src={(character as FeaturedCharacter).avatar_url || "/placeholder.png"}
                            alt={(character as FeaturedCharacter).name}
                            loading="eager"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                          />
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <p
                            className={`text-sm sm:text-base font-medium transition-colors ${
                              isSelected ? "text-purple-400" : "text-white/80"
                            }`}
                          >
                            {isPlaceholder ? "Loading" : (character as FeaturedCharacter).name}
                          </p>
                          {isSelected && !isPlaceholder && (
                            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-white/50">
                          {isPlaceholder ? "—" : `${(character as FeaturedCharacter).image_count ?? 0} scenes`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-4">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              {displayCharacter?.name || "Character"}'s <span className="text-purple-400">Scenes</span>
            </h2>
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-২-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{totalScenes} total</span>
            </div>
          </div>

          {scenesError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {scenesError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(scenesLoading && primaryScenes.length === 0
              ? Array.from({ length: 8 }).map((_, idx) => ({ key: `placeholder-${idx}`, placeholder: true as const }))
              : primaryScenes.map((scene) => ({ key: String(scene.id), placeholder: false as const, scene }))
            ).map((item) => (
              <div
                key={item.key}
                className={`break-inside-avoid group ${item.placeholder ? "animate-pulse" : "cursor-pointer"}`}
                onClick={() => {
                  if (!item.placeholder) void handleImageClick(item.scene);
                }}
              >
                <div className="relative overflow-hidden border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300">
                  {item.placeholder ? (
                    <div className="w-full h-48 bg-gradient-to-br from-purple-900/30 via-purple-800/20 to-purple-700/30" />
                  ) : (
                    <img
                      src={item.scene.displayUrl || "/placeholder.png"}
                      alt="AI generated scene"
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                      style={{ aspectRatio: item.scene.displayRatio || 1 }}
                    />
                  )}

                  {!item.placeholder && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}

                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transform bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 ease-in-out" />
                </div>
              </div>
            ))}
          </div>

          {!scenesLoading && primaryScenes.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-full mb-4">
                <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white/60">No scenes available for this character yet</p>
            </div>
          )}

          {/* Infinite scroll trigger */}
          <div ref={scenesEndRef} className="h-4" />

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-8">
              <div className="flex items-center gap-2 text-white/60">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Loading more scenes...</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <noscript>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white">
          <h2 className="text-xl font-semibold mb-4">Gallery Preview</h2>
          {primaryScenes.length === 0 ? (
            <p className="text-sm text-white/60">Please enable JavaScript to browse more characters and scenes.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {primaryScenes.slice(0, 9).map((item) => (
                <div key={item.id} className="border border-white/10">
                  <img
                    src={item.displayUrl || "/placeholder.png"}
                    alt={item.prompt || `${displayCharacter?.name ?? "AI girl"} scene`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </noscript>

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}
