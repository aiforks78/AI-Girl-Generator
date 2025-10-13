import React from "react";
import ImageGeneratorInterface from "@/components/image-generator/interface";

export const metadata = {
  title: "AI Image Generator - Girl Generator",
  description: "Turn any prompt into a high-resolution AI girl image. Text-to-Image is powered by Girl Generator’s diffusion models, free daily credits & instant download.",
  alternates: {
    canonical: "/text-to-image",
  },
};

export default function TextToImage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <ImageGeneratorInterface />
    </div>
  );
}
