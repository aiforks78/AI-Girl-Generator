import type { Metadata } from "next";
import CreditsClientPage from "./credits-client";

export const metadata: Metadata = {
  title: "Credit History",
  description: "Track every credit purchase, bonus, and AI generation deduction in your Girl Generator account.",
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

export default function CreditsPage() {
  return <CreditsClientPage />;
}
