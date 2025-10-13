import type { Metadata } from "next";
import ContentViewerClient from "./content-viewer-client";
import { apiServerJson } from "@/lib/api-server";

type ContentParams = {
  id: string;
};

interface ContentMetadataResponse {
  title?: string | null;
  promptSnippet?: string | null;
}

const CONTENT_FALLBACK_TITLE = "AI Content Viewer";
const CONTENT_FALLBACK_DESCRIPTION =
  "Preview AI-generated content and track creation details with Girl Generator.";

export async function generateMetadata({ params }: { params: ContentParams }): Promise<Metadata> {
  const rawId = params.id ?? "";
  const idMatch = String(rawId).match(/^(\d+)/);

  const canonicalPath = `/content/${rawId}`;

  if (!idMatch) {
    const fallbackTitle = CONTENT_FALLBACK_TITLE;
    return {
      title: fallbackTitle,
      description: CONTENT_FALLBACK_DESCRIPTION,
      openGraph: {
        title: `${fallbackTitle} | Girl Generator`,
        description: CONTENT_FALLBACK_DESCRIPTION,
      },
      twitter: {
        title: `${fallbackTitle} | Girl Generator`,
        description: CONTENT_FALLBACK_DESCRIPTION,
      },
      alternates: {
        canonical: canonicalPath,
      },
    };
  }

  const numericId = idMatch[0];

  try {
    const data = await apiServerJson<ContentMetadataResponse>(`/api/content/${numericId}`, {
      cache: "no-store",
    });

    const title = data?.title?.trim();
    const snippet = data?.promptSnippet?.trim();

    const resolvedTitle = title && title.length > 0 ? title : CONTENT_FALLBACK_TITLE;
    const resolvedDescription = snippet && snippet.length > 0 ? snippet.slice(0, 160) : CONTENT_FALLBACK_DESCRIPTION;

    return {
      title: resolvedTitle,
      description: resolvedDescription,
      openGraph: {
        title: `${resolvedTitle} | Girl Generator`,
        description: resolvedDescription,
      },
      twitter: {
        title: `${resolvedTitle} | Girl Generator`,
        description: resolvedDescription,
      },
      alternates: {
        canonical: canonicalPath,
      },
    };
  } catch (error) {
    const fallbackTitle = CONTENT_FALLBACK_TITLE;
    return {
      title: fallbackTitle,
      description: CONTENT_FALLBACK_DESCRIPTION,
      openGraph: {
        title: `${fallbackTitle} | Girl Generator`,
        description: CONTENT_FALLBACK_DESCRIPTION,
      },
      twitter: {
        title: `${fallbackTitle} | Girl Generator`,
        description: CONTENT_FALLBACK_DESCRIPTION,
      },
      alternates: {
        canonical: canonicalPath,
      },
    };
  }
}

export default function ContentViewerPage({ params }: { params: ContentParams }) {
  return <ContentViewerClient rawId={params.id} />;
}
