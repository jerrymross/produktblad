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
  return <html lang="sv"><body><PlatformNavigation /><PortalFrameStatus />{children}</body></html>;
}
