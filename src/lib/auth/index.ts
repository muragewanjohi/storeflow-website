/**
 * Authentication - Main Export File
 * 
 * Exports all authentication utilities, hooks, and types
 */

// Types
export type { UserRole, UserMetadata, AuthUser, AuthSession } from './types';

// Server-side utilities
export {
  getUser,
  requireAuth,
  requireAuthOrRedirect,
  hasRole,
  hasAnyRole,
  requireRole,
  requireRoleOrRedirect,
  requireAnyRole,
  requireAnyRoleOrRedirect,
  belongsToTenant,
  requireTenantAccess,
} from './server';

// Client-side utilities
export { getCurrentUser, useAuth, signOut } from './client';

// Middleware utilities
export { protectRoute, protectLandlord, protectTenantAdmin, protectTenantStaff } from './middleware';

