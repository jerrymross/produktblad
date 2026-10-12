import { api, identity } from "@/lib/access";
import { transaction } from "@/lib/db";
import { finalizationAvailable } from "@/lib/finalization-server";
import {copiesAvailable} from "@/lib/copies-server";
export async function GET(request: Request) { return api(async () => { const user=await identity(request); return transaction(user.id, async client => {
  const available=await finalizationAvailable(client);
  const copies=await copiesAvailable(client);
  const query=`SELECT s.id,s.revision,s.updated_at AS "updatedAt",${available?'COALESCE(f.finalized,false)':'false'} AS finalized${copies?',c.source_id AS "sourceId",c.copy_number AS "copyNumber"':''} FROM sheets s ${available?'LEFT JOIN sheet_finalizations f ON f.sheet_id=s.id':''} ${copies?'LEFT JOIN sheet_copies c ON c.copy_id=s.id':''} WHERE s.revision>0`;
  return Response.json({sheets:(await client.query(query)).rows},{headers:{"Cache-Control":"no-store"}});
}); }); }
