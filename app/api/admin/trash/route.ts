import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { trashAvailable } from "@/lib/trash-server";

export async function GET(request: Request) {
  return api(async () => {
    const user = await identity(request);
    return transaction(user.id, async client => {
      if (!(await client.query("SELECT is_central() AS allowed")).rows[0].allowed) throw new HttpError(403, "Endast admin kan öppna skräpkorgen.");
      const available = await trashAvailable(client);
      return Response.json({ available, sheets: available ? (await client.query("SELECT * FROM list_sheet_trash()")).rows : [] }, { headers: { "Cache-Control": "no-store" } });
    });
  });
}
export async function POST(request: Request) {
  return api(async () => {
    sameOrigin(request);
    const user = await identity(request);
    const { id, deletionId } = await request.json();
    if (typeof id !== "string" || typeof deletionId !== "string" || !/^[a-f0-9-]{36}$/.test(deletionId)) throw new HttpError(400, "Välj ett blad i skräpkorgen.");
    return transaction(user.id, async client => {
      if (!await trashAvailable(client)) throw new HttpError(503, "Skräpkorgen har ännu inte aktiverats.");
      try { await client.query("SELECT restore_sheet($1,$2)", [id, deletionId]); }
      catch (error) {
        if ((error as { code?: string }).code === "22023") throw new HttpError(409, "Återställ originalbladet först.");
        throw error;
      }
      return Response.json({ restored: true });
    });
  });
}
