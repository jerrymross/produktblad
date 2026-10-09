import { catalog } from "@/lib/catalog";
import {cloud,jsonRequest} from "@/lib/cloud-client";

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

export async function readLegacyLibrary(): Promise<LibraryImage[]> {
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
    await cloud("/api/images",jsonRequest(typeof image==="string"?"DELETE":"POST",typeof image==="string"?{id:image}:image));
    window.dispatchEvent(new Event(eventName));
    try { localStorage.setItem(eventName, crypto.randomUUID()); } catch { /* Same-tab updates still work. */ }
}

export async function readLibrary():Promise<LibraryImage[]>{return (await cloud<{images:LibraryImage[]}>("/api/images")).images;}
export async function importLegacyLibrary(){const local=await readLegacyLibrary();const current=await readLibrary();let count=0;for(const image of local){if(!current.some(item=>item.id===image.id)){await mutate(image);count++;}}return count;}

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
