"use client";

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { SparklesIcon } from "@/components/icons/local";
// Unified drawer viewer via context
import { useViewer } from "@/contexts/viewer-store";
import { fetchStatus } from "@/lib/status-fetcher";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import HistoryList from "@/components/content/history-list";
import CharacterCard from "@/components/content/character-card";
import ViewToggle from "@/components/common/view-toggle";
import { useAppContext } from "@/contexts/app";
import { FEATURE_COSTS } from "@shared/credit-config";
import { MODEL_IDS, MODEL_LABELS } from "@shared/model-ids";

type JobItem = {
  id: number;
  status: string;
  error_message?: string | null;
  prompt: string;
  action?: 'txt2img' | 'img2img' | 'img2vid';
  aspect_ratio?: string;
  image_url?: string | null;
  hd_url?: string | null;
  image_variants?: string[] | null;
  model_id?: string | null;
  is_public?: boolean | null;
  public_id?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  hd_width?: number | null;
  hd_height?: number | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  character_id?: string | null;
  created_at: string;
  updated_at: string;
};

const STALE_PENDING_THRESHOLD_MS = 5 * 60 * 1000;

function SearchParamOpener({ items, onOpen }: { items: JobItem[]; onOpen: (id: number) => void }) {
  const searchParams = useSearchParams();
  const fetchedOpenRef = React.useRef<number | null>(null);
  useEffect(() => {
    const openId = Number(searchParams.get('open') || '');
    if (!openId) return;
    if (fetchedOpenRef.current === openId) return;
    const found = items.find(i => i.id === openId);
    if (found) {
      fetchedOpenRef.current = openId;
      onOpen(found.id);
      return;
    }
    // If still not found and current list does not contain the task, it means the user has no access or data does not exist, ignore it
  }, [searchParams, items, onOpen]);
  return null;
}

export default function MyContentPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { setIsLoginOpen } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JobItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [pages, setPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const { openViewer } = useViewer();
  const [fav, setFav] = useState<Record<number, boolean>>({});
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [toolFilter, setToolFilter] = useState<string>('all'); // 'txt2img' | 'img2img' | 'all' (we infer txt2img for now)
  const [onlyFav, setOnlyFav] = useState(false);
  const [deleting, setDeleting] = useState<Record<number, boolean>>({});
  const [creatingCharacter, setCreatingCharacter] = useState<Record<number, boolean>>({});
  const CHARACTER_COST = FEATURE_COSTS.create_character ?? 10;
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [pendingCharacterJob, setPendingCharacterJob] = useState<JobItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteJob, setPendingDeleteJob] = useState<JobItem | null>(null);
  // Track poll attempts per job to avoid infinite pending loops
  const pollAttemptsRef = React.useRef<Record<number, number>>({});
  // Character view state
  const [viewMode, setViewMode] = useState<'character' | 'task'>('task');
  const [characters, setCharacters] = useState<any[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [taskCharacterFilter, setTaskCharacterFilter] = useState<string | null>(null);
  // no folded menu now; all actions are visible

  useEffect(() => {
    if (status === "unauthenticated") {
      try {
        setIsLoginOpen(true);
      } catch {}
      router.replace("/");
    }
  }, [status, setIsLoginOpen, router]);

  // Pagination view (restored)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/user/generation/history?page=${page}&limit=${limit}`, { cache: 'no-store' });
        const json = await res.json();
        const list: JobItem[] = json?.data?.items || [];
        const pg = json?.data?.pagination || {};
        setItems(list);
        setPages(pg.pages || 1);
        setHasNext(!!pg.has_next);
        setHasPrev(!!pg.has_prev);
      } finally {
        setLoading(false);
      }
    };
    if (status === 'authenticated') load();
  }, [status, page, limit]);

  // Fetch characters
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        setCharactersLoading(true);
        const res = await apiFetch('/user/characters', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          setCharacters(items);

          if (items.length === 0 || (taskCharacterFilter && !items.some((c: any) => c.id === taskCharacterFilter))) {
            setTaskCharacterFilter(null);
          }

        }
      } finally {
        setCharactersLoading(false);
      }
    };
    if (status === 'authenticated') loadCharacters();
  }, [status, taskCharacterFilter]);

  // Posters and variant enrichment are handled inside HistoryList

  // Auto open viewer drawer when `?open=<id>` is present
  // moved to Suspense-wrapped child SearchParamOpener

  // load favorites from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('gg:favorites');
      if (raw) {
        const parsed = JSON.parse(raw || '{}') || {};
        const normalized: Record<number, boolean> = {};
        Object.keys(parsed).forEach((k) => {
          const n = Number(k);
          if (!Number.isNaN(n)) {
            normalized[n] = !!parsed[k];
          }
        });
        // mirror string keys for compatibility
        Object.keys(normalized).forEach((k) => { (normalized as any)[String(k)] = normalized[Number(k)]; });
        setFav(normalized);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('gg:favorites', JSON.stringify(fav)); } catch {}
  }, [fav]);

  // listen to external favorite updates (e.g., viewer in another route/component)
  useEffect(() => {
    const onFavUpdate = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail || {};
        const id = Number(detail.id);
        const val = !!detail.value;
        if (!id || Number.isNaN(id)) return;
        setFav(prev => {
          const next = { ...prev, [id]: val } as Record<number, boolean>;
          (next as any)[String(id)] = val;
          try { localStorage.setItem('gg:favorites', JSON.stringify(next)); } catch {}
          return next;
        });
      } catch {}
    };
    window.addEventListener('favorites:update', onFavUpdate as EventListener);
    return () => window.removeEventListener('favorites:update', onFavUpdate as EventListener);
  }, []);

  const openItem = (item: JobItem) => { openViewer(item.id); };

  const isFavorite = (id?: number | null) => {
    if (!id && id !== 0) return false;
    return !!(fav[id as number] || (fav as any)[String(id)]);
  };

  const prettyStatus = (s: string) => {
    if (!s) return '—';
    const v = s.toLowerCase();
    if (v === 'preview_ready' || v === 'img2img_ready' || v === 'hd_ready' || v === 'completed' || v === 'ready') return 'ready';
    if (v === 'pending' || v === 'processing') return 'pending';
    if (v === 'failed' || v === 'error') return 'failed';
    if (v === 'blocked') return 'blocked';
    return v;
  };

  // Poll non-final jobs to keep status fresh (e.g., move from pending->failed)
  const isFinalStatus = (s?: string | null) => /\b(ready|completed|succeeded|failed|blocked|img2img_ready|hd_ready)\b/i.test(String(s||''));
  const itemsRef = React.useRef<JobItem[]>(items);
  React.useEffect(() => { itemsRef.current = items; }, [items]);
  React.useEffect(() => {
    let stop = false;
    const pollOnce = async () => {
      const list = itemsRef.current || [];
      const staleReplacements = new Map<number, JobItem>();
      const pendings = list
        .filter((it) => {
          if (isFinalStatus(it.status)) return false;
          const updatedAt = Date.parse(it.updated_at || it.created_at || "");
          if (!Number.isNaN(updatedAt) && Date.now() - updatedAt > STALE_PENDING_THRESHOLD_MS) {
            staleReplacements.set(it.id, {
              ...it,
              status: "failed",
              error_message: it.error_message || "Result expired. Please regenerate."
            });
            delete pollAttemptsRef.current[it.id];
            return false;
          }
          return true;
        })
        .slice(0, 6);

      if (staleReplacements.size > 0) {
        const current = itemsRef.current || [];
        let staleChanged = false;
        const applied = current.map((item) => {
          const replacement = staleReplacements.get(item.id);
          if (replacement) {
            staleChanged = true;
            return replacement;
          }
          return item;
        });
        if (staleChanged) {
          itemsRef.current = applied;
          setItems(applied);
        }
      }

      if (pendings.length === 0) return;
      try {
        const updates = await Promise.all(pendings.map(async (it) => {
          try {
            const attempts = (pollAttemptsRef.current[it.id] || 0) + 1;
            pollAttemptsRef.current[it.id] = attempts;
            if (attempts >= 30) {
              // After ~5 minutes, mark as stalled and stop polling (frontend display only, not written to server)
              return { ...it, status: 'failed', error_message: it.error_message || 'Stalled (timeout) — marked failed locally' } as JobItem;
            }
            const j = await fetchStatus(it.id, 'content:poll') as any;
            if (!j) return it;
            const job = j?.job || {};
            const ns = String(job.status || it.status || '');
            const img = job.image_url || job.hd_url || it.image_url || it.hd_url || null;
            const err = job.error_message || it.error_message || null;
            if (/\b(ready|completed|succeeded|failed|blocked|img2img_ready|hd_ready)\b/i.test(ns)) {
              delete pollAttemptsRef.current[it.id];
            }
            return { ...it, status: ns, image_url: img, error_message: err } as JobItem;
          } catch { return it; }
        }));
        if (stop) return;
        // Only update when actual changes exist to avoid render/poll loops
        const current = itemsRef.current;
        let changed = false;
        const next = current.map(p => {
          const u = updates.find(x => x.id === p.id);
          if (!u) return p;
          if (p.status !== u.status || (p.image_url||p.hd_url) !== (u.image_url||u.hd_url) || (p.error_message||'') !== (u.error_message||'')) {
            changed = true;
            return u;
          }
          return p;
        });
        if (changed) {
          itemsRef.current = next;
          setItems(next);
        }
      } catch {}
    };
    const h = setInterval(pollOnce, 10_000);
    // initial tick
    void pollOnce();
    return () => { stop = true; clearInterval(h); };
  }, []);

  // Model label handled in HistoryList

  const handleCreateCharacter = async (job: JobItem) => {
    if (creatingCharacter[job.id]) return;
    if (prettyStatus(job.status) !== 'ready') {
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
      setItems((prev) => prev.map((item) => (
        item.id === job.id
          ? { ...item, character_id: data?.data?.character_id ?? 'created' }
          : item
      )));
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

  const deleteJob = async (id: number) => {
    if (deleting[id]) return false;
    setDeleting(prev => ({ ...prev, [id]: true }));
    try { window.dispatchEvent(new CustomEvent('global:loading', { detail: true })); } catch {}
    try {
      const r = await apiFetch('/user/generation/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: id }) });
      if (!r.ok) {
        const j = await r.json().catch(()=>({}));
        toast.error(j?.error?.message || 'Delete failed');
        return false;
      }
      setItems(prev => prev.filter(x => x.id !== id));
      toast.success('Deleted');
      return true;
    } catch {
      toast.error('Delete failed');
      return false;
    } finally {
      setDeleting(prev => { const n={...prev}; delete n[id]; return n; });
      try { window.dispatchEvent(new CustomEvent('global:loading', { detail: false })); } catch {}
    }
  };

  const openDeleteConfirm = (job: JobItem) => {
    setPendingDeleteJob(job);
    setShowDeleteModal(true);
  };

  const closeDeleteConfirm = () => {
    if (pendingDeleteJob && deleting[pendingDeleteJob.id]) return;
    setShowDeleteModal(false);
    setPendingDeleteJob(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteJob) return;
    const jobId = pendingDeleteJob.id;
    const success = await deleteJob(jobId);
    if (success) {
      setShowDeleteModal(false);
      setPendingDeleteJob(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-full bg-gray-950 text-white pt-[72px]">
        <div className="max-w-7xl mx-auto px-4 py-8 text-white/70">Loading…</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <Suspense fallback={<div className="min-h-full bg-gray-950 text-white pt-[72px]"><div className="max-w-7xl mx-auto px-4 py-8 text-white/70">Loading…</div></div>}>
    <div className="min-h-full bg-gray-950 text-white pt-[72px]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Content</h1>
          <Link
            href="/account"
            className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm"
          >Back to Account</Link>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <ViewToggle
            value={viewMode}
            onChange={(mode) => {
              setViewMode(mode);
              if (mode === 'character') {
                setTaskCharacterFilter(null);
              }
            }}
            size="md"
          />
          {viewMode === 'task' && taskCharacterFilter && (
            <button
              onClick={() => setTaskCharacterFilter(null)}
              className="px-3 py-1.5 text-xs rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 transition"
            >
              Viewing tasks for selected character · Clear
            </button>
          )}
        </div>

        {/* Filter Bar - Only show for Task View */}
        {viewMode === 'task' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 flex items-center gap-4 flex-wrap">
            <div className="text-sm text-white/70">Filter:</div>
            <select
              className="px-3 py-2 rounded-lg bg-[#111827] border border-gray-700 text-sm"
              value={toolFilter}
              onChange={(e) => { setToolFilter(e.target.value); setPage(1); }}
              title="Tool"
            >
              <option value="all">All tools</option>
              <option value="txt2img">Text to Image</option>
              <option value="img2img">Image to Image</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg bg-[#111827] border border-gray-700 text-sm"
              value={modelFilter}
              onChange={(e) => { setModelFilter(e.target.value); setPage(1); }}
              title="Model"
            >
              <option value="all">All models</option>
              <option value={MODEL_IDS.PRIMARY_TXT2IMG}>{MODEL_LABELS[MODEL_IDS.PRIMARY_TXT2IMG]}</option>
              <option value={MODEL_IDS.IMG2IMG}>{MODEL_LABELS[MODEL_IDS.IMG2IMG]}</option>
              <option value={MODEL_IDS.INLINE_TXT2IMG}>{MODEL_LABELS[MODEL_IDS.INLINE_TXT2IMG]}</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-white/80 ml-auto">
              <input type="checkbox" checked={onlyFav} onChange={(e) => { setOnlyFav(e.target.checked); setPage(1); }} /> Favorites
            </label>
          </div>
        )}

        {/* Auto-open viewer via search param, wrapped in Suspense at page level */}
        <SearchParamOpener items={items} onOpen={(id) => openViewer(id)} />

        {viewMode === 'character' ? (
          // Character View
          charactersLoading ? (
            <div className="flex items-center justify-center py-24 text-white/70">
              <SparklesIcon className="w-6 h-6 mr-2 animate-spin text-purple-500" /> Loading characters...
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-24 text-white/70">
              <p className="mb-4">No characters created yet.</p>
              <p className="text-sm text-white/50">Create a character from any generation task!</p>
              <button
                onClick={() => setViewMode('task')}
                className="mt-4 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm"
              >
                Switch to Tasks
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {characters.map(character => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onPreview={(jobId) => openViewer(jobId)}
                />
              ))}
            </div>
          )
        ) : (
          // Task View
          loading ? (
            <div className="flex items-center justify-center py-24 text-white/70">
              <SparklesIcon className="w-6 h-6 mr-2 animate-spin text-purple-500" /> Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-24 text-white/70">No content yet. Try creating one in AI Image Generator.</div>
          ) : (
            <>
              {/* Row feed with unified HistoryList rendering */}
              <div className="space-y-4">
                <HistoryList
                  items={items
                    .filter(it => !taskCharacterFilter || (it as any).character_id === taskCharacterFilter)
                    .filter(it => {
                      if (modelFilter === 'all') return true;
                      const raw = String(it.model_id || '').toLowerCase().replace(/\s+/g, '-');
                      const normalized = (() => {
                        if (raw === MODEL_IDS.PRIMARY_TXT2IMG.toLowerCase() || raw.includes('flux-schnell')) {
                          return MODEL_IDS.PRIMARY_TXT2IMG;
                        }
                        if (raw === MODEL_IDS.INLINE_TXT2IMG.toLowerCase() || raw === 'banana' || raw === 'nano-banana') {
                          return MODEL_IDS.INLINE_TXT2IMG;
                        }
                        if (raw === MODEL_IDS.IMG2IMG.toLowerCase() || raw.includes('seedream')) {
                          return MODEL_IDS.IMG2IMG;
                        }
                        if (raw.includes('kontext-pro')) {
                          return MODEL_IDS.PREMIUM_TXT2IMG;
                        }
                        if (raw.includes('kontext-max')) {
                          return MODEL_IDS.MAX_TXT2IMG;
                        }
                        return raw;
                      })();
                      return normalized === modelFilter;
                    })
                    .filter(it => {
                    const a = String((it as any).action || '').toLowerCase();
                    const st = String(it.status || '').toLowerCase();
                    const isImg2Img = a === 'img2img' || st.includes('img2img');
                    if (toolFilter === 'img2img') return isImg2Img;
                    if (toolFilter === 'txt2img') return !isImg2Img;
                    return true; // all
                    })
                    .filter(it => !onlyFav || isFavorite(it.id)) as any}
                  onOpen={(it: any) => openItem(it)}
                  renderActions={(it: any) => {
                  const statusLabel = prettyStatus(it.status);
                  const actions: React.ReactNode[] = [];

                  if (statusLabel === 'ready' && !it.character_id) {
                    actions.push(
                      <button
                        key="create"
                        onClick={(e) => { e.stopPropagation?.(); handleCreateCharacter(it); }}
                        disabled={!!creatingCharacter[it.id]}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>✨</span>
                        <span>{creatingCharacter[it.id] ? 'Creating…' : 'Create Character'}</span>
                      </button>
                    );
                  }

                  const isDeleting = !!deleting[it.id];
                  actions.push(
                    <button
                      key="delete"
                      onClick={(e) => { e.stopPropagation?.(); openDeleteConfirm(it); }}
                      disabled={isDeleting}
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  );

                  return <>{actions}</>;
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="text-xs text-white/60">Page {page} of {pages}</div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm disabled:opacity-50"
                  disabled={!hasPrev || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >Prev</button>
                <button
                  className="px-3 py-1.5 rounded-lg border border-gray-700 bg-[#111827] text-white text-sm disabled:opacity-50"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                >Next</button>
              </div>
            </div>
          </>
          )
        )}
      </div>

      {/* Character Creation Modal */}
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

      {/* Unified drawer viewer handled globally */}
    </div>
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
