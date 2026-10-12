import {api,HttpError} from "@/lib/access";
import {getPool} from "@/lib/db";
import {hash,randomSecret,verifyPortalToken,introspect} from "@/lib/portal-protocol";
export async function POST(request:Request){return api(async()=>{
  if(request.headers.has('origin'))throw new HttpError(403,'Endast portalens server får skapa en appbiljett.');
  const bearer=request.headers.get('authorization');if(!bearer?.startsWith('Bearer ')||bearer.length>8192)throw new HttpError(401,'Verifierad portalåtkomst krävs.');
  let claims;try{claims=await verifyPortalToken(bearer.slice(7));await introspect(bearer.slice(7),claims.sub,claims.exp);}catch{throw new HttpError(401,'Portalåtkomsten är inte aktiv.');}
  const body=await request.json();const returnTo=body.returnTo==='/embed-ready'?'/embed-ready':'/produktblad';
  const ticket=randomSecret(),session=randomSecret(),db=await getPool().connect();
  try{await db.query('BEGIN');await db.query('DELETE FROM portal_embed_tickets WHERE expires_at<=now()');await db.query('DELETE FROM portal_sessions WHERE expires_at<=now()');
    await db.query('SELECT portal_new_identity($1,$2)',[claims.sub,claims.name]);
    await db.query('INSERT INTO portal_sessions(cookie_hash,portal_sub,access_token,expires_at) VALUES($1,$2,$3,to_timestamp($4))',[hash(session),claims.sub,bearer.slice(7),claims.exp]);
    await db.query('INSERT INTO portal_embed_tickets(ticket_hash,cookie_hash,return_to) VALUES($1,$2,$3)',[hash(ticket),hash(session),JSON.stringify({returnTo,session})]);await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  return Response.json({ticket},{headers:{'Cache-Control':'no-store'}});
});}
