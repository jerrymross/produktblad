import { randomBytes,randomUUID,createHash } from "node:crypto";
import { api,identity,requireAdmin,sameOrigin,HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { schools } from "@/lib/catalog";
export async function POST(request:Request) {return api(async()=>{
  sameOrigin(request);const user=await identity(request);await requireAdmin(user.id);
  const body=await request.json();const email=String(body.email??"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!Array.isArray(body.schools)||body.schools.some((name:unknown)=>typeof name!=="string"||!schools.includes(name))||(!body.central&&!body.schools.length))throw new HttpError(400,"Ange e-post och minst en skola eller central behörighet.");
  const token=randomBytes(32).toString("hex");const hash=createHash("sha256").update(token).digest("hex");
  await transaction(user.id,async client=>{await client.query("INSERT INTO invitations(id,token_hash,email,central,school_ids) VALUES($1,$2,$3,$4,$5)",[randomUUID(),hash,email,body.central===true,body.schools]);});
  return Response.json({url:`${new URL(request.url).origin}/login?invite=${token}`,email});
});}
