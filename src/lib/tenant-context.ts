/**
 * Tenant Context Utilities
 * 
 * Functions for resolving and managing tenant context
 * Used by middleware and API routes
 */

import { createClient } from '@supabase/supabase-js';
import { getCachedTenant, setCachedTenant } from './tenant-context/cache';

/**
 * Create Supabase client with service role key
 * Handles missing environment variables gracefully
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file.'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Create client lazily to avoid errors during module initialization
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createSupabaseClient();
  }
  return supabaseClient;
}

export interface Tenant {
  id: string;
  subdomain: string;
  custom_domain?: string | null;
  name: string;
  contact_email?: string | null;
  status: string;
  plan_id?: string | null;
  expire_date?: Date | null;
  user_id?: string | null;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Resolve tenant from hostname (subdomain or custom domain)
 * 
 * Uses caching to improve performance. Checks cache first, then database.
 * 
 * @param hostname - The hostname from the request (e.g., "tenant1.dukanest.com" or "custom.com")
 * @param useCache - Whether to use cache (default: true)
 * @returns Tenant object or null if not found
 */
export async function getTenantFromRequest(
  hostname: string,
  useCache: boolean = true
): Promise<Tenant | null> {
  try {
    // Check cache first
    if (useCache) {
      const cached = await getCachedTenant(hostname);
      if (cached) {
        return cached as Tenant;
      }
    }

    // Extract subdomain (first part before first dot)
    // Handle localhost:3000 case for local development
    const hostnameWithoutPort = hostname.split(':')[0];
    const parts = hostnameWithoutPort.split('.');
    
    // For localhost, check for default tenant or use subdomain from env
    let subdomain: string;
    if (hostnameWithoutPort === 'localhost' || hostnameWithoutPort === '127.0.0.1') {
      // Use default tenant subdomain from env, or try 'www' as fallback
      subdomain = process.env.DEFAULT_TENANT_SUBDOMAIN || 'www';
    } else {
      // Extract subdomain from hostname (e.g., "teststore.dukanest.com" -> "teststore")
      // Ensure lowercase for consistency (subdomains are stored in lowercase)
      subdomain = parts.length > 1 ? parts[0].toLowerCase() : 'www';
    }

    // Query tenant by subdomain or custom domain
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError.message);
      // In development, provide helpful error message
      if (process.env.NODE_ENV === 'development') {
        console.error(
          'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
        );
      }
      return null;
    }

    // Try to find tenant by subdomain first
    let { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .maybeSingle();

    // If not found by subdomain, try custom domain
    if (!tenant && !error) {
      const { data: customDomainTenant, error: customError } = await supabase
        .from('tenants')
        .select('*')
        .eq('custom_domain', hostnameWithoutPort)
        .eq('status', 'active')
        .maybeSingle();
      
      if (customDomainTenant) {
        tenant = customDomainTenant;
      } else if (customError) {
        error = customError;
      }
    }

    if (error || !tenant) {
      console.error('Tenant not found:', {
        hostname,
        hostnameWithoutPort,
        subdomain,
        error: error?.message || 'No tenant found',
        errorCode: error?.code,
        errorDetails: error,
      });
      return null;
    }

    // Cache the result
    if (useCache) {
      await setCachedTenant(hostname, tenant);
    }

    return tenant as Tenant;
  } catch (error) {
    console.error('Error resolving tenant:', error);
    return null;
  }
}

/**
 * Set tenant context for RLS policies
 * 
 * This function sets the tenant context in the database session
 * so that RLS policies can filter data automatically
 * 
 * IMPORTANT: This must be called before any database queries
 * 
 * @param tenantId - The tenant UUID
 * @returns Promise that resolves when context is set
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  try {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(
          'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
        );
      }
      throw clientError;
    }

    const { error } = await supabase.rpc('set_tenant_context', { 
      tenant_id: tenantId 
    });
    
    if (error) {
      console.error('Error setting tenant context:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    // If the function doesn't exist yet, that's okay - RLS will use explicit tenant_id
    // But we should still throw in production
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

/**
 * Get tenant context from current database session
 * 
 * @returns The current tenant_id from session, or null if not set
 */
export async function getTenantContext(): Promise<string | null> {
  try {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError.message);
      if (process.env.NODE_ENV === 'development') {
        console.error(
          'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
        );
      }
      return null;
    }

    const { data, error } = await supabase.rpc('get_tenant_context');
    
    if (error) {
      console.error('Error getting tenant context:', error);
      return null;
    }
    
    return data as string | null;
  } catch (error) {
    console.error('Failed to get tenant context:', error);
    return null;
  }
}

/**
 * Get tenant ID from request headers
 * 
 * Middleware sets x-tenant-id header
 */
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-id');
}

// Re-export client-side hooks for convenience
export { useTenant, TenantProvider } from './tenant-context/provider';

