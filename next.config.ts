import type { NextConfig } from "next";

const nextConfig: NextConfig = {basePath:process.env.NEXT_PUBLIC_APP_BASE_PATH || "",serverExternalPackages:["@sparticuz/chromium"],outputFileTracingIncludes:{"/api/pdf":["./node_modules/@sparticuz/chromium/bin/**"],"/api/sheets/*":["./public/education-heroes/*.jpg"]}};

nextConfig.headers=async()=>[{source:"/:path*",headers:[{key:"Content-Security-Policy",value:"frame-ancestors 'self' https://astar-studio-portal.vercel.app"},{key:"Referrer-Policy",value:"no-referrer"}]}];
export default nextConfig;
