import type { Metadata } from "next";
import ContentClientPage from "./content-client";

export const metadata: Metadata = {
  title: "My Library",
  description: "Browse, favorite, and revisit every AI image or video you generated with Girl Generator.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function ContentPage() {
  return <ContentClientPage />;
}
