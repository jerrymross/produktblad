"use client";
import { createElement } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { appBasePath } from "@/lib/app-path";
export function PlatformNavigation() {
  const pathname = usePathname();
  if (!appBasePath || pathname.endsWith("/render")) return null;
  // Shared, versioned stylesheet owned by the portal; intentionally not bundled per app.
  return <><Script src="/platform/v3/navigation.js?v=20261026-shell4" strategy="afterInteractive" />{createElement("astar-navigation", { current: "produktblad" })}</>;
}
