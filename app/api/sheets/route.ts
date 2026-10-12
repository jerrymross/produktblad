import { api, identity } from "@/lib/access";
import { transaction } from "@/lib/db";
import { finalizationAvailable } from "@/lib/finalization-server";
export async function GET(request: Request) { return api(async () => { const user=await identity(request); return transaction(user.id, async client => {
  const available=await finalizationAvailable(client);
  const query=available ? `SELECT s.id,s.revision,s.updated_at AS "updatedAt",COALESCE(f.finalized,false) AS finalized FROM sheets s LEFT JOIN sheet_finalizations f ON f.sheet_id=s.id WHERE s.revision>0` : 'SELECT id,revision,updated_at AS "updatedAt",false AS finalized FROM sheets WHERE revision>0';
  return Response.json({sheets:(await client.query(query)).rows},{headers:{"Cache-Control":"no-store"}});
}); }); }
