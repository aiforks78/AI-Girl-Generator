import type { Metadata } from "next";
import { apiServerJson } from "@/lib/api-server";
import { buildShareMetaDescription, buildShareMetaTitle, type ShareJobLike } from "@/lib/share-meta";
import PublicViewerClient from "./public-viewer-client";

type PublicViewerParams = {
  public: string;
};

const PUBLIC_VIEWER_FALLBACK_TITLE = "AI Video Preview";
const PUBLIC_VIEWER_FALLBACK_DESCRIPTION =
  "Watch a timelapse of how this AI girl scene was created with Girl Generator and remix the prompt in one click.";

interface PublicGenerationJob extends ShareJobLike {
  video_url?: string | null;
  image_url?: string | null;
  hd_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  action?: string | null;
  public_id?: string | null;
}

interface PublicGenerationResponse {
  job?: PublicGenerationJob | null;
}

export async function generateMetadata({ params }: { params: PublicViewerParams }): Promise<Metadata> {
  const rawPublicId = params.public ?? "";
  const token = rawPublicId.split("-")[0] ?? "";

  if (!token) {
    const fallbackTitle = PUBLIC_VIEWER_FALLBACK_TITLE;
    const fallbackDescription = PUBLIC_VIEWER_FALLBACK_DESCRIPTION;
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        type: "website",
        url: `/v/${rawPublicId}`,
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: fallbackDescription,
      },
      alternates: {
        canonical: `/v/${rawPublicId}`,
      },
    };
  }

  try {
    const data = await apiServerJson<PublicGenerationResponse>(`/public/generation?pid=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    const job = data?.job ?? null;

    const resolvedTitle = buildShareMetaTitle(job);
    const resolvedDescription = buildShareMetaDescription(job);
    const isVideo = String(job?.action || "").toLowerCase() === "img2vid" || Boolean(job?.video_url);
    const mediaUrl = job?.video_url || job?.image_url || job?.hd_url || null;
    const mediaWidth = job?.image_width || null;
    const mediaHeight = job?.image_height || null;

    return {
      title: resolvedTitle,
      description: resolvedDescription,
      openGraph: {
        title: resolvedTitle,
        description: resolvedDescription,
        type: isVideo ? "video.other" : "website",
        url: `/v/${rawPublicId}`,
        ...(mediaUrl
          ? isVideo
            ? {
                videos: [
                  {
                    url: mediaUrl,
                  },
                ],
              }
            : {
                images: [
                  {
                    url: mediaUrl,
                    width: mediaWidth || undefined,
                    height: mediaHeight || undefined,
                    alt: resolvedDescription,
                  },
                ],
              }
          : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: resolvedTitle,
        description: resolvedDescription,
        ...(mediaUrl && !isVideo ? { images: [mediaUrl] } : {}),
      },
      alternates: {
        canonical: `/v/${rawPublicId}`,
      },
    };
  } catch (error) {
    const fallbackTitle = PUBLIC_VIEWER_FALLBACK_TITLE;
    const fallbackDescription = PUBLIC_VIEWER_FALLBACK_DESCRIPTION;
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        type: "website",
        url: `/v/${rawPublicId}`,
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: fallbackDescription,
      },
      alternates: {
        canonical: `/v/${rawPublicId}`,
      },
    };
  }
}

export default function PublicViewerPage({ params }: { params: PublicViewerParams }) {
  return <PublicViewerClient rawPublicId={params.public} />;
}
