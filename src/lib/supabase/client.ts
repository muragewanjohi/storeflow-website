import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a browser Supabase client
 * Use this in client components
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. ' +
      'Check your Vercel project settings: https://vercel.com/docs/concepts/projects/environment-variables'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set. ' +
      'Check your Vercel project settings: https://vercel.com/docs/concepts/projects/environment-variables'
    );
  }

  const supabase = createSupabaseClient(
    supabaseUrl,
    supabaseAnonKey,
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
