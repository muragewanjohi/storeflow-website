/**
 * Sale slugs in URLs must be encoded: raw `%`, `:`, `!`, etc. break fetch(), links, and Next route params.
 */
export function storefrontSalePath(slug: string): string {
  return `/sales/${encodeURIComponent(slug)}`;
}

export function publicSaleApiPath(slug: string): string {
  return `/api/sales/${encodeURIComponent(slug)}`;
}
