/**
 * Marketing Blog Constants
 * 
 * Special identifier for marketing blogs that appear on the main marketing website
 */

/**
 * Special tenant_id value for marketing blogs
 * Marketing blogs are created by landlords and appear on the main marketing website
 */
export const MARKETING_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Check if a tenant_id is a marketing blog
 */
export function isMarketingBlog(tenantId: string | null | undefined): boolean {
  return tenantId === MARKETING_TENANT_ID;
}

/**
 * Get tenant_id for marketing blogs
 */
export function getMarketingTenantId(): string {
  return MARKETING_TENANT_ID;
}

