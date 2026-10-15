import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { decodeSheetId } from "@/lib/sheet-id";
import { readSheet } from "@/lib/sheets-server";
import { fetchAstarSource } from "@/lib/astar-source";

export const maxDuration = 20;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return api(async () => {
    sameOrigin(request);
    const user = await identity(request), id = decodeSheetId((await context.params).id);
    const sheet = await readSheet(user.id, id);
    if (sheet.finalization.finalized) throw new HttpError(409, "Bladet är låst. Lås upp det innan du hämtar underlag.");
    const raw = await request.text();
    if (raw.length > 2200) throw new HttpError(413, "Länken är för lång.");
    const body = JSON.parse(raw);
    if (!body || typeof body.url !== "string" || Object.keys(body).some(key => key !== "url"))
      throw new HttpError(400, "Ange en länk till utbildningssidan.");
    let source;
    try { source = await fetchAstarSource(body.url); }
    catch (error) {
      throw new HttpError(400, error instanceof Error && error.name === "Error" ? error.message : "Sidan kunde inte hämtas just nu. Försök igen eller ange fakta manuellt.");
    }
    if ((await identity(request)).id !== user.id) throw new HttpError(401, "Din inloggning har ändrats.");
    if ((await readSheet(user.id, id)).finalization.finalized) throw new HttpError(409, "Bladet har låsts under tiden.");
    return Response.json(source, { headers: { "Cache-Control": "no-store" } });
  });
}
