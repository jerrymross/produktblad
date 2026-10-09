import { betterAuth } from "better-auth";
import { getPool } from "@/lib/db";

function createAuth() {
  return betterAuth({
    database: getPool(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    trustedOrigins: ["https://produktblad.vercel.app", "http://localhost:3000", ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : [])],
    emailAndPassword: { enabled: true, minPasswordLength: 12, autoSignIn: false },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
