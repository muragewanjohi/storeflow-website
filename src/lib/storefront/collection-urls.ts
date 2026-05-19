/**
 * Storefront collection URL helpers (Shopify-style /collections/:slug routes).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StorefrontCollectionRef {
  id: string;
  name: string;
  slug: string;
}

export function isCategoryUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function getCollectionPath(slug: string): string {
  return `/collections/${encodeURIComponent(slug)}`;
}

/**
 * Link target for a category tile or nav item.
 */
export function getCategoryCollectionHref(category: {
  id: string;
  slug: string | null;
}): string {
  if (category.slug) {
    return getCollectionPath(category.slug);
  }
  return `/products?category=${encodeURIComponent(category.id)}`;
}

/**
 * When ?category= is a single slug (not UUID, not comma-separated), redirect to /collections/:slug.
 */
export function parseSingleCategorySlugFromProductsQuery(
  categoryParam: string | undefined,
): string | null {
  if (!categoryParam?.trim()) {
    return null;
  }
  const trimmed = categoryParam.trim();
  if (trimmed.includes(',')) {
    return null;
  }
  if (isCategoryUuid(trimmed)) {
    return null;
  }
  return trimmed;
}

export function appendQueryString(path: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  return qs ? `${path}?${qs}` : path;
}
