import { catalog } from "@/lib/catalog";

export const educationKey = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase("sv");
export const educations = [...new Map(catalog.map(entry => [educationKey(entry.title), { id: educationKey(entry.title), title: entry.title.trim() }])).values()].sort((a, b) => a.title.localeCompare(b.title, "sv"));
export type LibraryImage = { id: string; education: string; slot: 1 | 2; name: string; dataUrl: string; updatedAt: string };
const eventName = "astar-image-library";

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("astar-studio-images", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("images", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Bildbiblioteket kunde inte öppnas. Tillåt lagring i webbläsaren."));
  });
}

export async function readLibrary(): Promise<LibraryImage[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("images").objectStore("images").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Bilderna kunde inte läsas."));
    });
  } finally { db.close(); }
}

async function mutate(image: LibraryImage | string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("images", "readwrite");
      const store = tx.objectStore("images");
      if (typeof image === "string") store.delete(image); else store.put(image);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error("Bilden kunde inte sparas. Kontrollera webbläsarens lagringsutrymme."));
    });
    window.dispatchEvent(new Event(eventName));
    try { localStorage.setItem(eventName, crypto.randomUUID()); } catch { /* Same-tab updates still work. */ }
  } finally { db.close(); }
}

export function subscribeLibrary(refresh: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === eventName) refresh(); };
  window.addEventListener(eventName, refresh);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(eventName, refresh); window.removeEventListener("storage", storage); };
}

export async function uploadLibraryImage(education: string, slot: 1 | 2, file: File) {
  if (!educations.some(item => item.id === education)) throw new Error("Välj en utbildning i listan.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2_000_000 || !file.size) throw new Error("Välj JPG, PNG eller WebP, högst 2 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Filen kunde inte läsas."));
    reader.readAsDataURL(file);
  });
  const decoded = new Image();
  decoded.src = dataUrl;
  try { await decoded.decode(); } catch { throw new Error("Filen är inte en läsbar bild. Välj en annan fil."); }
  await mutate({ id: `${education}:${slot}`, education, slot, name: file.name, dataUrl, updatedAt: new Date().toISOString() });
}

export const deleteLibraryImage = (id: string) => mutate(id);
