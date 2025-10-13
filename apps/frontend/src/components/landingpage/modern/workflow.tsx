"use client";

import React from "react";
import { Type, Image, Layers, Play, Download } from "lucide-react";
import { useViewer } from "@/contexts/viewer-store";
import type { Job } from "@/types/generation";
import { buildImageUrl, resolvePublicAssetUrl } from "@/lib/url-utils";
import { MODEL_IDS } from "@shared/model-ids";
import { generateImageAlt } from "@/lib/image-alt";

// Use CDN directly for static workflow demo video to enable browser caching
const WORKFLOW_VIDEO_URL = (() => {
  const cdnBase = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  if (cdnBase) {
    return `${cdnBase}/public/users/a9/a920e4d9-2c9e-55b1-a84a-d7b5ad28e536/results/2025/09/16/jobs/129/video.mp4`;
  }
  return resolvePublicAssetUrl('public/users/a9/a920e4d9-2c9e-55b1-a84a-d7b5ad28e536/results/2025/09/16/jobs/129/video.mp4');
})();

// Real job data for homepage demonstration (job_id=137)
const EXAMPLE_IMAGE_URL = buildImageUrl({
  base: '/img/g36RJ8hzW6Lcpk4p7IZiE1MJ1n',
  preview: true,
  width: 1400,
  fmt: 'webp',
  quality: 85,
  watermark: true,
  wmVersion: 'v4'
});

const exampleJob: Job = {
  id: 137,
  prompt: "20-year-old European woman, luxuriously wavy chest-length hair, full lips, sharp jawline, voluptuous hourglass figure, wearing a one-shoulder champagne-satin midi dress with a thigh-high slit, minimal gold jewelry, flawless studio lighting, Vogue editorial style",
  model_id: MODEL_IDS.PREMIUM_TXT2IMG,
  action: "txt2img",
  status: "completed",
  image_url: EXAMPLE_IMAGE_URL,
  image_variants: [
    EXAMPLE_IMAGE_URL
  ],
  aspect_ratio: "16:9",
  image_width: 2048,
  image_height: 1152,
  created_at: "2024-01-15T10:30:00Z",
  user_name: "Girl Generator",
  user_avatar: "/white-logo-32.png",
  is_public: true
};

// Example job data for step 3 variations (img2img) - left shows original, right shows variants
const VARIATION_1_URL = buildImageUrl({ base: '/img/CtFS8UOOjX1Y1sZA0HZ18fo7R6', preview: true, width: 290, fmt: 'webp', quality: 75, watermark: true });
const VARIATION_2_URL = buildImageUrl({ base: '/img/Tbf5qvhl321oPsudfOMj7GkjFE', preview: true, width: 290, fmt: 'webp', quality: 75, watermark: true });
const VARIATION_3_URL = buildImageUrl({ base: '/img/zPFEJPF3FBGRIjfEmqm2NPTNLs', preview: true, width: 290, fmt: 'webp', quality: 75, watermark: true });
const VARIATION_4_URL = buildImageUrl({ base: '/img/I3sEx59T9nh9XV4BUyI5CAZARq', preview: true, width: 290, fmt: 'webp', quality: 75, watermark: true });
const VARIATION_EXTERNAL_URL = buildImageUrl({ base: '/img/QX8jUbaOtCFM0eo6jh0KaVjGiv', preview: true, width: 290, fmt: 'webp', quality: 75, watermark: true });
const VIDEO_PREVIEW_GRID_URL = buildImageUrl({ base: '/img/CtFS8UOOjX1Y1sZA0HZ18fo7R6', preview: true, width: 400, fmt: 'webp', quality: 85, watermark: true, wmVersion: 'v4' });

const variationJob1: Job = {
  id: 999998,
  prompt: "Keep original face and body. Scene: front passenger seat of a modern car, afternoon sun casting soft highlights. Wardrobe: fitted ribbed tank in nude beige, high-waist jeans. Hands holding phone slightly above eye level, clean dashboard blur behind.",
  model_id: MODEL_IDS.INLINE_TXT2IMG,
  action: "img2img",
  status: "completed",
  image_url: VARIATION_1_URL,
  image_variants: [
    VARIATION_1_URL,
    VARIATION_EXTERNAL_URL
  ],
  related: {
    parents: [],
    children: [],
    external_sources: [VARIATION_EXTERNAL_URL]
  },
  aspect_ratio: "1:1",
  image_width: 2048,
  image_height: 2048,
  created_at: "2025-09-15T23:18:39Z",
  user_name: "Girl Generator",
  user_avatar: "/white-logo-32.png",
  is_public: true
};

const variationJob2: Job = {
  id: 999999,
  prompt: "Keep original face and body. Place her sitting up in crisp white sheets, messy yet aesthetic bed, early-morning window light. Outfit: oversized white cotton shirt slipping off one shoulder, hint of collarbone. Soft haze, cozy bedroom mood, neutral tones.",
  model_id: MODEL_IDS.INLINE_TXT2IMG,
  action: "img2img",
  status: "completed",
  image_url: VARIATION_2_URL,
  image_variants: [
    VARIATION_2_URL,
    VARIATION_EXTERNAL_URL
  ],
  related: {
    parents: [],
    children: [],
    external_sources: [VARIATION_EXTERNAL_URL]
  },
  aspect_ratio: "1:1",
  image_width: 2048,
  image_height: 2048,
  created_at: "2025-09-15T23:18:39Z",
  user_name: "Girl Generator",
  user_avatar: "/white-logo-32.png",
  is_public: true
};

const variationJob3: Job = {
  id: 1000000,
  prompt: "Keep original face and body. Move her into a rustic coffee-shop interior, seated at the bar, holding a latte with foam art. Clothing: sage-green fitted knit tank, casual yet chic. Warm tungsten pendant lights above, soft window glow behind, relaxed cozy ambience.",
  model_id: MODEL_IDS.INLINE_TXT2IMG,
  action: "img2img",
  status: "completed",
  image_url: VARIATION_3_URL,
  image_variants: [
    VARIATION_3_URL,
    VARIATION_EXTERNAL_URL
  ],
  related: {
    parents: [],
    children: [],
    external_sources: [VARIATION_EXTERNAL_URL]
  },
  aspect_ratio: "1:1",
  image_width: 2048,
  image_height: 2048,
  created_at: "2025-09-15T23:18:39Z",
  user_name: "Girl Generator",
  user_avatar: "/white-logo-32.png",
  is_public: true
};

const variationJob4: Job = {
  id: 1000001,
  prompt: "Keep original face and body. Place the girl in a tidy bedroom, standing in front of a full-length mirror, holding a phone for a mirror selfie. Dress her in a fitted white ribbed tank top and high-rise denim shorts. Add soft daylight coming from a side window, gentle shadows, crisp reflection on the glass.",
  model_id: MODEL_IDS.INLINE_TXT2IMG,
  action: "img2img",
  status: "completed",
  image_url: VARIATION_4_URL,
  image_variants: [
    VARIATION_4_URL,
    VARIATION_EXTERNAL_URL
  ],
  related: {
    parents: [],
    children: [],
    external_sources: [VARIATION_EXTERNAL_URL]
  },
  aspect_ratio: "1:1",
  image_width: 2048,
  image_height: 2048,
  created_at: "2025-09-15T23:18:39Z",
  user_name: "Girl Generator",
  user_avatar: "/white-logo-32.png",
  is_public: true
};

// Example job data for step 4 video generation
const VIDEO_PREVIEW_URL = buildImageUrl({
  base: '/img/CtFS8UOOjX1Y1sZA0HZ18fo7R6',
  preview: true,
  width: 290,
  fmt: 'webp',
  quality: 75,
  watermark: true,
  wmVersion: 'v4'
});

const VIDEO_THUMBNAIL_URL = buildImageUrl({
  base: VIDEO_PREVIEW_URL,
  preview: true,
  width: 512,
  fmt: 'webp',
  quality: 85,
  watermark: true,
  wmVersion: 'v4'
});

const videoExampleJob: Job = {
  id: 1000002,
  prompt: "Keep original face and body.\n\n8-second 16:9 cinematic video.\nLate-afternoon golden hour in a scenic overlook parking spot.\nCamera begins two meters outside the passenger-side door, showing the parked sedan against a sun-drenched horizon; slowly tracks forward into the open door until the frame ends on a medium close-up of the curvy 20-year-old woman.\nShe sits angled toward camera, fitted beige ribbed tank and high-waist jeans emphasizing an hourglass figure, one hand brushing hair.\nSunset light paints warm highlights on her hair and shoulders; distant hills and sky blur into bokeh as the camera closes in.\nSmooth steadicam motion, shallow depth of field, cinematic color grade, no text or logos, 24 fps natural ambience.",
  model_id: "veo-3-fast",
  action: "img2vid",
  status: "completed",
  image_url: WORKFLOW_VIDEO_URL,
  video_url: WORKFLOW_VIDEO_URL,
  image_variants: [
    WORKFLOW_VIDEO_URL,
    VIDEO_THUMBNAIL_URL
  ],
  video_thumbnail_url: VIDEO_THUMBNAIL_URL,
  related: {
    parents: [],
    children: [],
    external_sources: [VIDEO_PREVIEW_URL]
  },
  aspect_ratio: "1:1",
  image_width: 1024,
  image_height: 1024,
  created_at: "2025-09-15T23:20:15Z",
  user_name: "Girl Generator",
  user_avatar: "/white-logo-32.png",
  is_public: true
};

const steps = [
  {
    number: "01",
    icon: Type,
    title: "Craft Your Girl Prompt",
    description: "20-year-old European woman, luxuriously wavy chest-length hair, full lips, sharp jawline, voluptuous hourglass figure, wearing a one-shoulder champagne-satin midi dress with a thigh-high slit, minimal gold jewelry, flawless studio lighting, Vogue editorial style",
    detail: "Describe your girl in plain English—our prompt engine does the heavy lifting.",
    bgColor: "from-purple-600/20 to-pink-600/20",
    iconBg: "from-purple-600 to-pink-600",
  },
  {
    number: "02",
    icon: Image,
    title: "Generate Your AI Girl",
    description: "We return a high-resolution image crafted from your prompt: 20-year-old European woman, luxuriously wavy chest-length hair, full lips, sharp jawline, voluptuous hourglass figure, wearing a one-shoulder champagne-satin midi dress with a thigh-high slit, minimal gold jewelry, flawless studio lighting, Vogue editorial style",
    detail: "Powered by advanced AI models for photorealistic results with natural lighting and accurate details.",
    bgColor: "from-blue-600/20 to-cyan-600/20",
    iconBg: "from-blue-600 to-cyan-600",
  },
  {
    number: "03",
    icon: Layers,
    title: "Create Lifestyle Scenes",
    description: "Transform your AI girl into travel shots, editorial poses, and everyday moments—each scene keeps her identity consistent.",
    detail: "Generate on-brand scenes in one click so your girl fits any campaign or storyline.",
    bgColor: "from-emerald-600/20 to-green-600/20",
    iconBg: "from-emerald-600 to-green-600",
  },
  {
    number: "04",
    icon: Play,
    title: "Animate Your AI Girl",
    description: "Turn your girl's favorite scenes into dynamic 8-second clips ready for social media and storytelling.",
    detail: "AI-powered video generation brings your AI girl to life with natural motion and cinematic quality.",
    bgColor: "from-amber-600/20 to-orange-600/20",
    iconBg: "from-amber-600 to-orange-600",
  },
  {
    number: "05",
    icon: Download,
    title: "Download & Share",
    description: "Originals delivered as PNG/JPEG for images or MP4 for videos.",
    detail: "Get ready-to-use files for commercial use with watermark tracking for IP clarity.",
    bgColor: "from-indigo-600/20 to-purple-600/20",
    iconBg: "from-indigo-600 to-purple-600",
  },
];

export default function Workflow() {
  const { openViewer } = useViewer();

  const handleImageClick = () => {
    openViewer(exampleJob);
  };

  const handleVariation1Click = () => {
    openViewer(variationJob1);
  };

  const handleVariation2Click = () => {
    openViewer(variationJob2);
  };

  const handleVariation3Click = () => {
    openViewer(variationJob3);
  };

  const handleVariation4Click = () => {
    openViewer(variationJob4);
  };

  const handleVideoClick = () => {
    openViewer(videoExampleJob);
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-black via-slate-900 to-gray-900 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-purple-600/10 to-pink-600/5 blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-blue-600/10 to-cyan-600/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            How It <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Works</span>
          </h2>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            From concept to creation in 5 simple steps. No design skills required—just describe your vision and watch it come to life.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 1;
            
            return (
              <div
                key={index}
                className={`flex flex-col ${isEven ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 items-center`}
              >
                {/* Content Side */}
                <div className="flex-1 space-y-6">
                  {/* Step Number */}
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.iconBg} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-6xl font-black text-white/10">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      {step.title}
                    </h3>
                    
                    {/* Example/Description */}
                    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl p-6 mb-4">
                      <p className="text-white/80 italic text-lg">
                        "{step.description}"
                      </p>
                    </div>
                    
                    <p className="text-white/60 text-lg leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>

                {/* Visual Side */}
                <div className="flex-1">
                  <div className={`relative bg-gradient-to-br ${step.bgColor} rounded-3xl p-8 backdrop-blur-sm`}>
                    <div className="space-y-4">
                        {/* Mock Interface Elements */}
                        {index === 0 && (
                          <div className="space-y-3">
                            <div className="h-4 bg-gradient-to-r from-white/20 to-transparent rounded w-3/4" />
                            <div className="h-12 bg-white/10 border border-white/20 rounded-lg flex items-center px-4">
                              <span className="text-white/60 text-sm">20-year-old European woman, luxuriously wavy...</span>
                            </div>
                            <div className="h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                              <span className="text-white font-medium">Generate</span>
                            </div>
                          </div>
                        )}
                        
                        {index === 1 && (
                          <div className="relative">
                            <img
                              src={EXAMPLE_IMAGE_URL}
                              alt={generateImageAlt(exampleJob.prompt)}
                              className="w-full aspect-video object-cover rounded-lg border-2 border-purple-400/50 cursor-pointer hover:border-purple-400/80 transition-colors"
                              onClick={handleImageClick}
                              width="1400"
                              height="788"
                              loading="eager"
                            />
                            {/* Preview indicator */}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-white/90 border border-white/20">
                              Click to preview
                            </div>
                          </div>
                        )}

                        {index === 2 && (
                          <div className="relative grid grid-cols-2 gap-4">
                            <div className="relative">
                              <img
                                src={VARIATION_1_URL}
                                alt={generateImageAlt(variationJob1.prompt)}
                                className="aspect-square object-cover rounded-lg border-2 border-emerald-400/50 cursor-pointer hover:border-emerald-400/80 transition-colors"
                                onClick={handleVariation1Click}
                                width="290"
                                height="290"
                                loading="lazy"
                              />
                            </div>
                            <div className="relative">
                              <img
                                src={VARIATION_2_URL}
                                alt={generateImageAlt(variationJob2.prompt)}
                                className="aspect-square object-cover rounded-lg border-2 border-emerald-400/50 cursor-pointer hover:border-emerald-400/80 transition-colors"
                                onClick={handleVariation2Click}
                                width="290"
                                height="290"
                                loading="lazy"
                              />
                            </div>
                            <div className="relative">
                              <img
                                src={VARIATION_3_URL}
                                alt={generateImageAlt(variationJob3.prompt)}
                                className="aspect-square object-cover rounded-lg border-2 border-emerald-400/50 cursor-pointer hover:border-emerald-400/80 transition-colors"
                                onClick={handleVariation3Click}
                                width="290"
                                height="290"
                                loading="lazy"
                              />
                            </div>
                            <div className="relative">
                              <img
                                src={VARIATION_4_URL}
                                alt={generateImageAlt(variationJob4.prompt)}
                                className="aspect-square object-cover rounded-lg border-2 border-emerald-400/50 cursor-pointer hover:border-emerald-400/80 transition-colors"
                                onClick={handleVariation4Click}
                                width="290"
                                height="290"
                                loading="lazy"
                              />
                            </div>
                            {/* Preview indicator for the grid */}
                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-white/90 border border-white/20">
                              Click to preview
                            </div>
                          </div>
                        )}

                        {index === 3 && (
                          <div className="space-y-3">
                            <div className="relative aspect-square rounded-lg border border-white/20 overflow-hidden cursor-pointer hover:border-amber-400/80 transition-colors" onClick={handleVideoClick}>
                              <img
                                src={VIDEO_PREVIEW_GRID_URL}
                                className="w-full h-full object-cover"
                                alt={generateImageAlt(videoExampleJob.prompt, true)}
                                width="400"
                                height="400"
                                loading="lazy"
                              />
                              {/* Video play indicator */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                </div>
                              </div>
                              {/* Preview indicator */}
                              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-white/90 border border-white/20">
                                Click to preview
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-sm">8-second video</span>
                              <span className="text-amber-400 text-sm">Square • 1024x1024</span>
                            </div>
                          </div>
                        )}

                        {index === 4 && (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-lg p-3 border border-white/20">
                                <div className="text-white text-sm font-medium">image.png</div>
                                <div className="text-white/60 text-xs">Commercial-ready image</div>
                              </div>
                              <div className="flex-1 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-lg p-3 border border-white/20">
                                <div className="text-white text-sm font-medium">video.mp4</div>
                                <div className="text-white/60 text-xs">Commercial-ready video</div>
                              </div>
                            </div>
                            <div className="h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center gap-2">
                              <Download className="w-4 h-4 text-white" />
                              <span className="text-white font-medium text-sm">Download All</span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="inline-flex items-center gap-6 bg-gradient-to-r from-white/5 to-white/10 border border-white/20 rounded-2xl px-8 py-6 backdrop-blur-sm">
            <span className="text-white text-lg font-medium">Ready to bring your AI girl to life?</span>
            <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
