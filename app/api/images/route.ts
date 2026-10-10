import { api, identity, sameOrigin, requireAdmin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { privateImage, storeImage } from "@/lib/sheets-server";
import { educations } from "@/lib/image-library";
export async function GET(request: Request) { return api(async () => {
  const user = await identity(request);
  return transaction(user.id, async client => Response.json({ images: (await client.query(`SELECT education || ':' || slot AS id,education,slot,name,'/api/media/' || media_id AS "dataUrl",updated_at AS "updatedAt" FROM library_images`)).rows }, { headers: { "Cache-Control": "no-store" } }));
}); }
export async function POST(request: Request) { return api(async () => {
  sameOrigin(request); const user = await identity(request); await requireAdmin(user.id);
  let education: unknown, slot: unknown, name: unknown, file: File | undefined, dataUrl: unknown;
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const form = await request.formData();
    const uploaded = form.get("file");
    if (!(uploaded instanceof File)) throw new HttpError(400, "Välj en bildfil att ladda upp.");
    file = uploaded; education = form.get("education"); slot = Number(form.get("slot")); name = file.name;
    if (!file.size || file.size > 2_000_000) throw new HttpError(413, "Bilden får vara högst 2 MB.");
  } else {
    // Keep imports of previous local data URLs working.
    const text = await request.text();
    if (text.length > 2_800_000) throw new HttpError(413, "Bilden får vara högst 2 MB.");
    const body = JSON.parse(text);
    ({ education, slot, name, dataUrl } = body);
    if (typeof dataUrl !== "string") throw new HttpError(400, "Välj en bildfil att ladda upp.");
  }
  if (!educations.some(item => item.id === education)) throw new HttpError(400, "Välj en utbildning i listan.");
  if (slot !== 1 && slot !== 2) throw new HttpError(400, "Välj bildplats 1 eller 2.");
  if (typeof name !== "string" || !name || name.length > 255) throw new HttpError(400, "Bildens filnamn är ogiltigt.");
  const bytes = file ? Buffer.from(await file.arrayBuffer()) : undefined;
  return transaction(user.id, async client => {
    const url = bytes ? await storeImage(client, bytes, "__library__") : await privateImage(client, dataUrl as string, "__library__");
    if (!url.startsWith("/api/media/")) throw new HttpError(400, "Ladda upp en bildfil.");
    await client.query("INSERT INTO library_images(education,slot,media_id,name) VALUES($1,$2,$3,$4) ON CONFLICT(education,slot) DO UPDATE SET media_id=EXCLUDED.media_id,name=EXCLUDED.name,updated_at=now()", [education, slot, url.split("/").pop(), name]);
    return Response.json({ saved: true, dataUrl: url });
  });
}); }
export async function DELETE(request: Request) { return api(async () => {
  sameOrigin(request); const user = await identity(request); await requireAdmin(user.id); const { id } = await request.json();
  if (typeof id !== "string") throw new HttpError(400, "Ogiltig bild.");
  await transaction(user.id, async client => { await client.query("DELETE FROM library_images WHERE education || ':' || slot=$1", [id]); });
  return Response.json({ deleted: true });
}); }
