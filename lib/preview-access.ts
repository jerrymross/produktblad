import { getVercelOidcToken } from '@vercel/functions/oidc';

// Server-only workload identity, restricted to configured platform origins.
export async function previewHeaders(url: string | URL): Promise<Record<string, string>> {
  if (process.env.VERCEL_ENV !== 'preview') return {};
  const target = new URL(url);
  const allowed = [process.env.APP_URL, process.env.PORTAL_ISSUER]
    .filter((value): value is string => Boolean(value)).map(value => new URL(value).origin);
  if (target.username || target.password || target.protocol !== 'https:' || !allowed.includes(target.origin)) return {};
  return { 'x-vercel-trusted-oidc-idp-token': await getVercelOidcToken() };
}
export const previewFetch: typeof fetch = async (input, options = {}) => {
  const url = input instanceof Request ? input.url : input;
  const headers = new Headers(options.headers ?? (input instanceof Request ? input.headers : undefined));
  for (const [key, value] of Object.entries(await previewHeaders(url))) headers.set(key, value);
  return fetch(input, { ...options, headers, redirect: 'error' });
};
