import type { Metadata } from "next";
import AccountClientPage from "./account-client";

export const metadata: Metadata = {
  title: "My Account",
  description: "Review your plan, available credits, and account insights inside Girl Generator.",
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

export default function AccountPage() {
  return <AccountClientPage />;
}
