"use client";
import { useEffect, useState } from "react";
import { readLibrary, subscribeLibrary, type LibraryImage } from "@/lib/image-library";

export function useImageLibrary() {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    let revision = 0;
    const refresh = () => {
      const current = ++revision;
      readLibrary().then(result => { if (live && current === revision) { setImages(result); setError(""); } }).catch(() => { if (live && current === revision) setError("Bildbiblioteket kunde inte läsas. Kontrollera att webbläsaren tillåter lokal lagring."); }).finally(() => { if (live && current === revision) setLoading(false); });
    };
    refresh();
    const unsubscribe = subscribeLibrary(refresh);
    return () => { live = false; unsubscribe(); };
  }, []);
  return { images, loading, error };
}
