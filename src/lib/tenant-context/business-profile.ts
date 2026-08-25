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
  const niche = typeof tenant.data?.niche === 'string' ? tenant.data.niche : null;
  return { businessType, niche };
}
