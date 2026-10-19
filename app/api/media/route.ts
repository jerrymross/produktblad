import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { sheetEntry, storeImage, ensureSheet } from "@/lib/sheets-server";
import { assertNotFinalized } from "@/lib/finalization-server";
export async function POST(request: Request) { return api(async () => {
  sameOrigin(request); const user = await identity(request);
  const form = await request.formData(); const file = form.get("file"); const sheetId = form.get("sheetId");
  if (!(file instanceof File) || typeof sheetId !== "string") throw new HttpError(400, "Välj ett produktblad och en bildfil.");
  if (!file.size || file.size > 2_000_000) throw new HttpError(413, "Bilden får vara högst 2 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  return transaction(user.id, async client => {
    const entry = await sheetEntry(sheetId, client);
    const access = await client.query("SELECT can_access_school($1) AS allowed", [entry.school]);
    if (!access.rows[0].allowed) throw new HttpError(403, "Du har inte åtkomst till skolans bilder.");
    await ensureSheet(client,sheetId);
    await client.query("SELECT id FROM sheets WHERE id=$1 FOR UPDATE",[sheetId]);
    await assertNotFinalized(client,sheetId);
    return Response.json({ dataUrl: await storeImage(client, bytes, entry.school) });
  });
}); }
