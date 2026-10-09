import { createHash } from "node:crypto";
import { api,sameOrigin,HttpError } from "@/lib/access";
import { getPool,transaction } from "@/lib/db";
import { getAuth } from "@/lib/auth";
export async function POST(request:Request) {return api(async()=>{
  sameOrigin(request);const body=await request.json();
  if(typeof body.token!=="string"||!/^[a-f0-9]{64}$/.test(body.token)||typeof body.password!=="string"||body.password.length<12||body.password.length>128||typeof body.name!=="string"||!body.name.trim()||body.name.length>100)throw new HttpError(400,"Ange ditt namn och ett lösenord med 12–128 tecken.");
  const hash=createHash("sha256").update(body.token).digest("hex");
  const invite=await getPool().query("SELECT email FROM invitations WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now()",[hash]);
  if(!invite.rowCount)throw new HttpError(400,"Inbjudan är ogiltig, använd eller har gått ut.");
  const email=invite.rows[0].email;
  const result=await getAuth().api.signUpEmail({body:{email,password:body.password,name:body.name.trim()}});
  await transaction(result.user.id,async client=>{await client.query("SELECT accept_invitation($1,$2,$3)",[hash,result.user.id,email]);});
  return Response.json({email});
});}
