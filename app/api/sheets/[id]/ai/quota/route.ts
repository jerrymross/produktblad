import { api, identity, HttpError } from "@/lib/access";
import { decodeSheetId } from "@/lib/sheet-id";
import { readSheet } from "@/lib/sheets-server";
import { portalAccessToken } from "@/lib/portal-session";
import { issuer } from "@/lib/portal-protocol";
import { previewFetch } from "@/lib/preview-access";
import { isAiQuota } from "@/lib/ai-quota";

export async function GET(request:Request,context:{params:Promise<{id:string}>}){return api(async()=>{
  const user=await identity(request),id=decodeSheetId((await context.params).id);
  await readSheet(user.id,id);
  const token=await portalAccessToken(request.headers,user.id);
  if(!token)throw new HttpError(401,"Logga in via Astar Studio igen.");
  let response;
  try{response=await previewFetch(new URL('/api/ai/apps/v1/product-sheet-quota',issuer),{
    headers:{Authorization:`Bearer ${token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(10000),
  });}catch{throw new HttpError(502,"Dagens AI-kvot kunde inte hämtas.");}
  if(!response.ok)throw new HttpError(response.status===401?401:502,"Dagens AI-kvot kunde inte hämtas.");
  const quota=await response.json();
  if(!isAiQuota(quota))throw new HttpError(502,"AI-tjänsten gav ett ogiltigt kvotsvar.");
  if((await identity(request)).id!==user.id)throw new HttpError(401,"Din inloggning har ändrats.");
  await readSheet(user.id,id);
  return Response.json(quota,{headers:{"Cache-Control":"no-store"}});
});}
