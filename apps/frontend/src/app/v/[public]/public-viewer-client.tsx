"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Job } from "@/types/generation";
import EmbeddedViewer from "@/components/generation/EmbeddedViewer";
import PublicPageMeta from "@/components/seo/PublicPageMeta";
import { apiFetch } from "@/lib/api-client";

interface PublicViewerClientProps {
  rawPublicId: string;
}

export default function PublicViewerClient({ rawPublicId }: PublicViewerClientProps) {
  const search = useSearchParams();
  const token = rawPublicId.split("-")[0];
  const source = search.get("source") || "";
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setJob(null);

    try {
      apiFetch("/public/track", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pid: token, source }),
      });
    } catch {}

    let cancelled = false;

    (async () => {
      try {
        const response = await apiFetch(`/public/generation?pid=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });

        if (cancelled) return;

        if (!response.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        const jobData = data?.job;

        if (cancelled) return;

        if (jobData) {
          setJob(jobData);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error("[PublicViewer] Error:", error);
        if (!cancelled) {
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, source]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Content Not Found</h1>
          <p className="text-white/70">This shared content is no longer available or may have been removed.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-white/70">Failed to load content. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PublicPageMeta job={job} />
      <EmbeddedViewer job={job} />
    </>
  );
}
