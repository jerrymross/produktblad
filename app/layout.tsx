import type { Metadata } from "next";
import "./globals.css";
import "./sheet.css";

export const metadata: Metadata = {
  title: "Produktbladsapp | Kock-mall",
  description: "Lokal prototyp för redigering av ett A4-produktblad.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sv"><body>{children}</body></html>;
}
