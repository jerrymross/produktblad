import { previewFetch } from "@/lib/preview-access";
import { appPath } from "@/lib/app-path";
import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { issuer, clientId, callback, hash, randomSecret, verifyPortalToken, introspect, safeReturnTo } from "@/lib/portal-protocol";
import { cookieOptions, cookieValue, transactionCookie, sessionCookie } from "@/lib/portal-session";

export async function GET(request: Request) {
  const failure = NextResponse.redirect(new URL(appPath("/login?error=portal"), callback));
  failure.cookies.set(transactionCookie, "", { ...cookieOptions, maxAge: 0 });
  failure.headers.set("Cache-Control", "no-store");
  failure.headers.set("Referrer-Policy", "no-referrer");
  try {
    const url = new URL(request.url), cookie = cookieValue(request.headers, transactionCookie);
    if (!cookie) return failure;
    const tx = (await getPool().query("DELETE FROM portal_transactions WHERE cookie_hash=$1 RETURNING *", [hash(cookie)])).rows[0];
    const code = url.searchParams.get("code"), state = url.searchParams.get("state");
    if (!tx || tx.expires_at.getTime() <= Date.now() || !state || hash(state) !== tx.state_hash || !code || code.length > 1024 || url.searchParams.getAll("code").length !== 1 || url.searchParams.getAll("state").length !== 1) return failure;
    const exchange = await previewFetch(`${issuer}/api/sso/token`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code", client_id: clientId, redirect_uri: callback, code, code_verifier: tx.verifier }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!exchange.ok) return failure;
    const result = await exchange.json();
    if (result.token_type !== "Bearer" || typeof result.access_token !== "string") return failure;
    const claims = await verifyPortalToken(result.access_token);
    await introspect(result.access_token, claims.sub, claims.exp);
    const session = randomSecret(), db = await getPool().connect();
    try {
      await db.query("BEGIN");
      await db.query("SELECT portal_new_identity($1,$2)", [claims.sub, claims.name]);
      const previous = cookieValue(request.headers, sessionCookie);
      if (previous) await db.query("DELETE FROM portal_sessions WHERE cookie_hash=$1", [hash(previous)]);
      await db.query("INSERT INTO portal_sessions(cookie_hash,portal_sub,access_token,expires_at) VALUES($1,$2,$3,to_timestamp($4))", [hash(session), claims.sub, result.access_token, claims.exp]);
      await db.query("COMMIT");
    } catch (error) { await db.query("ROLLBACK"); throw error; }
    finally { db.release(); }
    const response = NextResponse.redirect(new URL(safeReturnTo(tx.return_to), callback));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(transactionCookie, "", { ...cookieOptions, maxAge: 0 });
    response.cookies.set(sessionCookie, session, { ...cookieOptions, expires: new Date(claims.exp * 1000) });
    return response;
  } catch { return failure; }
}
