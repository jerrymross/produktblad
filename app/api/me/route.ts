import { identity, accessProfile, api } from "@/lib/access";
export async function GET(request: Request) { return api(async () => { const user = await identity(request); return Response.json({ user: { name: user.name, email: user.email }, ...await accessProfile(user.id) }, { headers: { "Cache-Control": "no-store" } }); }); }
