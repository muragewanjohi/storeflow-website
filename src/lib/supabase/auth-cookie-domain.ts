/**
 * Share Supabase session cookies across subdomains in production so auth
 * established on www/apex still works on tenant hosts (e.g. shop.dukanest.com).
 */
export function getSharedAuthCookieDomain(
  hostHeader: string | null | undefined,
): string | undefined {
  if (!hostHeader || process.env.NODE_ENV !== 'production') {
    return undefined;
  }
  const host = hostHeader.split(':')[0].toLowerCase();
  if (host === 'dukanest.com' || host.endsWith('.dukanest.com')) {
    return '.dukanest.com';
  }
  if (host === 'storeflow.com' || host.endsWith('.storeflow.com')) {
    return '.storeflow.com';
  }
  return undefined;
}
