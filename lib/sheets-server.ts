import { withVisitAddress } from "@/lib/school-addresses";
import { randomUUID } from "node:crypto";
import { type PoolClient } from "pg";
import { transaction } from "@/lib/db";
import { HttpError } from "@/lib/access";
import { catalog, initialSheet, schoolQrUrl } from "@/lib/catalog";
import { exampleSheet, isSheetData, TEMPLATE_VERSION, type SheetData } from "@/lib/sheet";

export function sheetEntry(id: string) {
  if (id === "example") return { id, school: "__templates__", title: "Kock – exempel", defaults: exampleSheet };
  const entry = catalog.find(item => item.id === id);
  if (!entry) throw new HttpError(404, "Bladet finns inte.");
  return { ...entry, defaults: initialSheet(entry) };
}
export async function ensureSheet(client: PoolClient, id: string) {
  const entry = sheetEntry(id);
  const permitted = await client.query("SELECT can_access_school($1) AS allowed", [entry.school]);
  if (!permitted.rows[0].allowed) throw new HttpError(403, "Du har inte åtkomst till skolans blad.");
  await client.query("INSERT INTO sheets(id,school_id,title,content,template_version) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
    [id, entry.school, entry.title, entry.defaults, TEMPLATE_VERSION]);
}
export async function readSheet(userId: string, id: string, revision?: number) {
  return transaction(userId, async client => {
    await ensureSheet(client, id);
    const result = revision === undefined
      ? await client.query("SELECT content,revision,updated_at AS \"updatedAt\" FROM sheets WHERE id=$1", [id])
      : await client.query("SELECT content,revision,created_at AS \"updatedAt\" FROM sheet_versions WHERE sheet_id=$1 AND revision=$2", [id, revision]);
    if (!result.rowCount) throw new HttpError(404, "Bladversionen finns inte.");
    const sheet = result.rows[0] as { content: SheetData; revision: number; updatedAt: string };
    if (revision === undefined && id !== "example") { const entry = catalog.find(item => item.id === id)!; sheet.content = { ...withVisitAddress(sheet.content, entry), qrUrl: schoolQrUrl(entry.school) }; }
    return sheet;
  });
}
export async function privateImage(client: PoolClient, image: string, school: string): Promise<string> {
  if (image === "/reference-hero.jpg") return image;
  const reference = /^\/api\/media\/([a-f0-9-]{36})$/.exec(image);
  if (reference) {
    const found = await client.query("SELECT id FROM media WHERE id=$1 AND (school_id=$2 OR school_id IS NULL)", [reference[1], school]);
    if (!found.rowCount) throw new HttpError(403, "Bilden hör inte till skolan eller det gemensamma biblioteket.");
    return image;
  }
  const inline = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=]+)$/i.exec(image);
  if (!inline) throw new HttpError(400, "Bildformatet stöds inte.");
  return storeImage(client, Buffer.from(inline[2], "base64"), school);
}
export async function storeImage(client: PoolClient, bytes: Buffer, school: string): Promise<string> {
  if (!bytes.length || bytes.length > 2_000_000) throw new HttpError(413, "Bilden får vara högst 2 MB.");
  // Trust the file's bytes rather than its filename or browser-supplied MIME type.
  const mime = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? "image/jpeg"
    : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : bytes.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP" ? "image/webp" : null;
  if (!mime) throw new HttpError(400, "Filen är inte en JPG-, PNG- eller WebP-bild.");
  const id = randomUUID();
  await client.query("INSERT INTO media(id,school_id,mime,bytes) VALUES($1,$2,$3,$4)", [id, school === "__library__" ? null : school, mime, bytes]);
  return `/api/media/${id}`;
}
export function validateContent(content: unknown): asserts content is SheetData {
  if (!isSheetData(content) || Object.entries(content).some(([key,value]) => key !== "image" && String(value).length > 20_000)) throw new HttpError(400, "Bladets fält är ogiltiga eller för långa.");
}
