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
  theme_slug?: string | null;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  country?: string | null;
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

    // Try to find tenant by subdomain
    // Include both 'active' and 'expired' status (expired tenants are accessible during grace period)
    // Exclude 'deleted' and 'suspended' (these are handled separately)
    let { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', subdomain)
      .in('status', ['active', 'expired'])
      .maybeSingle();

    // If not found, check if tenant exists with different status for diagnostics
    if (!tenant && !error) {
      const { data: tenantAnyStatus, error: statusError } = await supabase
        .from('tenants')
        .select('*')
        .eq('subdomain', subdomain)
        .maybeSingle();
      
      if (tenantAnyStatus && !statusError) {
        // Tenant exists but status is 'suspended' or 'deleted' - log for debugging
        if (tenantAnyStatus.status === 'suspended' || tenantAnyStatus.status === 'deleted') {
          console.warn('Tenant found but access is restricted:', {
            hostname,
            subdomain,
            tenantId: tenantAnyStatus.id,
            status: tenantAnyStatus.status,
            name: tenantAnyStatus.name,
            message: tenantAnyStatus.status === 'suspended' 
              ? 'Tenant is suspended (past grace period)'
              : 'Tenant is deleted',
          });
        }
        // Don't return suspended/deleted tenants - they're blocked
      }
    }

    // If not found by subdomain, try custom domain
    // Include both 'active' and 'expired' status (expired tenants are accessible during grace period)
    if (!tenant && !error) {
      const { data: customDomainTenant, error: customError } = await supabase
        .from('tenants')
        .select('*')
        .eq('custom_domain', hostnameWithoutPort)
        .in('status', ['active', 'expired'])
        .maybeSingle();
      
      if (customDomainTenant) {
        tenant = customDomainTenant;
      } else if (customError) {
        error = customError;
      }
    }

    if (error || !tenant) {
      // Enhanced error logging with diagnostic info
      const diagnosticInfo: any = {
        hostname,
        hostnameWithoutPort,
        subdomain,
        error: error?.message || 'No tenant found',
        errorCode: error?.code,
        errorDetails: error,
      };

      // Try to find tenant with any status for better diagnostics
      try {
        const { data: diagnosticTenant } = await supabase
          .from('tenants')
          .select('id, subdomain, status, name')
          .eq('subdomain', subdomain)
          .maybeSingle();
        
        if (diagnosticTenant) {
          diagnosticInfo.diagnostic = {
            tenantExists: true,
            tenantId: diagnosticTenant.id,
            tenantName: diagnosticTenant.name,
            currentStatus: diagnosticTenant.status,
            message: `Tenant exists but status is '${diagnosticTenant.status}' (expected 'active')`,
          };
        } else {
          // Check for similar subdomains (case variations)
          const { data: similarTenants } = await supabase
            .from('tenants')
            .select('id, subdomain, status, name')
            .ilike('subdomain', subdomain);
          
          if (similarTenants && similarTenants.length > 0) {
            diagnosticInfo.diagnostic = {
              tenantExists: false,
              similarSubdomains: similarTenants.map(t => ({
                subdomain: t.subdomain,
                status: t.status,
                name: t.name,
              })),
              message: 'No exact match found, but similar subdomains exist',
            };
          }
        }
      } catch (diagError) {
        // Non-critical - just log the original error
      }

      console.error('Tenant not found:', diagnosticInfo);
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

