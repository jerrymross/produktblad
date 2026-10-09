import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { transaction } from "@/lib/db";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function identity(request?: Request) {
  const session = await getAuth().api.getSession({ headers: request?.headers ?? await headers() });
  if (!session) throw new HttpError(401, "Logga in för att fortsätta.");
  return session.user;
}
export async function pageIdentity() {
  try { return await identity(); } catch (error) { if (error instanceof HttpError && error.status === 401) redirect("/login"); throw error; }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, "Förfrågan måste komma från appen.");
}
export async function accessProfile(userId: string) {
  return transaction(userId, async client => {
    const admin = (await client.query("SELECT 1 FROM central_roles WHERE user_id=$1", [userId])).rowCount !== 0;
    const rows = await client.query("SELECT school_id FROM school_memberships WHERE user_id=$1", [userId]);
    return { admin, schools: rows.rows.map(row => row.school_id as string) };
  });
}
export async function requireAdmin(userId: string) {
  if (!(await accessProfile(userId)).admin) throw new HttpError(403, "Endast central administration kan göra detta.");
}
export async function api(operation: () => Promise<Response>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    if(error instanceof SyntaxError)return Response.json({error:"Ogiltigt innehåll."},{status:400});
    console.error("Server operation failed", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Åtgärden misslyckades. Försök igen; osparade ändringar finns kvar." }, { status: 500 });
  }
}
