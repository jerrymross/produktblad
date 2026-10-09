import { decodeSheetId } from "@/lib/sheet-id";
import { api,identity } from "@/lib/access";
import { transaction } from "@/lib/db";
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {return api(async()=>{
  const user=await identity(request);const id=decodeSheetId((await context.params).id);
  return transaction(user.id,async client=>Response.json({versions:(await client.query('SELECT revision,created_at AS "createdAt",content FROM sheet_versions WHERE sheet_id=$1 ORDER BY revision DESC LIMIT 30',[id])).rows},{headers:{"Cache-Control":"no-store"}}));
});}
