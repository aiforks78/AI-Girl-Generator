import React from "react";
import ImageToImageInterface from "@/components/image-generator/image-to-image-interface";

export const metadata = {
  title: "AI Image to Image Generator - Girl Generator",
  description: "Transform an existing photo into a new AI girl style. Upload, adjust strength and generate variations in seconds with Girl Generator – the AI girl generator.",
  alternates: {
    canonical: "/image-to-image",
  },
};

export default function ImageToImage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <ImageToImageInterface />
    </div>
  );
}
