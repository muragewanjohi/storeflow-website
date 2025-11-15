import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a browser Supabase client
 * Use this in client components
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Create a tenant-aware Supabase client
 * 
 * This client automatically sets tenant context for RLS policies
 * Use this in API routes after resolving tenant
 * 
 * @param tenantId - The tenant UUID
 * @returns Supabase client with tenant context
 */
export function createTenantSupabaseClient(tenantId: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          'x-tenant-id': tenantId,
        },
      },
    }
  );

  // Set tenant context for RLS (if function exists)
  // Note: This is optional - RLS can also use explicit tenant_id in queries
  supabase.rpc('set_tenant_context', { tenant_id: tenantId }).catch(() => {
    // Silently fail if function doesn't exist yet
  });

  return supabase;
}
