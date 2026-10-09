import { decodeSheetId } from "@/lib/sheet-id";
import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { ensureSheet } from "@/lib/sheets-server";
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context) { return api(async()=>{
  sameOrigin(request);const user=await identity(request);const id=decodeSheetId((await context.params).id);
  const {token,renew}=await request.json();if(!/^[a-f0-9-]{36}$/.test(token))throw new HttpError(400,"Ogiltig redigeringssession.");
  return transaction(user.id,async client=>{
    await ensureSheet(client,id);
    await client.query("SELECT id FROM sheets WHERE id=$1 FOR UPDATE",[id]);
    const result=renew
      ? await client.query("UPDATE editing_locks SET expires_at=clock_timestamp()+interval '120 seconds' WHERE sheet_id=$1 AND user_id=$2 AND token=$3 AND expires_at>clock_timestamp() RETURNING expires_at",[id,user.id,token])
      : await client.query("INSERT INTO editing_locks(sheet_id,user_id,token,expires_at) VALUES($1,$2,$3,clock_timestamp()+interval '120 seconds') ON CONFLICT(sheet_id) DO UPDATE SET user_id=EXCLUDED.user_id,token=EXCLUDED.token,expires_at=EXCLUDED.expires_at WHERE editing_locks.expires_at<=clock_timestamp() OR (editing_locks.user_id=$2 AND editing_locks.token=$3) RETURNING expires_at",[id,user.id,token]);
    if(!result.rowCount)throw new HttpError(409,renew?"Redigeringslåset har gått ut. Dina ändringar finns kvar här.":"Bladet redigeras i en annan flik eller av en annan användare. Du kan läsa det här.");
    return Response.json({locked:true});
  });
}); }
export async function DELETE(request:Request,context:Context) {return api(async()=>{
  sameOrigin(request);const user=await identity(request);const {token}=await request.json();const id=decodeSheetId((await context.params).id);
  await transaction(user.id,async client=>{await client.query("SELECT id FROM sheets WHERE id=$1 FOR UPDATE",[id]);await client.query("DELETE FROM editing_locks WHERE sheet_id=$1 AND user_id=$2 AND token=$3",[id,user.id,token]);});
  return Response.json({released:true});
});}
