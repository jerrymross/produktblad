import { decodeSheetId } from "@/lib/sheet-id";
import { api,identity } from "@/lib/access";
import { transaction } from "@/lib/db";
import { finalizationAvailable } from "@/lib/finalization-server";
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {return api(async()=>{
  const user=await identity(request);const id=decodeSheetId((await context.params).id);
  return transaction(user.id,async client=>{
    const versions=(await client.query('SELECT revision,created_at AS "createdAt",content FROM sheet_versions WHERE sheet_id=$1 ORDER BY revision DESC LIMIT 30',[id])).rows;
    const events=await finalizationAvailable(client)?(await client.query(`SELECT e.finalized,e.revision,e.created_at AS "createdAt",COALESCE(u.name,'Tidigare användare') AS "changedBy" FROM sheet_finalization_events e LEFT JOIN "user" u ON u.id=e.changed_by WHERE e.sheet_id=$1 ORDER BY e.state_version DESC LIMIT 30`,[id])).rows:[];
    return Response.json({versions,events},{headers:{"Cache-Control":"no-store"}});
  });
});}
