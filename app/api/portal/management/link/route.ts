import { api, HttpError } from "@/lib/access";
import { management } from "@/lib/portal-management";
export async function POST(request:Request){return api(async()=>Response.json(await management(request,async(db,target,text)=>{
  if(!target)throw new HttpError(400,"Användare saknas.");
  const body=JSON.parse(text);
  if(typeof body.localId!=='string'||body.localId.length>200||!Number.isInteger(body.revision)||body.revision<0||body.confirmed!==true)throw new HttpError(400,"Välj ett befintligt konto och bekräfta kopplingen.");
  return (await db.query("SELECT portal_link_identity($1,$2,$3,$4) AS profile",[target.id,body.localId,body.revision,body.confirmed])).rows[0].profile;
}),{headers:{"Cache-Control":"no-store"}}));}
