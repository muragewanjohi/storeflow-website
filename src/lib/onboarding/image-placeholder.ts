/**
 * Single global placeholder for onboarding / starter-pack rows that do not yet have a real image URL.
 * Real images are applied later via `applyStarterPackImagesToTenant` (e.g. Nano Banana) or merchant upload.
 *
 * Override with `NEXT_PUBLIC_ONBOARDING_PLACEHOLDER_IMAGE_URL` (absolute URL recommended for emails / external consumers).
 */
const DEFAULT_PLACEHOLDER_PATH = '/images/onboarding-product-placeholder.svg';

export function getOnboardingImagePlaceholderUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_ONBOARDING_PLACEHOLDER_IMAGE_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.VERCEL_URL?.replace(/^(?!https?:\/\/)/, 'https://').replace(/\/$/, '') ||
    '';

  if (base) {
    return `${base}${DEFAULT_PLACEHOLDER_PATH.startsWith('/') ? '' : '/'}${DEFAULT_PLACEHOLDER_PATH}`;
  }

  return DEFAULT_PLACEHOLDER_PATH;
}

/** True if URL is the global onboarding placeholder (so we can overwrite with real assets). */
export function isOnboardingPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  if (u.length === 0) return false;
  if (u.includes('onboarding-product-placeholder')) return true;
  const envUrl = process.env.NEXT_PUBLIC_ONBOARDING_PLACEHOLDER_IMAGE_URL?.trim().toLowerCase();
  if (envUrl && u === envUrl) return true;
  return false;
}
