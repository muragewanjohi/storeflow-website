/**
 * Supabase Server Client with Automatic Tenant Context
 * 
 * This client automatically sets tenant context for RLS policies
 * Use this in API routes and server components after resolving tenant
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { setTenantContext } from '@/lib/tenant-context';

/**
 * Create a Supabase server client with tenant context
 * 
 * This client automatically sets the tenant context for RLS policies
 * before executing queries, ensuring automatic tenant data isolation
 * 
 * @param tenantId - The tenant UUID (required for RLS)
 * @returns Supabase client with tenant context set
 * 
 * @example
 * ```typescript
 * const tenant = await getTenantFromRequest(hostname);
 * const supabase = await createTenantServerClient(tenant.id);
 * 
 * // RLS automatically filters by tenant_id
 * const { data: products } = await supabase
 *   .from('products')
 *   .select('*');
 * ```
 */
export async function createTenantServerClient(tenantId: string) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );

  // Set tenant context for RLS policies
  // This ensures all subsequent queries are filtered by tenant_id
  await setTenantContext(tenantId);

  return supabase;
}

/**
 * Create a Supabase server client without tenant context
 * 
 * Use this for:
 * - Querying central tables (tenants, price_plans, etc.)
 * - Admin operations that need to access all tenants
 * 
 * @returns Supabase client without tenant context
 */
export async function createServerClientWithoutTenant() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );
}

