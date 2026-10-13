import { appBasePath } from "./app-path";
import { getPool } from "@/lib/db";
import { hash, introspect, verifyPortalToken } from "@/lib/portal-protocol";

export const sessionCookie = "produktblad-portal";
export const embeddedCookie = "__Host-produktblad-embedded";
export const embeddedCookieOptions = {httpOnly:true,secure:true,sameSite:"none" as const,path:"/",partitioned:true};
export const transactionCookie = "produktblad-portal-login";
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: appBasePath || "/" };
export function cookieValue(headers: Headers, name: string) {
  const value = headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}
export async function portalIdentity(headers: Headers) {
  const cookie = (appBasePath ? undefined : cookieValue(headers, embeddedCookie)) ?? cookieValue(headers, sessionCookie);
  if (!cookie) return null;
  const pool = getPool();
  const row = (await pool.query(`SELECT s.access_token,s.portal_sub,u.id,u.name FROM portal_sessions s
    JOIN portal_identities i ON i.portal_sub=s.portal_sub JOIN "user" u ON u.id=i.user_id
    WHERE s.cookie_hash=$1 AND s.expires_at>now()`, [hash(cookie)])).rows[0];
  if (!row) return null;
  try {
    const claims = await verifyPortalToken(row.access_token);
    if (claims.sub !== row.portal_sub) throw new Error("Fel identitet.");
    await introspect(row.access_token, claims.sub, claims.exp);
    return { id: row.id as string, name: row.name as string, email: claims.email };
  } catch {
    await pool.query("DELETE FROM portal_sessions WHERE cookie_hash=$1", [hash(cookie)]);
    return null;
  }
}
