import { api, HttpError } from "@/lib/access";
import { management, permissionProfile } from "@/lib/portal-management";
export async function GET(request:Request){return api(async()=>Response.json(await management(request,async(db,target)=>{
  if(!target)throw new HttpError(400,"Användare saknas.");
  return {target,...await permissionProfile(db,target.id)};
}),{headers:{"Cache-Control":"no-store"}}));}
export async function PUT(request:Request){return api(async()=>Response.json(await management(request,async(db,target,text)=>{
  if(!target)throw new HttpError(400,"Användare saknas.");
  const body=JSON.parse(text);
  if(!['user','admin'].includes(body.role)||!Array.isArray(body.schools)||body.schools.length>100||!body.schools.every((id:unknown)=>typeof id==='string')||!Number.isInteger(body.revision)||body.revision<0||(body.confirmAdmin!==undefined&&typeof body.confirmAdmin!=='boolean'))throw new HttpError(400,"Ogiltig roll, skola eller version.");
  return (await db.query("SELECT portal_set_permissions($1,$2,$3,$4,$5,$6) AS profile",[target.id,target.name,body.role,[...new Set(body.schools)],body.revision,body.confirmAdmin===true])).rows[0].profile;
}),{headers:{"Cache-Control":"no-store"}}));}
