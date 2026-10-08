import rows from "@/fixtures/produktblad.json";
import { defaultHeadings, exampleSheet, isSheetData, KOMVUX_DEFAULT_CONTENT, TEMPLATE_VERSION, upgradePreviousDraft, type SheetData } from "@/lib/sheet";

export type CatalogEntry = { id: string; school: string; program: string; title: string };
export const catalog: CatalogEntry[] = rows.map(row => ({
  ...row,
  id: [row.school, row.program, row.title].map(encodeURIComponent).join("|"),
}));
export const schools = [...new Set(catalog.map(entry => entry.school))].sort((a, b) => a.localeCompare(b, "sv"));
export const LEGACY_STORAGE_KEY = "produktbladsapp:kock:lokalt-utkast:v1";
export const EXAMPLE_STORAGE_KEY = `produktbladsapp:exempel:${TEMPLATE_VERSION}`;

export function draftKey(id: string) {
  return `produktbladsapp:blad:${id}:${TEMPLATE_VERSION}`;
}

export function initialSheet(entry: CatalogEntry): SheetData {
  // Catalog rows are assignments, not evidence for education facts or contacts.
  const blank = Object.fromEntries(Object.keys(exampleSheet).map(key => [key, ""])) as SheetData;
  return { ...blank, ...defaultHeadings(entry.title), ...(entry.program === "Komvux" ? KOMVUX_DEFAULT_CONTENT : {}), titleLine: "Utbilda dig", titlePrefix: "till", profession: entry.title,
    eyebrow: entry.program === "Komvux" ? "KOMVUX" : "ARBETSMARKNADSUTBILDNING", image: "/reference-hero.jpg" };
}

export function readPreviousDraft(entry?: CatalogEntry): SheetData | null {
  try {
    if (localStorage.getItem(`${entry ? draftKey(entry.id) : EXAMPLE_STORAGE_KEY}:reset`)) return null;
    const key = entry ? `produktbladsapp:blad:${entry.id}:kock-1.0.2-prototyp` : LEGACY_STORAGE_KEY;
    const stored = localStorage.getItem(key);
    return stored ? upgradePreviousDraft(JSON.parse(stored), entry?.program) : null;
  } catch { return null; }
}

export function readDraft(id: string): SheetData | null {
  try {
    const stored = localStorage.getItem(draftKey(id));
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isSheetData(parsed) ? parsed : null;
  } catch { return null; }
}
