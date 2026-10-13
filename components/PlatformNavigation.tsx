"use client";
import { createElement } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { appBasePath } from "@/lib/app-path";
export function PlatformNavigation() {
  const pathname = usePathname();
  if (!appBasePath || pathname.endsWith("/render")) return null;
  return <><Script src="/platform/v1/navigation.js" strategy="afterInteractive" />{createElement("astar-navigation", { current: "produktblad" })}</>;
}
