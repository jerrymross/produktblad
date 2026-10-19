import { api, identity } from "@/lib/access";
import { transaction } from "@/lib/db";
import { addedSheetsAvailable, listAddedSheets } from "@/lib/added-sheets-server";
export async function GET(request: Request) { return api(async () => {
  const user = await identity(request);
  return transaction(user.id, async client => {
    const sheets = await listAddedSheets(client, true);
    return Response.json({ sheets, available: await addedSheetsAvailable(client) }, { headers: { "Cache-Control": "no-store" } });
  });
}); }
