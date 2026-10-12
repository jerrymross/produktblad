import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { decodeSheetId } from "@/lib/sheet-id";
import { readFinalization } from "@/lib/finalization-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    sameOrigin(request);
    const user = await identity(request);
    const id = decodeSheetId((await context.params).id);
    const body = await request.json();
    if (typeof body?.finalized !== "boolean" || !Number.isInteger(body.revision) || body.revision < 1
      || !Number.isInteger(body.stateVersion) || body.stateVersion < 0
      || (body.finalized && (typeof body.token !== "string" || !/^[a-f0-9-]{36}$/.test(body.token)))) {
      throw new HttpError(400, "Ogiltig bladversion eller låsstatus.");
    }
    if (!body.finalized && body.confirmed !== true) throw new HttpError(400, "Bekräfta upplåsningen först.");
    return transaction(user.id, async client => {
      if (!(await client.query("SELECT is_central() AS admin")).rows[0].admin) {
        throw new HttpError(403, "Endast admin får låsa eller låsa upp blad.");
      }
      const state = await readFinalization(client, id);
      if (!state.available) throw new HttpError(503, "Adminlås har ännu inte aktiverats i databasen.");
      try {
        await client.query("SELECT set_sheet_finalization($1,$2,$3,$4,$5,$6)",
          [id, body.finalized, body.revision, body.stateVersion, body.finalized ? body.token : null, body.confirmed === true]);
      } catch (error) {
        const code = (error as { code?: string }).code;
        const status = code === "42501" ? 403 : code === "40001" ? 409 : code === "22023" ? 400 : code === "P0002" ? 404 : null;
        if (status) throw new HttpError(status, (error as Error).message);
        throw error;
      }
      return Response.json({ finalization: await readFinalization(client, id) }, { headers: { "Cache-Control": "no-store" } });
    });
  });
}
