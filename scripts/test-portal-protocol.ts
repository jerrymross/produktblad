import assert from "node:assert/strict";
import { generateKeyPair, SignJWT, createLocalJWKSet, exportJWK } from "jose";
import { issuer, clientId, randomSecret, challenge, safeReturnTo, verifyPortalToken, introspect } from "../lib/portal-protocol";

async function main() {
  assert.equal(challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  assert.match(randomSecret(), /^[A-Za-z0-9_-]{43}$/);
  for (const value of ["//evil.test", "/\\evil.test", "https://evil.test", "/api/portal/logout", "/\n/evil"]) assert.equal(safeReturnTo(value), "/produktblad");
  assert.equal(safeReturnTo("/?blad=abc"), "/?blad=abc");
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwks = createLocalJWKSet({ keys: [await exportJWK(publicKey)] });
  const now = Math.floor(Date.now() / 1000);
  async function sign(overrides = {}, typ = "at+jwt") {
    return new SignJWT({ iss: issuer, aud: clientId, sub: "subject", sid: "session", jti: "unique", app_id: clientId, email: "test@example.org", name: "Test", iat: now, exp: now + 300, ...overrides }).setProtectedHeader({ alg: "RS256", typ }).sign(privateKey);
  }
  const token = await sign();
  assert.equal((await verifyPortalToken(token, jwks)).sub, "subject");
  for (const overrides of [{ iss: "wrong" }, { aud: "wrong" }, { app_id: "wrong" }, { exp: now - 1 }, { iat: now + 60 }, { sid: null }, { jti: "" }, { sub: null }, { exp: now + 301 }]) await assert.rejects(verifyPortalToken(await sign(overrides), jwks));
  await assert.rejects(verifyPortalToken(await sign({}, "JWT"), jwks));
  const other = await generateKeyPair("RS256");
  await assert.rejects(verifyPortalToken(token, createLocalJWKSet({ keys: [await exportJWK(other.publicKey)] })));
  const active = { active: true, sub: "subject", app_id: clientId, exp: now + 300 };
  const fake = (body: unknown, status = 200) => (async () => Response.json(body, { status })) as typeof fetch;
  await introspect(token, "subject", now + 300, fake(active));
  for (const body of [{ ...active, active: false }, { ...active, sub: "other" }, { ...active, app_id: "other" }, { ...active, exp: now }, {}]) await assert.rejects(introspect(token, "subject", now + 300, fake(body)));
  await assert.rejects(introspect(token, "subject", now + 300, fake(active, 503)));
  await assert.rejects(introspect(token, "subject", now + 300, (async () => { throw Error("offline"); }) as typeof fetch));
  console.log("PASS: PKCE S256, interna returadresser, signatur, issuer, audience, typ, claims, utgångstid och fail-closed introspection.");
}
main();
