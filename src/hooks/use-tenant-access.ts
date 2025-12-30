/**
 * Hook for checking tenant access restrictions in client components
 * 
 * This hook provides access restriction information based on tenant status
 */

'use client';

import { useMemo } from 'react';
import type { Tenant } from '@/lib/tenant-context';
import { getTenantAccessRestriction, type TenantAccessRestriction } from '@/lib/tenant-context/access-control';

/**
 * Hook to get tenant access restrictions
 * 
 * @param tenant - Tenant object (should be passed from server component)
 * @returns Access restriction details or null if tenant is not available
 * 
 * @example
 * ```tsx
 * // In client component
 * export default function MyComponent({ tenant }: { tenant: Tenant }) {
 *   const access = useTenantAccess(tenant);
 *   if (!access?.canEditData) {
 *     return <div>Read-only mode</div>;
 *   }
 *   return <EditForm />;
 * }
 * ```
 */
export function useTenantAccess(tenant: Tenant | null): TenantAccessRestriction | null {
  return useMemo(() => {
    if (!tenant) return null;
    return getTenantAccessRestriction(tenant);
  }, [tenant]);
}

