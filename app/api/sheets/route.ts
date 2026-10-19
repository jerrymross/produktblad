import { api, identity } from "@/lib/access";
import { transaction } from "@/lib/db";
import { finalizationAvailable } from "@/lib/finalization-server";
import {copiesAvailable} from "@/lib/copies-server";
import {listAddedSheets} from "@/lib/added-sheets-server";
import {trashAvailable} from "@/lib/trash-server";
export async function GET(request: Request) { return api(async () => { const user=await identity(request); return transaction(user.id, async client => {
  const available=await finalizationAvailable(client);
  const copies=await copiesAvailable(client);
  const query=`SELECT s.id,s.revision,s.updated_at AS "updatedAt",${available?'COALESCE(f.finalized,false)':'false'} AS finalized${copies?',c.source_id AS "sourceId",c.copy_number AS "copyNumber"':''} FROM sheets s ${available?'LEFT JOIN sheet_finalizations f ON f.sheet_id=s.id':''} ${copies?'LEFT JOIN sheet_copies c ON c.copy_id=s.id':''} WHERE s.revision>0`;
  const deletedIds=await trashAvailable(client)?(await client.query('SELECT sheet_id FROM sheet_trash')).rows.map(row=>row.sheet_id):[];
  return Response.json({sheets:(await client.query(query)).rows,addedSheets:await listAddedSheets(client),deletedIds},{headers:{"Cache-Control":"no-store"}});
}); }); }
