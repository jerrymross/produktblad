import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

// The portal supplies this server-only key. Cookies and app permissions are still
// verified by the application's existing authorization on every protected request.
export function proxy(request: NextRequest) {
  if (process.env.WORKSPACE_PROXY_REQUIRED !== "1") return NextResponse.next();
  const expected = process.env.WORKSPACE_PROXY_SECRET || "";
  const supplied = request.headers.get("x-astar-workspace-key") || "";
  if (expected.length >= 32 && Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
      timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return NextResponse.next();
  const headers = { "Cache-Control": "private, no-store" };
  if (["GET", "HEAD"].includes(request.method) && request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL(process.env.APP_URL || "https://astar-studio-portal.vercel.app"), { status: 307, headers });
  }
  return NextResponse.json({ error: "Öppna appen genom Astar Studio." }, { status: 403, headers });
}
