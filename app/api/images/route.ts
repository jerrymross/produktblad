import { api,identity,sameOrigin,requireAdmin,HttpError } from "@/lib/access";
import { transaction } from "@/lib/db";
import { privateImage } from "@/lib/sheets-server";
import { educations } from "@/lib/image-library";
export async function GET(request:Request) {return api(async()=>{const user=await identity(request);return transaction(user.id,async client=>Response.json({images:(await client.query('SELECT education || \':\' || slot AS id,education,slot,name,\'/api/media/\' || media_id AS "dataUrl",updated_at AS "updatedAt" FROM library_images')).rows},{headers:{"Cache-Control":"no-store"}}));});}
export async function POST(request:Request) {return api(async()=>{
  sameOrigin(request);const user=await identity(request);await requireAdmin(user.id);
  const text=await request.text();if(text.length>2_800_000)throw new HttpError(413,"Bilden får vara högst 2 MB.");
  const body=JSON.parse(text);if(!educations.some(item=>item.id===body.education)||![1,2].includes(body.slot)||typeof body.name!=="string"||body.name.length>255||typeof body.dataUrl!=="string")throw new HttpError(400,"Ogiltig utbildning eller bildplats.");
  return transaction(user.id,async client=>{const url=await privateImage(client,body.dataUrl,"__library__");if(!url.startsWith("/api/media/"))throw new HttpError(400,"Ladda upp en bildfil.");await client.query("INSERT INTO library_images(education,slot,media_id,name) VALUES($1,$2,$3,$4) ON CONFLICT(education,slot) DO UPDATE SET media_id=EXCLUDED.media_id,name=EXCLUDED.name,updated_at=now()",[body.education,body.slot,url.split("/").pop(),body.name]);return Response.json({saved:true});});
});}
export async function DELETE(request:Request) {return api(async()=>{sameOrigin(request);const user=await identity(request);await requireAdmin(user.id);const {id}=await request.json();if(typeof id!=="string")throw new HttpError(400,"Ogiltig bild.");await transaction(user.id,async client=>{await client.query("DELETE FROM library_images WHERE education || ':' || slot=$1",[id]);});return Response.json({deleted:true});});}
