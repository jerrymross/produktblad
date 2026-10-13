import { publicAppUrl } from "@/lib/app-origin";
import { randomBytes,randomUUID,createHash } from "node:crypto";
import { api,identity,requireAdmin,sameOrigin,HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { schools } from "@/lib/catalog";
export async function POST(request:Request) {return api(async()=>{
  sameOrigin(request);const user=await identity(request);await requireAdmin(user.id);
  const body=await request.json();if(!body||typeof body!=="object"||Array.isArray(body))throw new HttpError(400,"Ogiltig inbjudan.");const email=String(body.email??"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof body.central!=="boolean"||!Array.isArray(body.schools)||body.schools.some((name:unknown)=>typeof name!=="string"||!schools.includes(name))||(!body.central&&!body.schools.length))throw new HttpError(400,"Ange e-post, välj Admin eller Vanlig användare och minst en skola för vanliga användare.");
  const assignedSchools=body.central ? [] : [...new Set(body.schools)];
  const token=randomBytes(32).toString("hex");const hash=createHash("sha256").update(token).digest("hex");
  await transaction(user.id,async client=>{const permitted=await client.query("SELECT is_central() AS allowed");if(permitted.rows[0]?.allowed!==true)throw new HttpError(403,"Endast admin kan bjuda in användare.");await client.query("INSERT INTO invitations(id,token_hash,email,central,school_ids) VALUES($1,$2,$3,$4,$5)",[randomUUID(),hash,email,body.central,assignedSchools]);});
  return Response.json({url:`${publicAppUrl}/login?invite=${token}`,email});
});}
