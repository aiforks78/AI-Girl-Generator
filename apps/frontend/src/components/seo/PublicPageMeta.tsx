"use client";

import Head from 'next/head';
import type { Job } from '@/types/generation';
import { buildShareMetaDescription, buildShareMetaTitle } from '@/lib/share-meta';

interface PublicPageMetaProps {
  job: Job;
}

export default function PublicPageMeta({ job }: PublicPageMetaProps) {
  const title = buildShareMetaTitle(job);
  const description = buildShareMetaDescription(job);
  
  const imageUrl = job?.image_url || (job as any)?.hd_url;
  const videoUrl = (job as any)?.video_url;
  
  const isVideo = (String((job as any)?.action || '').toLowerCase() === 'img2vid') || !!videoUrl;
  const mediaUrl = isVideo ? videoUrl : imageUrl;
  const mediaType = isVideo ? 'video' : 'image';
  
  const canonicalUrl = `${window.location.origin}/v/${(job as any)?.public_id}`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={isVideo ? "video.other" : "website"} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Girl Generator" />
      
      {mediaUrl && (
        <>
          <meta property={`og:${mediaType}`} content={mediaUrl} />
          <meta property={`og:${mediaType}:secure_url`} content={mediaUrl} />
          {!isVideo && (
            <>
              <meta property="og:image:width" content={String(job?.image_width || 1024)} />
              <meta property="og:image:height" content={String(job?.image_height || 1024)} />
              <meta property="og:image:alt" content={description} />
            </>
          )}
          {isVideo && (
            <>
              <meta property="og:video:type" content="video/mp4" />
              <meta property="og:video:width" content={String(job?.image_width || 1024)} />
              <meta property="og:video:height" content={String(job?.image_height || 1024)} />
            </>
          )}
        </>
      )}
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={isVideo ? "player" : "summary_large_image"} />
      <meta name="twitter:site" content="@girlgenerator" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {mediaUrl && !isVideo && (
        <meta name="twitter:image" content={mediaUrl} />
      )}
      {isVideo && videoUrl && (
        <>
          <meta name="twitter:player" content={videoUrl} />
          <meta name="twitter:player:width" content={String(job?.image_width || 1024)} />
          <meta name="twitter:player:height" content={String(job?.image_height || 1024)} />
        </>
      )}
      
      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#7c3aed" />
      
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": isVideo ? "VideoObject" : "ImageObject",
            "name": title,
            "description": description,
            "url": canonicalUrl,
            "creator": {
              "@type": "Organization",
              "name": "Girl Generator"
            },
            "dateCreated": job?.created_at,
            "contentUrl": isVideo ? videoUrl : imageUrl,
            ...(isVideo ? {
              "videoFrameSize": `${job?.image_width || 1024}x${job?.image_height || 1024}`
            } : {
              "width": job?.image_width || 1024,
              "height": job?.image_height || 1024
            })
          })
        }}
      />
    </Head>
  );
}
