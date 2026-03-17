/**
 * Storefront image fallback helpers.
 *
 * These keep product/category/sales visuals populated when AI or upload-based
 * image generation is partial.
 */

const PRODUCT_PLACEHOLDER = '/images/placeholders/product-placeholder.svg';
const CATEGORY_PLACEHOLDER = '/images/placeholders/category-placeholder.svg';
const SALE_PLACEHOLDER = '/images/placeholders/sale-placeholder.svg';

export function isRenderableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:')) return false;
  return true;
}

export function getProductImageOrFallback(_name: string, image?: string | null): string {
  return isRenderableImageUrl(image) ? image.trim() : PRODUCT_PLACEHOLDER;
}

export function getCategoryImageOrFallback(_name: string, image?: string | null): string {
  return isRenderableImageUrl(image) ? image.trim() : CATEGORY_PLACEHOLDER;
}

export function getSaleImageOrFallback(_name: string, image?: string | null): string {
  return isRenderableImageUrl(image) ? image.trim() : SALE_PLACEHOLDER;
}

export function shouldUseUnoptimizedImage(url: string | null | undefined): boolean {
  if (!isRenderableImageUrl(url)) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;

  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.pathname.includes('/storage/v1/object/public/')
    );
  } catch {
    return false;
  }
}

