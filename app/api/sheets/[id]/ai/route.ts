import { api, identity, sameOrigin, HttpError } from "@/lib/access";
import { decodeSheetId } from "@/lib/sheet-id";
import { readSheet } from "@/lib/sheets-server";
import { portalAccessToken } from "@/lib/portal-session";
import { issuer } from "@/lib/portal-protocol";
import { previewFetch } from "@/lib/preview-access";
import { aiTextFields, isAiTextField } from "@/lib/ai-text";

export const maxDuration = 60;
type Context = {params:Promise<{id:string}>};
export async function POST(request:Request,context:Context){return api(async()=>{
  sameOrigin(request);
  const user=await identity(request),id=decodeSheetId((await context.params).id);
  const raw=await request.text();
  if(raw.length>14000)throw new HttpError(413,"Underlaget är för långt. Använd högst 6 000 tecken per fält.");
  let body:Record<string,unknown>;
  try{body=JSON.parse(raw);}catch{throw new HttpError(400,"Underlaget måste vara giltig JSON.");}
  if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).some(k=>!["field","action","facts","currentText"].includes(k))||
    typeof body.field!=="string"||!isAiTextField(body.field)||typeof body.action!=="string"||!["generate","shorten"].includes(body.action)||
    typeof body.facts!=="string"||body.facts.length>6000||typeof body.currentText!=="string"||body.currentText.length>6000||
    (body.action==="generate"&&body.facts.trim().length<10)||(body.action==="shorten"&&!body.currentText.trim()))throw new HttpError(400,"Ange ett bekräftat faktaunderlag och välj ett textfält.");
  const field=body.field;
  // Same school/RLS check as reading or editing the sheet. No admin role is required.
  const sheet=await readSheet(user.id,id);
  if(sheet.finalization.finalized)throw new HttpError(409,"Bladet är låst. Lås upp det innan du skapar textförslag.");
  const token=await portalAccessToken(request.headers,user.id);
  if(!token)throw new HttpError(401,"Logga in via Astar Studio igen. Din befintliga text finns kvar.");
  const entry=sheet.entry;
  let response:Response;
  try{
    response=await previewFetch(new URL('/api/ai/apps/v1/product-sheet-text',issuer),{
      method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({field,action:body.action,facts:body.facts,currentText:body.currentText,education:entry.title,program:"program" in entry?entry.program:"Komvux"}),
      cache:"no-store",redirect:"error",signal:AbortSignal.timeout(50000),
    });
  }catch{throw new HttpError(502,"AI-tjänsten kunde inte nås. Din befintliga text finns kvar. Försök igen senare.");}
  if(!response.ok){
    const messages:Record<number,string>={401:"Logga in via Astar Studio igen för att använda AI.",403:"Din åtkomst till Produktblad har ändrats.",429:"AI-gränsen är nådd. Försök senare eller kontakta administratören.",503:"AI-tjänsten är pausad eller inte konfigurerad. Kontakta administratören."};
    throw new HttpError([401,403,429,503].includes(response.status)?response.status:502,messages[response.status]??"Textförslaget kunde inte skapas. Prova igen med ett kortare underlag.");
  }
  const result=await response.json();
  if(result.field!==field||typeof result.text!=="string"||result.text.length>aiTextFields[field].limit||!Array.isArray(result.missingFacts)||result.missingFacts.length>8||result.missingFacts.some((v:unknown)=>typeof v!=="string"||v.length>300)||typeof result.maxCharacters!=="number"||result.maxCharacters<1||result.maxCharacters>aiTextFields[field].limit)throw new HttpError(502,"AI-svaret kunde inte användas. Försök igen.");
  // Recheck both identities and sheet access after the external operation.
  if((await identity(request)).id!==user.id)throw new HttpError(401,"Din inloggning har ändrats. Logga in igen.");
  const latest=await readSheet(user.id,id);
  if(latest.finalization.finalized)throw new HttpError(409,"Bladet har låsts under tiden. Din befintliga text finns kvar.");
  return Response.json(result,{headers:{"Cache-Control":"no-store"}});
});}
