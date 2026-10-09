import { getAuth } from "@/lib/auth";

const allowed = new Set(["sign-in/email", "sign-out", "get-session", "change-password"]);
async function handler(request: Request) {
  const path = new URL(request.url).pathname.replace("/api/auth/", "");
  // Accounts are created only through server-validated invitations.
  if (!allowed.has(path)) return Response.json({ error: "Använd en inbjudan för att skapa konto." }, { status: 403 });
  return getAuth().handler(request);
}
export const GET = handler;
export const POST = handler;
