import { SupabaseAdminClient } from "./supabase";
import { cachedEncodeURIComponent } from "./url-cache";

export interface ImageReferenceEnv {
  R2_PUBLIC_BASE_URL?: string;
}

export interface ImageReferenceInfo {
  originalUrl: string;
  normalizedUrl: string;
  resolvedUrl: string | null;
  parentJobId: number | null;
}

export type CharacterAssociationSource = "explicit" | "auto_inherited" | null;

export interface CharacterAssociationResult {
  characterId: string | null;
  source: CharacterAssociationSource;
  sourceJobId: number | null;
  shouldUpdate: boolean;
}

export class CharacterAssociationError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface ResolveImageReferencesOptions {
  supabase: SupabaseAdminClient;
  env: ImageReferenceEnv;
  urls: string[];
  requireResolvedUrl?: boolean;
}

const IMAGE_RESOLVE_ERROR_PREFIX = "IMAGE_URL_RESOLUTION_FAILED";
const DEFAULT_DEPTH_LIMIT = 5;

export async function resolveImageReferences(options: ResolveImageReferencesOptions): Promise<ImageReferenceInfo[]> {
  const { supabase, env, urls, requireResolvedUrl = false } = options;
  const results: ImageReferenceInfo[] = [];
  const cache = new Map<string, Promise<ImageReferenceInfo>>();

  for (const raw of urls) {
    const normalized = typeof raw === "string" ? raw.trim() : "";
    if (!cache.has(normalized)) {
      cache.set(
        normalized,
        resolveSingleReference({ supabase, env, url: normalized, original: raw, requireResolvedUrl })
      );
    }
    const info = await cache.get(normalized)!;
    results.push(info);
  }

  return results;
}

interface ResolveSingleReferenceOptions {
  supabase: SupabaseAdminClient;
  env: ImageReferenceEnv;
  url: string;
  original: string;
  requireResolvedUrl: boolean;
}

async function resolveSingleReference(options: ResolveSingleReferenceOptions): Promise<ImageReferenceInfo> {
  const { supabase, env, url, original, requireResolvedUrl } = options;

  if (!url) {
    return {
      originalUrl: original,
      normalizedUrl: "",
      resolvedUrl: null,
      parentJobId: null
    };
  }

  const base = (env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  let resolvedUrl: string | null = requireResolvedUrl ? null : url;
  let parentJobId: number | null = null;
  let objectKey: string | null = null;

  const setObjectKey = (key: string | null | undefined) => {
    if (!key) return;
    objectKey = sanitizeObjectKey(key);
    const inferred = extractJobIdFromObjectKey(objectKey);
    if (inferred !== null) {
      parentJobId = inferred;
    }
  };

  const ensureResolvedUrl = () => {
    if (!requireResolvedUrl) {
      if (resolvedUrl === null) {
        resolvedUrl = url;
      }
      return;
    }
    if (!objectKey) {
      throw new Error(`${IMAGE_RESOLVE_ERROR_PREFIX}:${url}`);
    }
    if (!base) {
      throw new Error(`${IMAGE_RESOLVE_ERROR_PREFIX}:R2_BASE_UNSET`);
    }
    resolvedUrl = `${base}/${objectKey}`;
  };

  const hydrateFromShortId = async (shortId: string) => {
    const mapping = await supabase
      .selectSingle(`public_cdn_keys?short_id=eq.${cachedEncodeURIComponent(shortId)}&select=object_key,job_id`)
      .catch(() => null);
    if (mapping?.object_key) {
      setObjectKey(String(mapping.object_key));
    }
    if (Number.isFinite(mapping?.job_id)) {
      parentJobId = Number(mapping!.job_id);
    }
    if (!mapping && requireResolvedUrl) {
      throw new Error(`${IMAGE_RESOLVE_ERROR_PREFIX}:${shortId}`);
    }
  };

  const hydrateFromObjectKeyLookup = async () => {
    if (!objectKey || parentJobId !== null) return;
    const result = await supabase
      .selectSingle(`public_cdn_keys?object_key=eq.${cachedEncodeURIComponent(objectKey)}&select=job_id`)
      .catch(() => null);
    if (Number.isFinite(result?.job_id)) {
      parentJobId = Number(result!.job_id);
    }
  };

  const processRelativeImgPath = async (path: string, search: string) => {
    const segment = path.replace(/^\/+/, "").split(/[/\\]/)[0];
    if (!segment) {
      if (requireResolvedUrl) {
        throw new Error(`${IMAGE_RESOLVE_ERROR_PREFIX}:${url}`);
      }
      return;
    }

    if (segment === "direct") {
      const params = new URLSearchParams(search);
      const keyParam = params.get("key") || undefined;
      if (keyParam) {
        setObjectKey(decodeURIComponentSafe(keyParam));
      }
    } else {
      const shortId = segment.replace(/\.[a-z0-9]{2,5}$/i, "");
      if (shortId) {
        await hydrateFromShortId(shortId);
      }
    }
    ensureResolvedUrl();
  };

  try {
    if (url.startsWith("/img/")) {
      const [path, search = ""] = url.slice(5).split("?");
      await processRelativeImgPath(path || "", search);
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/img/")) {
        const rel = parsed.pathname.slice(5);
        await processRelativeImgPath(rel, parsed.search ? parsed.search.slice(1) : "");
      } else {
        const candidateKey = deriveObjectKeyFromUrl(parsed, base);
        if (candidateKey) {
          setObjectKey(candidateKey);
        }
        if (parentJobId === null) {
          const inferred = extractJobIdFromObjectKey(parsed.pathname);
          if (inferred !== null) {
            parentJobId = inferred;
          }
        }
        if (requireResolvedUrl) {
          resolvedUrl = url;
        }
      }
    } else {
      setObjectKey(url);
      ensureResolvedUrl();
    }

    await hydrateFromObjectKeyLookup();

    ensureResolvedUrl();

    return {
      originalUrl: original,
      normalizedUrl: url,
      resolvedUrl,
      parentJobId
    };
  } catch (error) {
    if (requireResolvedUrl) {
      throw error;
    }
    return {
      originalUrl: original,
      normalizedUrl: url,
      resolvedUrl: resolvedUrl ?? url,
      parentJobId
    };
  }
}

export async function resolveCharacterAssociation(options: {
  supabase: SupabaseAdminClient;
  userId: string;
  requestedCharacterId?: string | null;
  references: ImageReferenceInfo[];
  depthLimit?: number;
}): Promise<CharacterAssociationResult> {
  const { supabase, userId, requestedCharacterId, references } = options;
  const depthLimit = normalizeDepthLimit(options.depthLimit);

  if (requestedCharacterId === null) {
    return {
      characterId: null,
      source: "explicit",
      sourceJobId: null,
      shouldUpdate: false
    };
  }

  const trimmedExplicit = typeof requestedCharacterId === "string" ? requestedCharacterId.trim() : "";
  if (trimmedExplicit) {
    const character = await supabase
      .selectSingle(`characters?id=eq.${cachedEncodeURIComponent(trimmedExplicit)}&select=id,user_id,status`)
      .catch(() => null);

    if (!character) {
      throw new CharacterAssociationError("CHARACTER_NOT_FOUND", "The requested character does not exist or has been removed.");
    }

    if (character.user_id && String(character.user_id) !== userId) {
      throw new CharacterAssociationError("CHARACTER_FORBIDDEN", "You cannot use a character owned by another user.");
    }

    if (!isCharacterActive(character)) {
      throw new CharacterAssociationError("CHARACTER_INACTIVE", "The character is inactive and cannot be linked.");
    }

    return {
      characterId: String(character.id),
      source: "explicit",
      sourceJobId: null,
      shouldUpdate: true
    };
  }

  const jobCache = new Map<number, Promise<any | null>>();
  const parentCache = new Map<number, Promise<number[]>>();
  const characterCache = new Map<string, Promise<any | null>>();

  for (const reference of references) {
    const candidateJobId = reference.parentJobId;
    if (!Number.isFinite(candidateJobId)) {
      continue;
    }

    const trace = await traceCharacterLineage({
      supabase,
      jobId: candidateJobId!,
      userId,
      depthLimit,
      jobCache,
      parentCache,
      characterCache
    });

    if (trace.found && trace.characterId) {
      return {
        characterId: trace.characterId,
        source: "auto_inherited",
        sourceJobId: trace.sourceJobId,
        shouldUpdate: true
      };
    }

    if (trace.inactive) {
      return {
        characterId: null,
        source: null,
        sourceJobId: null,
        shouldUpdate: false
      };
    }
  }

  return {
    characterId: null,
    source: null,
    sourceJobId: null,
    shouldUpdate: false
  };
}

function normalizeDepthLimit(input?: number): number {
  if (!Number.isFinite(input)) {
    return DEFAULT_DEPTH_LIMIT;
  }
  const value = Math.floor(Number(input));
  if (value < 1) return 1;
  if (value > 10) return 10;
  return value;
}

function isCharacterActive(record: any): boolean {
  if (!record) return false;
  if (typeof record.status === "string" && record.status.toLowerCase() !== "approved") {
    return false;
  }
  return true;
}

function sanitizeObjectKey(key: string): string {
  return key.replace(/^\/+/, "");
}

function extractJobIdFromObjectKey(value?: string | null): number | null {
  if (!value) return null;
  const match = /\/jobs\/(\d+)\//.exec(value);
  if (match && match[1]) {
    const num = Number(match[1]);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return null;
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function deriveObjectKeyFromUrl(url: URL, base: string): string | null {
  if (base && url.href.startsWith(`${base}/`)) {
    return url.href.slice(base.length + 1);
  }
  if (url.pathname && /\/jobs\/.+/.test(url.pathname)) {
    return url.pathname.replace(/^\//, "");
  }
  return null;
}

interface TraceOptions {
  supabase: SupabaseAdminClient;
  jobId: number;
  userId: string;
  depthLimit: number;
  jobCache: Map<number, Promise<any | null>>;
  parentCache: Map<number, Promise<number[]>>;
  characterCache: Map<string, Promise<any | null>>;
}

interface TraceResult {
  found: boolean;
  inactive: boolean;
  characterId: string | null;
  sourceJobId: number | null;
}

async function traceCharacterLineage(options: TraceOptions): Promise<TraceResult> {
  const { supabase, jobId, userId, depthLimit, jobCache, parentCache, characterCache } = options;
  const visited = new Set<number>();
  const queue: Array<{ jobId: number; depth: number }> = [{ jobId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.jobId)) {
      continue;
    }
    visited.add(current.jobId);

    const job = await fetchJob(supabase, current.jobId, jobCache);
    if (!job) {
      continue;
    }

    const characterId = job.character_id;
    if (characterId) {
      const character = await fetchCharacterRecord(supabase, String(characterId), characterCache);
      if (!character) {
        return { found: false, inactive: true, characterId: null, sourceJobId: null };
      }
      if (character.user_id && String(character.user_id) !== userId) {
        return { found: false, inactive: true, characterId: null, sourceJobId: null };
      }
      if (!isCharacterActive(character)) {
        return { found: false, inactive: true, characterId: null, sourceJobId: null };
      }
      return { found: true, inactive: false, characterId: String(character.id), sourceJobId: current.jobId };
    }

    if (current.depth >= depthLimit) {
      continue;
    }

    const parents = await fetchParentJobIds(supabase, current.jobId, parentCache);
    for (const parentId of parents) {
      if (!visited.has(parentId)) {
        queue.push({ jobId: parentId, depth: current.depth + 1 });
      }
    }
  }

  return { found: false, inactive: false, characterId: null, sourceJobId: null };
}

async function fetchJob(
  supabase: SupabaseAdminClient,
  jobId: number,
  cache: Map<number, Promise<any | null>>
): Promise<any | null> {
  if (!cache.has(jobId)) {
    cache.set(
      jobId,
      supabase
        .selectSingle(`generation_jobs?id=eq.${jobId}&deleted_at=is.null&select=id,character_id,user_id`)
        .catch(() => null)
    );
  }
  return cache.get(jobId)!;
}

async function fetchParentJobIds(
  supabase: SupabaseAdminClient,
  jobId: number,
  cache: Map<number, Promise<number[]>>
): Promise<number[]> {
  if (!cache.has(jobId)) {
    cache.set(
      jobId,
      supabase
        .select(`generation_links?child_job_id=eq.${jobId}&select=parent_job_id&order=created_at.asc`)
        .then((rows: any[]) => {
          if (!Array.isArray(rows)) return [];
          const out: number[] = [];
          for (const row of rows) {
            const parentId = Number(row?.parent_job_id);
            if (Number.isFinite(parentId)) {
              out.push(parentId);
            }
          }
          return out;
        })
        .catch(() => [])
    );
  }
  return cache.get(jobId)!;
}

async function fetchCharacterRecord(
  supabase: SupabaseAdminClient,
  characterId: string,
  cache: Map<string, Promise<any | null>>
): Promise<any | null> {
  if (!cache.has(characterId)) {
    cache.set(
      characterId,
      supabase
        .selectSingle(`characters?id=eq.${cachedEncodeURIComponent(characterId)}&select=id,user_id,status`)
        .catch(() => null)
    );
  }
  return cache.get(characterId)!;
}
