import { api, identity } from "@/lib/access";
import { transaction } from "@/lib/db";
import { queryAdminOverview } from "@/lib/admin-overview";

export async function GET(request: Request) {
  return api(async () => {
    const user = await identity(request);
    const overview = await transaction(user.id, queryAdminOverview);
    return Response.json(overview, { headers: { "Cache-Control": "private, no-store" } });
  });
}
