/**
 * Server-Side Authentication Utilities
 * 
 * Functions for handling authentication in Server Components and API Routes
 */

import { createClient } from '@/lib/supabase/server';
import type { UserRole, AuthUser } from './types';

/**
 * Get current authenticated user from session
 * 
 * @returns User object or null if not authenticated
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    console.log('[Auth Server] ========================================');
    console.log('[Auth Server] Getting user from session...');
    
    // Check what cookies are available
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(c => 
      c.name.includes('supabase') || 
      c.name.includes('auth') ||
      c.name.includes('sb-')
    );
    console.log('[Auth Server] Available Supabase cookies:', {
      count: supabaseCookies.length,
      cookieNames: supabaseCookies.map(c => c.name),
      cookieValues: supabaseCookies.map(c => `${c.name}=${c.value.substring(0, 20)}...`),
    });
    
    const supabase = await createClient();
    
    // Use getUser() directly (recommended by Supabase - verifies with server)
    // Don't use getSession() as it's insecure - comes from storage and may not be authentic
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('[Auth Server] User check (getUser):', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      role: user?.user_metadata?.role,
      tenantId: user?.user_metadata?.tenant_id,
      error: error?.message,
    });

    if (error || !user) {
      console.log('[Auth Server] ❌ No user found or error:', error?.message || 'No user');
      if (error) {
        console.log('[Auth Server] Error details:', {
          name: error.name,
          message: error.message,
          status: error.status,
        });
      }
      return null;
    }

    const authUser = {
      id: user.id,
      email: user.email!,
      role: (user.user_metadata?.role as UserRole) || 'customer',
      tenant_id: user.user_metadata?.tenant_id,
      metadata: user.user_metadata as any,
    };
    
    console.log('[Auth Server] Returning auth user:', {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      tenantId: authUser.tenant_id,
    });
    
    return authUser;
  } catch (error) {
    console.error('[Auth Server] Error getting user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if not authenticated
 * 
 * ⚠️ Use this in API routes only. For Server Components, use `requireAuthOrRedirect()` instead.
 * 
 * @returns User object (never null)
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Require authentication or redirect to login (for Server Components)
 * 
 * Use this in Server Components instead of `requireAuth()`.
 * It will redirect to login page if user is not authenticated.
 * 
 * @param redirectTo - Optional redirect path (default: '/admin/login' for admin routes, '/dashboard/login' for tenant routes)
 * @returns User object (never null, redirects if not authenticated)
 */
export async function requireAuthOrRedirect(redirectTo?: string): Promise<AuthUser> {
  const { redirect } = await import('next/navigation');
  const user = await getUser();
  
  if (!user) {
    redirect(redirectTo || '/admin/login');
  }
  
  return user as AuthUser;
}

/**
 * Check if user has specific role
 * 
 * @param user - User object
 * @param role - Role to check
 * @returns True if user has the role
 */
export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.role === role;
}

/**
 * Check if user has any of the specified roles
 * 
 * @param user - User object
 * @param roles - Array of roles to check
 * @returns True if user has any of the roles
 */
export function hasAnyRole(user: AuthUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Require specific role - throws error if user doesn't have role
 * 
 * ⚠️ Use this in API routes only. For Server Components, use `requireRoleOrRedirect()` instead.
 * 
 * @param user - User object
 * @param role - Required role
 * @throws Error if user doesn't have the role
 */
export function requireRole(user: AuthUser, role: UserRole): void {
  if (!hasRole(user, role)) {
    throw new Error(`Access denied. Required role: ${role}`);
  }
}

/**
 * Require specific role or redirect (for Server Components)
 * 
 * Use this in Server Components instead of `requireRole()`.
 * It will redirect to login page if user doesn't have the required role.
 * 
 * @param user - User object
 * @param role - Required role
 * @param redirectTo - Optional redirect path (default: '/admin/login')
 */
export async function requireRoleOrRedirect(
  user: AuthUser,
  role: UserRole,
  redirectTo?: string
): Promise<void> {
  const { redirect } = await import('next/navigation');
  
  if (!hasRole(user, role)) {
    redirect(redirectTo || '/admin/login');
  }
}

/**
 * Require any of the specified roles
 * 
 * ⚠️ Use this in API routes only. For Server Components, use `requireAnyRoleOrRedirect()` instead.
 * 
 * @param user - User object
 * @param roles - Array of required roles
 * @throws Error if user doesn't have any of the roles
 */
export function requireAnyRole(user: AuthUser, roles: UserRole[]): void {
  if (!hasAnyRole(user, roles)) {
    throw new Error(`Access denied. Required one of: ${roles.join(', ')}`);
  }
}

/**
 * Require any of the specified roles or redirect (for Server Components)
 * 
 * Use this in Server Components instead of `requireAnyRole()`.
 * It will redirect to login page if user doesn't have any of the required roles.
 * 
 * @param user - User object
 * @param roles - Array of required roles
 * @param redirectTo - Optional redirect path (default: '/dashboard/login' for tenant routes, '/admin/login' for admin routes)
 */
export async function requireAnyRoleOrRedirect(
  user: AuthUser,
  roles: UserRole[],
  redirectTo?: string
): Promise<void> {
  const { redirect } = await import('next/navigation');
  
  if (!hasAnyRole(user, roles)) {
    redirect(redirectTo || '/dashboard/login');
  }
}

/**
 * Check if user belongs to tenant
 * 
 * @param user - User object
 * @param tenantId - Tenant ID to check
 * @returns True if user belongs to tenant
 */
export function belongsToTenant(user: AuthUser, tenantId: string): boolean {
  // Landlords can access all tenants
  if (user.role === 'landlord') {
    return true;
  }
  
  return user.tenant_id === tenantId;
}

/**
 * Require user to belong to tenant
 * 
 * @param user - User object
 * @param tenantId - Required tenant ID
 * @throws Error if user doesn't belong to tenant
 */
export function requireTenantAccess(user: AuthUser, tenantId: string): void {
  if (!belongsToTenant(user, tenantId)) {
    throw new Error('Access denied. User does not belong to this tenant.');
  }
}

