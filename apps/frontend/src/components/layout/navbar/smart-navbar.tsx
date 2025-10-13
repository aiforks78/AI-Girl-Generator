"use client";
import SiteNavbar from "@/components/layout/navbar/site-navbar";
import { usePathname } from "next/navigation";

export default function SmartNavbar() {
  const pathname = usePathname();

  // Tool pages: text-to-image, image-to-image, image-to-video, public viewer
  const isToolPage = (pathname?.startsWith("/text-to-image") || pathname?.startsWith("/image-to-image") || pathname?.startsWith("/image-to-video") || pathname?.startsWith("/v/")) ?? false;
  return <SiteNavbar variant={isToolPage ? "solid" : "auto"} />;
}
