"use client";
import { createElement } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { appBasePath } from "@/lib/app-path";
export function PlatformNavigation() {
  const pathname = usePathname();
  if (!appBasePath || pathname.endsWith("/render")) return null;
  // Shared, versioned stylesheet owned by the portal; intentionally not bundled per app.
  // eslint-disable-next-line @next/next/no-css-tags
  return <><link rel="stylesheet" href="/platform/v3/workspace.css?v=20261026-shell" /><Script src="/platform/v3/navigation.js?v=20261026-shell" strategy="afterInteractive" />{createElement("astar-navigation", { current: "produktblad" })}</>;
}
