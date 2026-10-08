import rows from "@/fixtures/produktblad.json";
import { TITLE_DEFAULTS, DEFAULT_ABOUT, defaultHeadings, exampleSheet, isSheetData, KOMVUX_DEFAULT_CONTENT, TEMPLATE_VERSION, upgradePreviousDraft, type SheetData } from "@/lib/sheet";

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
  return { ...blank, ...TITLE_DEFAULTS, ...defaultHeadings(entry.title), ...(entry.program === "Komvux" ? KOMVUX_DEFAULT_CONTENT : {}), titleLine: "Utbilda dig", titlePrefix: "till", profession: entry.title,
    eyebrow: entry.program === "Komvux" ? "KOMVUX" : "ARBETSMARKNADSUTBILDNING", about: DEFAULT_ABOUT, image: "/reference-hero.jpg", gradientStyle: "none", gradientStrength: "2" };
}

export function readPreviousDraft(entry?: CatalogEntry): SheetData | null {
  try {
    if (localStorage.getItem(`${entry ? draftKey(entry.id) : EXAMPLE_STORAGE_KEY}:reset`)) return null;
    const previousKey = entry ? `produktbladsapp:blad:${entry.id}:kock-1.1.0-prototyp` : "produktbladsapp:exempel:kock-1.1.0-prototyp";
    const latestKey = entry ? `produktbladsapp:blad:${entry.id}:kock-1.2.0-prototyp` : "produktbladsapp:exempel:kock-1.2.0-prototyp";
    const keys = [latestKey, previousKey, entry ? `produktbladsapp:blad:${entry.id}:kock-1.0.2-prototyp` : LEGACY_STORAGE_KEY];
    for (const key of keys) {
      if (localStorage.getItem(`${key}:reset`)) return null;
      const stored = localStorage.getItem(key);
      if (stored) {
        const upgraded = upgradePreviousDraft(JSON.parse(stored), entry?.program);
        if (upgraded) return upgraded;
      }
    }
    return null;
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
