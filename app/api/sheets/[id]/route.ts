import { decodeSheetId } from "@/lib/sheet-id";
import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { ensureSheet, readSheet, privateImage, validateContent } from "@/lib/sheets-server";
import { TEMPLATE_VERSION } from "@/lib/sheet";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) { return api(async () => { const user=await identity(request); return Response.json(await readSheet(user.id,decodeSheetId((await context.params).id)), { headers: { "Cache-Control":"no-store" } }); }); }
export async function PUT(request: Request, context: Context) { return api(async () => {
  sameOrigin(request); const user=await identity(request); const id=decodeSheetId((await context.params).id);
  const text=await request.text(); if(text.length>3_000_000) throw new HttpError(413,"Bladet är för stort.");
  const body=JSON.parse(text); validateContent(body.content);
  if(!Number.isInteger(body.revision) || !/^[a-f0-9-]{36}$/.test(body.token)) throw new HttpError(400,"Ogiltig bladversion eller redigeringssession.");
  return transaction(user.id,async client => {
    await ensureSheet(client,id);
    const current=await client.query("SELECT * FROM sheets WHERE id=$1 FOR UPDATE",[id]);
    const lock=await client.query("SELECT 1 FROM editing_locks WHERE sheet_id=$1 AND user_id=$2 AND token=$3 AND expires_at>clock_timestamp() FOR UPDATE",[id,user.id,body.token]);
    if(!lock.rowCount) throw new HttpError(409,"Redigeringslåset har gått ut eller tagits av en annan session. Dina ändringar finns kvar här.");
    if(current.rows[0].revision!==body.revision) throw new HttpError(409,"En nyare version finns. Dina ändringar finns kvar; öppna senaste versionen i en ny flik.");
    const content={...body.content,image:await privateImage(client,body.content.image,current.rows[0].school_id)};
    const updated=await client.query('UPDATE sheets SET content=$2,revision=revision+1,template_version=$3,updated_at=now(),updated_by=$4 WHERE id=$1 RETURNING revision,updated_at AS "updatedAt"',[id,content,TEMPLATE_VERSION,user.id]);
    const revision=updated.rows[0].revision;
    await client.query("INSERT INTO sheet_versions(sheet_id,revision,content,template_version,changed_by) VALUES($1,$2,$3,$4,$5)",[id,revision,content,TEMPLATE_VERSION,user.id]);
    return Response.json({...updated.rows[0],content});
  });
}); }
