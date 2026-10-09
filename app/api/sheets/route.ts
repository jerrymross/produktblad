import { api, identity } from "@/lib/access";
import { transaction } from "@/lib/db";
export async function GET(request: Request) { return api(async () => { const user=await identity(request); return transaction(user.id, async client => Response.json({ sheets: (await client.query('SELECT id,revision,updated_at AS "updatedAt" FROM sheets WHERE revision>0')).rows }, { headers: { "Cache-Control": "no-store" } })); }); }
