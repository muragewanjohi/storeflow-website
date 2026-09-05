import type { Tenant } from '@/lib/tenant-context';

/**
 * Real recorded business_type/niche (tenants.data, written at registration
 * and optionally enriched via the onboarding chat). Extracted to this
 * neutral module (originally lived in @/lib/assistant/shared) so both
 * @/lib/assistant/shared (business_advice, category/homepage_image
 * configuration_guidance targets) and @/lib/homepage-images/regenerate-shared
 * (DA.25) can import it without either depending on the other — a
 * regenerate-shared -> assistant/shared import would be circular, since
 * assistant/shared itself needs to call regenerateHomepageImage() for the
 * homepage_image chat target.
 */
export function getBusinessProfile(tenant: Tenant): { businessType: string | null; niche: string | null } {
  const businessType = typeof tenant.data?.business_type === 'string' ? tenant.data.business_type : null;
  // `niche` is written by the separate onboarding-chat business-context PATCH
  // (OC.1/OC.2). Most tenants never go through that flow — registration
  // (POST /api/tenants/register) instead writes the merchant's free-text
  // "what are you selling" answer to `selling`. Fall back to it so the
  // assistant still knows the specific niche (e.g. "Video Games") instead of
  // only the coarse business_type bucket (e.g. "Electronics & Gadgets").
  const niche =
    (typeof tenant.data?.niche === 'string' ? tenant.data.niche : null) ||
    (typeof tenant.data?.selling === 'string' ? tenant.data.selling : null);
  return { businessType, niche };
}
