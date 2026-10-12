import { KOMVUX_DEFAULT_CONTENT, type SheetData } from "@/lib/sheet";
import { withUnsavedAfDefaults } from "@/lib/af-default-content";
import { KOMVUX_REFERENCE_CONTENT } from "@/lib/komvux-default-content";

export function withUnsavedProgramDefaults(content: SheetData, program: string, revision: number): SheetData {
  if (program !== "Komvux") return withUnsavedAfDefaults(content, program, revision);
  if (revision !== 0) return content;
  const result = { ...content };
  for (const [key, value] of Object.entries(KOMVUX_REFERENCE_CONTENT)) {
    const field = key as keyof SheetData;
    const oldStandard = (field === "process" || field === "form") && content[field] === KOMVUX_DEFAULT_CONTENT[field];
    if (typeof value === "string" && (!content[field]?.trim() || oldStandard)) Object.assign(result, { [field]: value });
  }
  return result;
}
