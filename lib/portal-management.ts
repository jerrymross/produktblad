import { previewFetch } from "@/lib/preview-access";
import { createHash } from "node:crypto";
import { jwtVerify, type JWTVerifyGetKey } from "jose";
import { HttpError } from "@/lib/access";
import { issuer, keys } from "@/lib/portal-protocol";
import { getPool, transaction } from "@/lib/db";
import type { PoolClient } from "pg";
import { appBasePath } from "./app-path";

export const managementAudience = "produktblad-management", managementType = "portal-management+jwt";
export const requestDigest = (method: string, path: string, body = "") => createHash("sha256").update(`${method}\n${path}\n${body}`).digest("hex");
export async function verifyManagementToken(token: string, method: string, path: string, body: string, key: JWTVerifyGetKey = keys) {
  const { payload, protectedHeader } = await jwtVerify(token, key, { issuer, audience: managementAudience, algorithms: ["RS256"], typ: managementType, maxTokenAge: "60s",
    requiredClaims: ["sub", "sid", "exp", "iat", "jti", "scope", "app_id", "request_hash"] });
  if (protectedHeader.typ !== managementType || payload.aud !== managementAudience || payload.scope !== "produktblad:manage" || payload.app_id !== "produktblad" ||
    ![payload.sub, payload.sid, payload.jti].every(value => typeof value === "string" && value.length > 0) ||
    typeof payload.exp !== "number" || typeof payload.iat !== "number" || payload.exp - payload.iat > 60 || payload.exp <= payload.iat ||
    payload.request_hash !== requestDigest(method, path, body) || (payload.target_sub !== undefined && typeof payload.target_sub !== "string")) throw new HttpError(401, "Ogiltig administrationsförfrågan.");
  return payload;
}
export async function management(request: Request, operation: (db: PoolClient, target: { id: string; name: string; email: string } | null, body: string) => Promise<unknown>) {
  if (request.headers.has("origin")) throw new HttpError(403, "Administrationsbryggan får bara anropas av portalens server.");
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || auth.length > 8192) throw new HttpError(401, "Verifierad portal-administration krävs.");
  const body = request.method === "GET" ? "" : await request.text();
  if (body.length > 24000) throw new HttpError(413, "Förfrågan är för stor.");
  let claims, live;
  try {
    const pathname = new URL(request.url).pathname;
    const canonicalPath = appBasePath && pathname.startsWith(appBasePath + "/") ? pathname.slice(appBasePath.length) : pathname;
    claims = await verifyManagementToken(auth.slice(7), request.method, canonicalPath, body);
    const response = await previewFetch(`${issuer}/api/sso/management/introspect`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: "{}",
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error();
    live = await response.json();
    if (live.active !== true || live.sub !== claims.sub || live.jti !== claims.jti || live.exp !== claims.exp || live.scope !== "produktblad:manage" ||
      (claims.target_sub && (live.target?.id !== claims.target_sub || typeof live.target.name !== "string" || typeof live.target.email !== "string"))) throw Error();
  } catch { throw new HttpError(401, "Portalens administrationsbehörighet kunde inte verifieras."); }
  const actor = (await getPool().query("SELECT user_id FROM portal_identities WHERE portal_sub=$1", [claims.sub])).rows[0]?.user_id;
  if (!actor) throw new HttpError(403, "Ditt portalkonto behöver en verifierad koppling till en Produktblad-administratör.");
  return transaction(actor, async db => {
    // Serialize admin changes and recheck the protected local role within the write transaction.
    await db.query("SELECT pg_advisory_xact_lock(hashtext('portal-management'))");
    if (!(await db.query("SELECT is_central() AS allowed")).rows[0].allowed) throw new HttpError(403, "Produktblad-admin krävs för att hantera skolor och roller.");
    if (request.method !== "GET") {
      const accepted = await db.query("SELECT portal_management_nonce($1,$2) AS accepted", [claims.jti, claims.exp]);
      if (!accepted.rows[0].accepted) throw new HttpError(409, "Förfrågan har redan använts. Läs in aktuell åtkomst igen.");
    }
    return operation(db, claims.target_sub ? live.target : null, body);
  });
}
export async function permissionProfile(db: PoolClient, subject: string) {
  return (await db.query("SELECT portal_permission_profile($1) AS profile", [subject])).rows[0].profile;
}
