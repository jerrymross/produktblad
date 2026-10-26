import Script from "next/script";
import { PlatformNavigation } from "@/components/PlatformNavigation";
import { appPath } from "@/lib/app-path";
import type { Metadata } from "next";
import { PortalFrameStatus } from "@/components/PortalFrameStatus";
import "./globals.css";
import "./sheet.css";

export const metadata: Metadata = {
  title: "Astar | Produktblad",
  description: "Skolornas gemensamma produktblad med säker sparning och A4-export.",
  icons: { icon: { url: appPath("/logo_liggande.png"), type: "image/png" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sv" suppressHydrationWarning><head>{process.env.NEXT_PUBLIC_APP_BASE_PATH && <>
      {/* Shared presentation is loaded before app hydration to avoid a second menu. */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- portal owns this shared, versioned stylesheet */}
      <link rel="stylesheet" href="/platform/v3/workspace.css?v=20261026-shell4" />
      <Script src="/platform/v3/bootstrap.js?v=20261026-shell4" strategy="beforeInteractive" />
    </>}</head><body><PlatformNavigation /><PortalFrameStatus />{children}</body></html>;
}
