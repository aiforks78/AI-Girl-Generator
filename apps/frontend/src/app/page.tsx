import type { Metadata } from "next";
import React from "react";
import Link from "next/link";
import Script from "next/script";
import GalleryHero from "@/components/landingpage/modern/gallery-hero";
import Benefits from "@/components/landingpage/modern/benefits";
import Workflow from "@/components/landingpage/modern/workflow";
import FinalCTA from "@/components/landingpage/modern/final-cta-new";
import FAQ from "@/components/landingpage/modern/faq-new";
import { buildImageUrl, resolvePublicAssetUrl } from "@/lib/url-utils";

export const metadata: Metadata = {
  title: "Girl Generator: AI Girl Image & Video Creation Platform",
  description:
    "Create characters with Girl Generator—an AI girl generator—and expand them into stunning lifestyle photos and cinematic videos for high-quality commercial use.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Girl Generator | Free AI Image Generator 2025",
    description: "Create characters with Girl Generator—an AI girl generator—and expand them into stunning lifestyle photos and cinematic videos for high-quality commercial use.",
    images: [
      {
        url: "/resources/example3.png",
        alt: "Sample AI-generated girl portrait from Girl Generator",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Girl Generator | Free AI Image Generator 2025",
    description: "Create characters with Girl Generator—an AI girl generator—and expand them into stunning lifestyle photos and cinematic videos for high-quality commercial use.",
    images: [
      {
        url: "/resources/example3.png",
        alt: "Sample AI-generated girl portrait from Girl Generator",
      },
    ],
  }
};

export default function HomePage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://girlgenerator.net";

  // Use CDN directly for static sample video to enable browser caching
  const sampleVideoAbsolute = (() => {
    const cdnBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
    if (cdnBase) {
      return `${cdnBase}/public/Sample/sample_video.mp4`;
    }
    return buildImageUrl({ base: resolvePublicAssetUrl('public/Sample/sample_video.mp4'), raw: true });
  })();

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Girl Generator",
    description:
      "Credits-based AI platform for generating photorealistic portraits, branded scenes, and motion clips with commercial licensing.",
    image: `${siteUrl}/resources/example3.png`,
    brand: {
      "@type": "Brand",
      name: "Girl Generator"
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "199",
      offerCount: 3,
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/pricing`
    }
  };

  const videoJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: "Girl Generator demo",
    description: "See how Girl Generator turns text prompts into photorealistic portraits and motion clips in minutes.",
    thumbnailUrl: [`${siteUrl}/resources/example3.png`],
    uploadDate: "2025-09-30",
    duration: "PT0M8S",
    contentUrl: sampleVideoAbsolute,
    embedUrl: sampleVideoAbsolute,
    publisher: {
      "@type": "Organization",
      name: "Girl Generator",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`
      }
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Text to image",
        item: `${siteUrl}/text-to-image`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Image to video",
        item: `${siteUrl}/image-to-video`
      }
    ]
  };

  return (
    <>
      <Script id="product-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Script id="video-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />
      <Script id="breadcrumb-structured-data" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div className="relative overflow-visible">
        <GalleryHero
          getStartedHref="/text-to-image"
        />

      {/* How It Works - Core conversion section */}
      <Workflow />

      {/* Quick Start Guide - Timeline Style */}
      <section className="relative bg-gradient-to-b from-black via-purple-950/10 to-black py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
              From Idea to Video in Minutes
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Our streamlined workflow takes you from concept to complete content library
            </p>
          </div>

          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 opacity-30" style={{ top: '2rem' }}></div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Step 1 */}
              <div className="relative">
                <div className="flex flex-col items-center md:items-start">
                  <div className="relative z-10 h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-xl shadow-purple-500/50">
                    1
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3 text-center md:text-left">Text → Portrait</h3>
                  <p className="text-white/60 text-sm mb-4 text-center md:text-left leading-relaxed">
                    Describe your character in natural language. Get photorealistic results in 30 seconds.
                  </p>
                  <Link
                    href="/text-to-image"
                    className="text-purple-400 hover:text-purple-300 font-medium text-sm transition-colors inline-flex items-center gap-1"
                  >
                    Try now →
                  </Link>
                </div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="flex flex-col items-center md:items-start">
                  <div className="relative z-10 h-16 w-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-xl shadow-pink-500/50">
                    2
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3 text-center md:text-left">Portrait → Scenes</h3>
                  <p className="text-white/60 text-sm mb-4 text-center md:text-left leading-relaxed">
                    Transform into lifestyle photos with consistent identity across every variation.
                  </p>
                  <Link
                    href="/image-to-image"
                    className="text-pink-400 hover:text-pink-300 font-medium text-sm transition-colors inline-flex items-center gap-1"
                  >
                    Explore →
                  </Link>
                </div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="flex flex-col items-center md:items-start">
                  <div className="relative z-10 h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6 shadow-xl shadow-blue-500/50">
                    3
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3 text-center md:text-left">Scenes → Video</h3>
                  <p className="text-white/60 text-sm mb-4 text-center md:text-left leading-relaxed">
                    Animate any scene with natural motion. Export cinematic 8-second clips.
                  </p>
                  <Link
                    href="/image-to-video"
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors inline-flex items-center gap-1"
                  >
                    Start creating →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <Link
              href="/text-to-image"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-full hover:scale-105 transition-transform shadow-lg"
            >
              Start Your First Generation
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Girl Generator */}
      <section id="why-choose-us" className="bg-black py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
              Why Choose Our AI Girl Generator
            </h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              Advanced AI girl generator models, affordable pricing, and commercial-ready results
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">Multiple AI Models</div>
              <h3 className="text-lg font-semibold text-white mb-3">Latest Technology</h3>
              <p className="text-white/70 text-sm">
                Powered by a curated stack of starter, premium, remix, and video engines—plus the core starter model for free-tier runs
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold text-green-400 mb-2">Daily Bonus</div>
              <h3 className="text-lg font-semibold text-white mb-3">Free Credits Every Day</h3>
              <p className="text-white/70 text-sm">
                Test prompts, variations, and video upgrades without friction. Daily login bonuses keep your creative workflow flowing.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-2">Commercial Ready</div>
              <h3 className="text-lg font-semibold text-white mb-3">Production Assets</h3>
              <p className="text-white/70 text-sm">
                Review metadata, costs, and licensing trails before publishing. Every asset includes prompt guardrails and CDN delivery for brand consistency.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold text-pink-400 mb-2">Fast Generation</div>
              <h3 className="text-lg font-semibold text-white mb-3">Quick Results</h3>
              <p className="text-white/70 text-sm">
                Get high-quality images in 30-60 seconds, videos in under 3 minutes
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold text-cyan-400 mb-2">Identity Lock</div>
              <h3 className="text-lg font-semibold text-white mb-3">Consistent Characters</h3>
              <p className="text-white/70 text-sm">
                The AI girl generator preserves facial identity and body ratio across portraits, lifestyle sets, and motion clips.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-2xl font-bold text-amber-400 mb-2">Team Workflow</div>
              <h3 className="text-lg font-semibold text-white mb-3">Collaboration Ready</h3>
              <p className="text-white/70 text-sm">
                Shared libraries, audit trails, and credits dashboards keep cross-functional squads aligned on every AI girl generator project.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/pricing"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 font-semibold text-white rounded-full hover:scale-105 transition-transform shadow-lg"
            >
              View Pricing Plans
            </Link>
          </div>
        </div>
      </section>

      <Benefits />
      <div id="faq-section">
        <FAQ />
      </div>
      <FinalCTA getStartedHref="/text-to-image" />
    </div>
    </>
  );
}
