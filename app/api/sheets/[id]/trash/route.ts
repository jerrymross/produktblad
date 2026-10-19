import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { decodeSheetId } from "@/lib/sheet-id";
import { trashAvailable } from "@/lib/trash-server";

type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  return api(async () => {
    sameOrigin(request);
    const user = await identity(request);
    const id = decodeSheetId((await context.params).id);
    const body = await request.json();
    if (body.confirmed !== true || !Number.isInteger(body.revision) || body.revision < 0)
      throw new HttpError(400, "Bekräfta borttagningen och läs in bladets aktuella version.");
    return transaction(user.id, async client => {
      if (!await trashAvailable(client)) throw new HttpError(503, "Skräpkorgen har ännu inte aktiverats.");
      try { await client.query("SELECT trash_sheet($1,$2,$3)", [id, body.revision, true]); }
      catch (error) {
        if ((error as { code?: string }).code === "40001") throw new HttpError(409, "Bladet har ändrats. Läs in det igen före borttagning.");
        throw error;
      }
      return Response.json({ deleted: true });
    });
  });
}
