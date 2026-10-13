// Public, build-time routing configuration. Never put credentials here.
export const appBasePath = process.env.NEXT_PUBLIC_APP_BASE_PATH || "";
if (appBasePath && appBasePath !== "/produktblad") throw new Error("Invalid app base path");
export const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "https://astar-studio-portal.vercel.app";
export function appPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || !appBasePath) return value;
  if (value === appBasePath || value.startsWith(appBasePath + "/") || value.startsWith(appBasePath + "?")) return value;
  return appBasePath + value;
}
