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
 * Create a tenant-aware Supabase client (Browser/Client-side)
 * 
 * This client sets tenant context for RLS policies
 * Use this in client components after resolving tenant
 * 
 * IMPORTANT: For server-side, use createTenantServerClient from server-with-tenant.ts
 * 
 * @param tenantId - The tenant UUID
 * @returns Supabase client with tenant context
 */
export async function createTenantSupabaseClient(tenantId: string) {
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

  // Set tenant context for RLS policies
  // This ensures all subsequent queries are filtered by tenant_id
  try {
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    // In production, you might want to throw here
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }

  return supabase;
}
