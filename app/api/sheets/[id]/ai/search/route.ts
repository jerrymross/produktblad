import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { decodeSheetId } from "@/lib/sheet-id";
import { readSheet } from "@/lib/sheets-server";
import { discoverEducation } from "@/lib/astar-search";

export const maxDuration = 30;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    sameOrigin(request);
    const user = await identity(request), id = decodeSheetId((await context.params).id);
    const sheet = await readSheet(user.id, id);
    if (sheet.finalization.finalized) throw new HttpError(409, "Bladet är låst. Lås upp det innan du söker underlag.");
    const entry = sheet.entry;
    if (!("program" in entry)) throw new HttpError(400, "Exempelblad saknar skola och utbildningstyp. Ange en länk manuellt.");
    let result;
    try { result = await discoverEducation({ title: entry.title, school: entry.school, program: entry.program }); }
    catch { throw new HttpError(502, "Sökningen på astar.se kunde inte slutföras. Försök igen eller ange en länk manuellt."); }
    if ((await identity(request)).id !== user.id) throw new HttpError(401, "Din inloggning har ändrats.");
    if ((await readSheet(user.id, id)).finalization.finalized) throw new HttpError(409, "Bladet har låsts under tiden.");
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  });
}
