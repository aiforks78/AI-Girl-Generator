import type { Metadata } from "next";
import TestEnvClient from "./test-env-client";

export const metadata: Metadata = {
  title: "Environment Inspector",
  description: "Internal diagnostic page for verifying Girl Generator frontend environment variables.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
    },
  },
};

export default function TestEnvPage() {
  return <TestEnvClient />;
}
