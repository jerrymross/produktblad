import { NextResponse } from "next/server";
import { api, sameOrigin } from "@/lib/access";
import { getPool } from "@/lib/db";
import { hash } from "@/lib/portal-protocol";
import { cookieOptions, cookieValue, sessionCookie, transactionCookie } from "@/lib/portal-session";

export async function POST(request: Request) { return api(async () => {
  sameOrigin(request);
  const cookie = cookieValue(request.headers, sessionCookie);
  if (cookie) await getPool().query("DELETE FROM portal_sessions WHERE cookie_hash=$1", [hash(cookie)]);
  const tx = cookieValue(request.headers, transactionCookie);
  if (tx) await getPool().query("DELETE FROM portal_transactions WHERE cookie_hash=$1", [hash(tx)]);
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  for (const name of [sessionCookie, transactionCookie]) response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  return response;
}); }
