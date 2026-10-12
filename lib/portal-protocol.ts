import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export const issuer = "https://astar-studio-portal.vercel.app";
export const clientId = "produktblad";
export const callback = "https://produktblad.vercel.app/api/portal/callback";
export const randomSecret = () => randomBytes(32).toString("base64url");
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const challenge = (value: string) => createHash("sha256").update(value).digest("base64url");
export function safeReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return "/produktblad";
  const url = new URL(value, callback);
  if (url.origin !== new URL(callback).origin || /^\/(api|login|logged-out)(\/|\?|$)/.test(value)) return "/produktblad";
  return url.pathname + url.search + url.hash;
}
export const keys = createRemoteJWKSet(new URL(`${issuer}/api/sso/jwks`), { timeoutDuration: 5000 });
export async function verifyPortalToken(token: string, key: JWTVerifyGetKey = keys) {
  const { payload, protectedHeader } = await jwtVerify(token, key, {
    algorithms: ["RS256"], issuer, audience: clientId, typ: "at+jwt",
    requiredClaims: ["sub", "sid", "exp", "iat", "jti", "app_id"], maxTokenAge: "5m",
  });
  if (protectedHeader.typ !== "at+jwt" || payload.aud !== clientId || payload.app_id !== clientId ||
      ![payload.sub, payload.sid, payload.jti].every(value => typeof value === "string" && value.length > 0) ||
      typeof payload.exp !== "number" || typeof payload.iat !== "number" || payload.exp <= payload.iat || payload.exp - payload.iat > 300 ||
      typeof payload.email !== "string" || typeof payload.name !== "string") throw new Error("Ogiltig portalidentitet.");
  return { sub: payload.sub!, exp: payload.exp, email: payload.email, name: payload.name };
}
export async function introspect(token: string, sub: string, exp: number, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`${issuer}/api/sso/introspect`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Portalåtkomsten kunde inte verifieras.");
  const result = await response.json();
  if (result.active !== true || result.sub !== sub || result.app_id !== clientId || result.exp !== exp || exp <= Date.now() / 1000) throw new Error("Portalåtkomsten är inte aktiv.");
}
