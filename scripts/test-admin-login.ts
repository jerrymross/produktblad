import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { adminLoginAlias } from "../lib/admin-login";

// Isolated Better Auth integration: no Neon connection or production writes.
async function main() {
const auth = betterAuth({
  database: memoryAdapter({ user: [], account: [], session: [], verification: [] }),
  secret: randomBytes(48).toString("hex"),
  baseURL: "http://localhost:3000",
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  hooks: { before: adminLoginAlias },
  logger: { disabled: true },
});
const password = randomBytes(24).toString("hex");
const owner = await auth.api.signUpEmail({ body: { email: "jerrymross@gmail.com", name: "Testadmin", password } });
const colleague = await auth.api.signUpEmail({ body: { email: "colleague@example.com", name: "Testkollega", password } });

async function login(email: string, enteredPassword = password) {
  return auth.handler(new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ email, password: enteredPassword }),
  }));
}
for (const alias of ["admin", "ADMIN", " admin ", "jerrymross@gmail.com"]) {
  const response = await login(alias);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.user.id, owner.user.id);
  const cookies = response.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ");
  const session = await auth.handler(new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie: cookies } }));
  assert.equal((await session.json()).user.id, owner.user.id);
}
const incorrect = await login("admin", "incorrect-password");
assert.equal(incorrect.status, 401);
assert.equal(incorrect.headers.getSetCookie().length, 0);
assert.notEqual((await login("administrator")).status, 200);
const ordinary = await login("colleague@example.com");
assert.equal(ordinary.status, 200);
assert.equal((await ordinary.json()).user.id, colleague.user.id);
console.log("PASS: admin alias and email share account/password/session; wrong password rejected, unknown alias rejected, colleague login preserved. No roles granted or live database accessed.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
