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
