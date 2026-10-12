import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { issuer, clientId, callback, randomSecret, hash, challenge, safeReturnTo } from "@/lib/portal-protocol";
import { cookieOptions, transactionCookie } from "@/lib/portal-session";

export async function GET(request: Request) {
  if(request.headers.get('sec-fetch-dest')==='iframe')return NextResponse.redirect(new URL('/embed-login',request.url));
  if (new URL(request.url).origin !== new URL(callback).origin) return Response.json({ error: "Portalinloggning kräver den registrerade produktionsadressen." }, { status: 400 });
  const state = randomSecret(), verifier = randomSecret(), cookie = randomSecret();
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get("returnTo"));
  const pool = getPool();
  await pool.query("DELETE FROM portal_transactions WHERE expires_at<=now()");
  await pool.query("DELETE FROM portal_sessions WHERE expires_at<=now()");
  await pool.query("INSERT INTO portal_transactions(cookie_hash,state_hash,verifier,return_to) VALUES($1,$2,$3,$4)", [hash(cookie), hash(state), verifier, returnTo]);
  const url = new URL(`${issuer}/api/sso/authorize`);
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: callback, code_challenge: challenge(verifier), code_challenge_method: "S256", state }).toString();
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(transactionCookie, cookie, { ...cookieOptions, maxAge: 300 });
  return response;
}
