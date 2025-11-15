/**
 * Tenant Context Utilities
 * 
 * Functions for resolving and managing tenant context
 * Used by middleware and API routes
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations
);

export interface Tenant {
  id: string;
  subdomain: string;
  custom_domain?: string | null;
  name: string;
  status: string;
  plan_id?: string | null;
  expire_date?: Date | null;
  settings?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Resolve tenant from hostname (subdomain or custom domain)
 * 
 * @param hostname - The hostname from the request (e.g., "tenant1.dukanest.com" or "custom.com")
 * @returns Tenant object or null if not found
 */
export async function getTenantFromRequest(hostname: string): Promise<Tenant | null> {
  try {
    // Extract subdomain (first part before first dot)
    const subdomain = hostname.split('.')[0];
    
    // Query tenant by subdomain or custom domain
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('*')
      .or(`subdomain.eq.${subdomain},custom_domain.eq.${hostname}`)
      .eq('status', 'active')
      .single();

    if (error || !tenant) {
      console.error('Tenant not found:', hostname, error);
      return null;
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

