import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Team Plans",
  description: "Compare Girl Generator team plans and upgrade to collaborative credits.",
  alternates: {
    canonical: "/pricing",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function TeamRedirectPage() {
  redirect("/pricing");
}
