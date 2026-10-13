import { appBasePath } from "./app-path";
export const publicAppUrl = process.env.APP_URL || "https://produktblad.vercel.app";
const configured = new URL(publicAppUrl);
if (configured.username || configured.password || configured.search || configured.hash ||
  configured.pathname.replace(/\/$/, "") !== appBasePath ||
  (configured.protocol !== "https:" && !(configured.protocol === "http:" && ["localhost", "127.0.0.1"].includes(configured.hostname)))) throw new Error("Invalid APP_URL/base path");
export const appOrigin = configured.origin;
// Explicit origin only: never derive auth or PDF URLs from forwarded Host headers.
