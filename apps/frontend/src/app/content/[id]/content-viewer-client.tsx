"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { debugStatusFetch } from "@/lib/debug-status";
import { fetchStatus } from "@/lib/status-fetcher";

interface ContentViewerClientProps {
  rawId: string;
}

export default function ContentViewerClient({ rawId }: ContentViewerClientProps) {
  const router = useRouter();
  const idMatch = String(rawId || "").match(/^(\d+)/);
  const jobId = idMatch ? Number(idMatch[0]) : NaN;

  useEffect(() => {
    if (!jobId || Number.isNaN(jobId)) return;

    (async () => {
      try {
        try {
          debugStatusFetch(jobId, "content:page-id-open");
        } catch {}

        const response = await fetchStatus(jobId, "content:page-id-open");
        const job: any = (response as any)?.job || {};

        if (job?.is_public && job?.public_id) {
          router.replace(`/v/${job.public_id}?source=share`);
        } else {
          router.replace(`/content?open=${jobId}`);
        }
      } catch {
        router.replace(`/content?open=${jobId}`);
      }
    })();
  }, [jobId, router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  );
}
