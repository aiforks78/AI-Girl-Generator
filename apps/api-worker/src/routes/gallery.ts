import { corsHeaders, jsonWithCors } from "../lib/cors";
import { SupabaseAdminClient } from "../lib/supabase";
import { AuthEnv } from "../lib/types";
import { logger } from "../lib/logger";
import { cachedEncodeURIComponent } from "../lib/url-cache";

type GalleryEnv = AuthEnv;

const THUMBNAIL_PARAMS = "w=238&h=238&fmt=webp&q=85";

function buildThumbnailUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const base = value.split("?")[0];
  if (!base) return null;

  const appendParams = (input: string) => `${input}${input.includes("?") ? "&" : "?"}${THUMBNAIL_PARAMS}`;

  if (base.startsWith("/img/")) {
    return appendParams(base);
  }

  try {
    const parsed = new URL(base);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith("girlgenerator.net")) {
      return appendParams(base);
    }
    return appendParams(base);
  } catch {
    return appendParams(base);
  }
}

export function handleGalleryOptions(request: Request, env: GalleryEnv): Response | null {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/gallery")) {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env, {
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": request.headers.get("Access-Control-Request-Headers") || "Content-Type",
      "access-control-max-age": "86400",
    }),
  });
}

export async function handleGalleryRequest(request: Request, env: GalleryEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/gallery")) {
    return null;
  }

  if (request.method === "OPTIONS") {
    return handleGalleryOptions(request, env);
  }

  if (request.method !== "GET") {
    return jsonWithCors(request, env, { ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const supabase = new SupabaseAdminClient(env);
  const { pathname } = url;

  if (pathname === "/gallery/featured") {
    return handleFeaturedCharacters(request, env, supabase);
  }

  const characterScenesMatch = pathname.match(/^\/gallery\/characters\/([^/]+)\/scenes$/);
  if (characterScenesMatch) {
    const slug = decodeURIComponent(characterScenesMatch[1]);
    return handleCharacterScenes(request, env, supabase, slug);
  }

  const sceneDetailMatch = pathname.match(/^\/gallery\/scenes\/(\d+)$/);
  if (sceneDetailMatch) {
    const jobId = Number(sceneDetailMatch[1]);
    return handleSceneDetail(request, env, supabase, jobId);
  }

  return jsonWithCors(request, env, { ok: false, error: "NOT_FOUND" }, 404);
}

async function handleFeaturedCharacters(request: Request, env: GalleryEnv, supabase: SupabaseAdminClient): Promise<Response> {
  const rows = await supabase.select<Array<Record<string, any>>>(
    "characters?status=eq.approved&is_featured=is.true&select=id,slug,name,avatar_url,source_job_id,like_count,view_count,featured_order,last_generated_at,image_count&order=featured_order.asc&order=like_count.desc"
  );

  // Get CDN short IDs for avatar images
  const jobIds = rows.map(r => r.source_job_id).filter(Boolean);
  const cdnKeysMap = new Map<number, string>();

  if (jobIds.length > 0) {
    const cdnKeys = await supabase.select<Array<Record<string, any>>>(
      `public_cdn_keys?job_id=in.(${jobIds.join(",")})&select=job_id,short_id`
    );
    for (const key of cdnKeys) {
      if (key.job_id && key.short_id) {
        cdnKeysMap.set(key.job_id, key.short_id);
      }
    }
  }

  const imageCountsMap = new Map<string, number>();
  const countPromises: Array<Promise<void>> = [];

  for (const row of rows) {
    const rawId = row?.id;
    if (rawId === null || rawId === undefined) {
      continue;
    }

    const characterId = String(rawId);
    const fallbackCount = typeof row?.image_count === "number" ? row.image_count : Number(row?.image_count ?? 0) || 0;
    imageCountsMap.set(characterId, fallbackCount);

    const filterParts = [
      `character_id=eq.${cachedEncodeURIComponent(characterId)}`,
      "status=in.(ready,img2img_ready,hd_ready)",
      "moderation_status=eq.passed",
      "is_public=eq.true",
      "deleted_at=is.null"
    ];

    countPromises.push(
      (async () => {
        try {
          const count = await supabase.count("generation_jobs", filterParts.join("&"));
          if (count !== null) {
            imageCountsMap.set(characterId, count);
          }
        } catch (error) {
          console.error("[gallery] failed to count public scenes", {
            character_id: characterId,
            error
          });
        }
      })()
    );
  }

  if (countPromises.length > 0) {
    await Promise.all(countPromises);
  }

  // Get the base URL from the request
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const characters = rows.map((row) => {
    let avatarUrl = row.avatar_url;

    // Try to use /img/ path with short_id if available
    if (row.source_job_id && cdnKeysMap.has(row.source_job_id)) {
      const shortId = cdnKeysMap.get(row.source_job_id);
      avatarUrl = `${baseUrl}/img/${shortId}?w=238&h=238&fmt=webp&q=85&wm=off`;
    } else {
      // Fallback to direct URL with params (won't be processed by Worker)
      avatarUrl = buildThumbnailUrl(row.avatar_url) ?? row.avatar_url;
    }

    return {
      slug: row.slug,
      name: row.name,
      avatar_url: avatarUrl,
      image_count: imageCountsMap.get(row.id ? String(row.id) : "") ?? 0,
      like_count: row.like_count ?? 0,
      view_count: row.view_count ?? 0,
      featured_order: row.featured_order ?? 0,
      last_generated_at: row.last_generated_at ?? null,
    };
  });

  return jsonWithCors(request, env, { ok: true, characters });
}

async function fetchCharacterBySlug(supabase: SupabaseAdminClient, slug: string) {
  return supabase.selectSingle<Record<string, any>>(
    `characters?slug=eq.${cachedEncodeURIComponent(slug)}&status=eq.approved&select=id,slug,name,avatar_url,description,image_count,like_count,view_count,tags`
  );
}

async function handleCharacterScenes(
  request: Request,
  env: GalleryEnv,
  supabase: SupabaseAdminClient,
  slug: string
): Promise<Response> {
  const character = await fetchCharacterBySlug(supabase, slug);
  if (!character) {
    console.warn("[gallery] character not found", { slug });
    return jsonWithCors(request, env, { ok: false, error: "CHARACTER_NOT_FOUND" }, 404);
  }

  const url = new URL(request.url);
  const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "12", 10) || 12, 1), 100);
  const offset = (page - 1) * limit;

  // Build query manually - URLSearchParams encodes parentheses which breaks PostgREST syntax
  const queryParts = [
    `character_id=eq.${character.id}`,
    `status=in.(ready,img2img_ready,hd_ready)`,
    `moderation_status=eq.passed`,
    `is_public=eq.true`,
    `deleted_at=is.null`,
    `select=id,work_slug,prompt,model_id,action,status,image_url,hd_url,image_width,image_height,aspect_ratio,public_id,is_public,created_at`,
    `order=created_at.desc`,
    `limit=${limit + 1}`,
    `offset=${offset}`
  ];
  const queryString = queryParts.join("&");

  let rows: Array<Record<string, any>> = [];
  try {
    const query = `generation_jobs?${queryString}`;
    logger.debug("[gallery] executing query", query);
    rows = await supabase.select<Array<Record<string, any>>>(query);
    logger.debug("[gallery] query returned", rows.length, "rows");
  } catch (error) {
    console.error("[gallery] failed to load character scenes", {
      character_id: character.id,
      slug,
      query: queryString,
      error: error instanceof Error ? error.message : String(error),
      error_detail: error
    });
    return jsonWithCors(request, env, { ok: false, error: "SCENE_QUERY_FAILED" }, 500);
  }

  const hasNext = rows.length > limit;
  const trimmed = hasNext ? rows.slice(0, limit) : rows;

  // Use Supabase count aggregation instead of fetching all rows
  let total: number;
  try {
    // Use PostgREST count with Prefer header to get total without fetching data
    const countResult = await supabase.count(
      'generation_jobs',
      `character_id=eq.${character.id}&status=in.(ready,img2img_ready,hd_ready)&moderation_status=eq.passed&is_public=eq.true&deleted_at=is.null`
    );
    total = countResult ?? (hasNext ? offset + trimmed.length + 1 : offset + trimmed.length);
  } catch (error) {
    console.error("[gallery] failed to get total count, falling back to inferred", error);
    // Fallback to inferred total if count query fails
    total = hasNext ? offset + trimmed.length + 1 : offset + trimmed.length;
  }

  // Get the base URL from the request for image URLs (reuse url from line 156)
  const baseUrl = `${url.protocol}//${url.host}`;

  const scenes = trimmed.map((row) => {
    // Convert relative /img/ URLs to absolute URLs
    let imageUrl = row.image_url;
    let hdUrl = row.hd_url;

    if (imageUrl && imageUrl.startsWith("/img/")) {
      imageUrl = `${baseUrl}${imageUrl}`;
    }
    if (hdUrl && hdUrl.startsWith("/img/")) {
      hdUrl = `${baseUrl}${hdUrl}`;
    }

    return {
      id: row.id,
      work_slug: row.work_slug,
      prompt: row.prompt,
      model_id: row.model_id,
      action: row.action,
      status: row.status,
      image_url: imageUrl,
      hd_url: hdUrl,
      image_width: row.image_width,
      image_height: row.image_height,
      aspect_ratio: row.aspect_ratio,
      created_at: row.created_at,
      public_id: row.public_id,
      is_public: row.is_public,
    };
  });

  return jsonWithCors(request, env, {
    ok: true,
    character: {
      slug: character.slug,
      name: character.name,
      avatar_url: character.avatar_url,
      description: character.description,
      image_count: total,
      like_count: character.like_count ?? 0,
      view_count: character.view_count ?? 0,
      tags: character.tags ?? [],
    },
    scenes,
    pagination: {
      page,
      page_size: limit,
      total,
      has_next: hasNext,
    },
  });
}

async function handleSceneDetail(
  request: Request,
  env: GalleryEnv,
  supabase: SupabaseAdminClient,
  jobId: number
): Promise<Response> {
  if (!Number.isFinite(jobId) || jobId <= 0) {
    return jsonWithCors(request, env, { ok: false, error: "INVALID_SCENE_ID" }, 400);
  }

  const job = await supabase.selectSingle<Record<string, any>>(
    `generation_jobs?id=eq.${jobId}&deleted_at=is.null&select=id,character_id,prompt,model_id,action,status,image_url,hd_url,image_width,image_height,aspect_ratio,public_id,is_public,created_at,updated_at,video_url,moderation_status`
  );

  if (!job || !job.character_id || job.moderation_status !== "passed" || !job.is_public) {
    return jsonWithCors(request, env, { ok: false, error: "SCENE_NOT_FOUND" }, 404);
  }

  if (!['ready', 'img2img_ready', 'hd_ready'].includes(String(job.status || '').toLowerCase())) {
    return jsonWithCors(request, env, { ok: false, error: "SCENE_NOT_READY" }, 404);
  }

  const character = await supabase.selectSingle<Record<string, any>>(
    `characters?id=eq.${cachedEncodeURIComponent(job.character_id)}&status=eq.approved&select=slug,name,avatar_url,description,tags`
  );

  if (!character) {
    return jsonWithCors(request, env, { ok: false, error: "CHARACTER_NOT_FOUND" }, 404);
  }

  const images = await supabase.select<Array<Record<string, any>>>(
    `generation_images?job_id=eq.${jobId}&select=type,url,index&order=index.asc`
  );

  // Fetch all source URLs (img2img sources)
  const links = await supabase.select<Array<Record<string, any>>>(
    `generation_links?child_job_id=eq.${jobId}&source_url=not.is.null&select=source_url&order=created_at.asc`
  );

  const sourceUrls = Array.isArray(links)
    ? links
        .map((row) => (typeof row?.source_url === 'string' ? row.source_url : null))
        .filter((url): url is string => Boolean(url))
    : [];

  const primaryImage = job.hd_url || job.image_url || images?.[0]?.url || null;
  const shareUrl = job.public_id ? `/v/${job.public_id}` : null;

  const sceneData: Record<string, any> = {
    id: job.id,
    prompt: job.prompt,
    model_id: job.model_id,
    action: job.action,
    status: job.status,
    image_url: job.image_url,
    hd_url: job.hd_url,
    image_width: job.image_width,
    image_height: job.image_height,
    aspect_ratio: job.aspect_ratio,
    created_at: job.created_at,
    updated_at: job.updated_at,
    video_url: job.video_url,
    is_public: job.is_public,
    public_id: job.public_id,
    primary_image: primaryImage,
    share_url: shareUrl,
    images: images?.map((img) => ({
      type: img.type,
      url: img.url,
      index: img.index,
    })) ?? [],
  };

  if (sourceUrls.length > 0) {
    sceneData.related = {
      external_sources: sourceUrls
    };
  }

  return jsonWithCors(request, env, {
    ok: true,
    character: {
      slug: character.slug,
      name: character.name,
      avatar_url: character.avatar_url,
      description: character.description,
      tags: character.tags ?? [],
    },
    scene: sceneData,
  });
}
