import type { NextConfig } from "next";

const nextConfig: NextConfig = {serverExternalPackages:["@sparticuz/chromium"],outputFileTracingIncludes:{"/api/pdf":["./node_modules/@sparticuz/chromium/bin/**"],"/api/sheets/*":["./public/education-heroes/*.jpg"]}};

export default nextConfig;
