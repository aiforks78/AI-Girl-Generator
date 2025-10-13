import type { Metadata } from "next";
import GalleryClient from "./gallery-client";

export const metadata: Metadata = {
  title: "AI Girl Gallery - Browse Characters & Creations",
  description: "Explore the Girl Generator gallery of 2 000+ AI-generated girl scenes, discover styles and prompts, and remix them in one click with our AI girl generator.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "AI Girl Gallery - Featured Characters",
    description: "Explore the Girl Generator gallery of 2 000+ AI-generated girl scenes, discover styles and prompts, and remix them in one click with our AI girl generator.",
    type: "website",
  },
};

export default function GalleryPage() {
  return <GalleryClient />;
}
