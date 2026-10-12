import { createHash } from "node:crypto";
import { api,sameOrigin,HttpError,identity } from "@/lib/access";
import { getPool,transaction } from "@/lib/db";
export async function POST(request:Request) {return api(async()=>{
  sameOrigin(request);const user=await identity(request);const body=await request.json();
  if(typeof body.token!=="string"||!/^[a-f0-9]{64}$/.test(body.token))throw new HttpError(400,"Ogiltig inbjudan.");
  const hash=createHash("sha256").update(body.token).digest("hex");
  const invite=await getPool().query("SELECT email FROM invitations WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()",[hash]);
  if(!invite.rowCount || invite.rows[0].email.toLowerCase()!==user.email.toLowerCase())throw new HttpError(400,"Inbjudan är ogiltig, använd, utgången eller avsedd för ett annat portalkonto.");
  const email=invite.rows[0].email;
  await transaction(user.id,async client=>{await client.query("SELECT portal_accept_invitation($1,$2,$3)",[hash,user.id,user.email]);});
  return Response.json({email});
});}
