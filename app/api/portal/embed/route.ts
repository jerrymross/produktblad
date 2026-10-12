import {NextResponse} from "next/server";
import {api,HttpError} from "@/lib/access";
import {getPool} from "@/lib/db";
import {issuer,hash,introspect,verifyPortalToken} from "@/lib/portal-protocol";
import {embeddedCookie,embeddedCookieOptions,cookieValue} from "@/lib/portal-session";
export async function POST(request:Request){return api(async()=>{
  if(request.headers.get('origin')!==issuer||request.headers.get('sec-fetch-dest')!=='iframe')throw new HttpError(403,'Appen får endast öppnas från Astar Studio-portalen.');
  const form=await request.formData(),ticket=form.get('ticket');if(typeof ticket!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(ticket))throw new HttpError(400,'Ogiltig appbiljett.');
  const tx=(await getPool().query('DELETE FROM portal_embed_tickets WHERE ticket_hash=$1 RETURNING *',[hash(ticket)])).rows[0];
  if(!tx||tx.expires_at.getTime()<=Date.now())throw new HttpError(401,'Appbiljetten är använd eller har gått ut. Öppna appen igen från portalen.');
  const session=(await getPool().query('SELECT access_token,expires_at FROM portal_sessions WHERE cookie_hash=$1 AND expires_at>now()',[tx.cookie_hash])).rows[0];
  if(!session)throw new HttpError(401,'Sessionen har gått ut.');
  try{const claims=await verifyPortalToken(session.access_token);await introspect(session.access_token,claims.sub,claims.exp);}catch{await getPool().query('DELETE FROM portal_sessions WHERE cookie_hash=$1',[tx.cookie_hash]);throw new HttpError(401,'Portalåtkomsten är inte aktiv.');}
  const stored=JSON.parse(tx.return_to);if(hash(stored.session)!==tx.cookie_hash)throw new HttpError(401,'Ogiltig session.');
  const previous=cookieValue(request.headers,embeddedCookie);if(previous)await getPool().query('DELETE FROM portal_sessions WHERE cookie_hash=$1 AND cookie_hash<>$2',[hash(previous),tx.cookie_hash]);
  const response=NextResponse.redirect(new URL(stored.returnTo==='/embed-ready'?'/embed-ready':'/produktblad',request.url),303);
  response.cookies.set(embeddedCookie,stored.session,{...embeddedCookieOptions,expires:session.expires_at});response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
});}
