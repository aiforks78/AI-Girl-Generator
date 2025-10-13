import type { Metadata } from "next";
import ImageToVideo from "@/components/image-generator/image-to-video-interface";

export const metadata: Metadata = {
  title: "AI Image to Video Generator",
  description: "Animate your AI portraits into cinematic clips with Girl Generator's image-to-video workflow.",
  alternates: {
    canonical: "/image-to-video",
  },
  openGraph: {
    title: "AI Image to Video Generator",
    description: "Transform still images into motion with consistent characters using Girl Generator.",
  },
  twitter: {
    title: "AI Image to Video Generator",
    description: "Turn AI portraits into cinematic clips in minutes with Girl Generator.",
  },
};

export default function Page() {
  return <ImageToVideo />;
}
