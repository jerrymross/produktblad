"use client";

import { useEffect } from "react";

export function PortalFrameStatus() {
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== "https://astar-studio-portal.vercel.app" || event.source !== window.parent || event.data?.type !== "produktblad-frame-check") return;
      window.parent.postMessage({ type: "produktblad-frame-ready" }, event.origin);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "produktblad-frame-ready" }, "https://astar-studio-portal.vercel.app");
    return () => window.removeEventListener("message", receive);
  }, []);
  return null;
}
