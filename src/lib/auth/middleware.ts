/**
 * Authentication Middleware Utilities
 * 
 * Functions for protecting routes and checking authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser, requireAuth, requireRole, requireAnyRole } from './server';
import type { UserRole } from './types';

/**
 * Create middleware function to protect routes
 * 
 * @param roles - Required roles (empty array = any authenticated user)
 * @returns Middleware function
 */
export function protectRoute(roles: UserRole[] = []) {
  return async (request: NextRequest) => {
    try {
      const user = await requireAuth();

      // If roles specified, check user has required role
      if (roles.length > 0) {
        requireAnyRole(user, roles);
      }

      return null; // Allow request to proceed
    } catch (error: any) {
      // Redirect to login or return 401
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: error.message || 'Unauthorized' },
          { status: 401 }
        );
      }

      // Redirect to login page
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  };
}

/**
 * Protect landlord (admin) routes
 */
export const protectLandlord = protectRoute(['landlord']);

/**
 * Protect tenant admin routes
 */
export const protectTenantAdmin = protectRoute(['tenant_admin']);

/**
 * Protect tenant admin or staff routes
 */
export const protectTenantStaff = protectRoute(['tenant_admin', 'tenant_staff']);

