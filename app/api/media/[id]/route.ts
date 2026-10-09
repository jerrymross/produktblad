import { api,identity,HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {return api(async()=>{
  const user=await identity(request);const id=(await context.params).id;
  if(!/^[a-f0-9-]{36}$/.test(id))throw new HttpError(404,"Bilden finns inte.");
  return transaction(user.id,async client=>{const result=await client.query("SELECT mime,bytes FROM media WHERE id=$1",[id]);if(!result.rowCount)throw new HttpError(404,"Bilden finns inte eller du saknar åtkomst.");return new Response(new Uint8Array(result.rows[0].bytes),{headers:{"Content-Type":result.rows[0].mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});});
});}
