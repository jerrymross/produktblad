import { schoolVisitAddress } from "@/lib/school-addresses";
import { defaultImagePath } from "@/lib/education-images";
import rows from "@/fixtures/produktblad.json";
import umeaContent from "@/fixtures/umea-content.json";
import {UMEA_TEMPLATE_VERSION} from "@/lib/sheet";
import { AF_DEFAULT_CONTENT } from "@/lib/af-default-content";
import { KOMVUX_REFERENCE_CONTENT } from "@/lib/komvux-default-content";
import { TITLE_DEFAULTS, DEFAULT_ABOUT, defaultHeadings, exampleSheet, isSheetData, TEMPLATE_VERSION, AF_TEMPLATE_VERSION, isAfProgram, withProgramLayout, upgradePreviousDraft, type SheetData } from "@/lib/sheet";

export type CatalogEntry = { id: string; school: string; program: string; title: string; sourceId?: string; copyNumber?: number };
export const catalog: CatalogEntry[] = rows.map(row => ({
  ...row,
  id: [row.school, row.program, row.title].map(encodeURIComponent).join("|"),
}));
export const schools = [...new Set(catalog.map(entry => entry.school))].sort((a, b) => a.localeCompare(b, "sv"));
export function catalogEntry(id:string):CatalogEntry|undefined {
  const original=catalog.find(entry=>entry.id===id);
  if(original)return original;
  const match=/^copy:([12]):(.+)$/.exec(id);
  const source=match&&catalog.find(entry=>entry.id===match[2]);
  return source?{...source,id,sourceId:source.id,copyNumber:Number(match![1])}:undefined;
}
export const LEGACY_STORAGE_KEY = "produktbladsapp:kock:lokalt-utkast:v1";
export const EXAMPLE_STORAGE_KEY = `produktbladsapp:exempel:${TEMPLATE_VERSION}`;

export function draftKey(id: string) {
  return `produktbladsapp:blad:${id}:${catalogTemplateVersion(catalogEntry(id))}`;
}
export function catalogTemplateVersion(entry?:CatalogEntry){
  return entry?.school==="Umeå"&&entry.program==="Komvux"&&umeaContent.some(row=>row.title===entry.title)?UMEA_TEMPLATE_VERSION:isAfProgram(entry?.program)?AF_TEMPLATE_VERSION:TEMPLATE_VERSION;
}

export function schoolQrUrl(school: string): string {
  const slug = school.trim().toLocaleLowerCase("sv").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `http://astar.se/${slug}`;
}

export function initialSheet(entry: CatalogEntry): SheetData {
  // Catalog rows are assignments, not evidence for education facts or contacts.
  const blank = Object.fromEntries(Object.keys(exampleSheet).map(key => [key, ""])) as SheetData;
  const umea=entry.school==="Umeå"&&entry.program==="Komvux"?umeaContent.find(row=>row.title===entry.title):undefined;
  return withProgramLayout({ ...blank, ...TITLE_DEFAULTS, ...defaultHeadings(entry.title), titleLine: "Utbilda dig", titlePrefix: "till", profession: entry.title,
    eyebrow: entry.program === "Komvux" ? "KOMVUX" : "ARBETSMARKNADSUTBILDNING", about: DEFAULT_ABOUT, image: defaultImagePath(entry.title), gradientStyle: "none", gradientStrength: "2", qrUrl: schoolQrUrl(entry.school), address: schoolVisitAddress(entry), ...(isAfProgram(entry.program) ? AF_DEFAULT_CONTENT : entry.program === "Komvux" ? KOMVUX_REFERENCE_CONTENT : {}),...(umea?{...umea.fields as Partial<SheetData>,layout:"umea" as const,gradientStyle:"white" as const,gradientStrength:"4" as const}:{}) }, entry.program, entry.school);
}

export function readPreviousDraft(entry?: CatalogEntry): SheetData | null {
  try {
    if (localStorage.getItem(`${entry ? draftKey(entry.id) : EXAMPLE_STORAGE_KEY}:reset`)) return null;
    const previousKey = entry ? `produktbladsapp:blad:${entry.id}:kock-1.1.0-prototyp` : "produktbladsapp:exempel:kock-1.1.0-prototyp";
    const latestKey = entry ? `produktbladsapp:blad:${entry.id}:kock-1.2.0-prototyp` : "produktbladsapp:exempel:kock-1.2.0-prototyp";
    const keys = [...(isAfProgram(entry?.program) ? [`produktbladsapp:blad:${entry!.id}:${TEMPLATE_VERSION}`] : []), latestKey, previousKey, entry ? `produktbladsapp:blad:${entry.id}:kock-1.0.2-prototyp` : LEGACY_STORAGE_KEY];
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
