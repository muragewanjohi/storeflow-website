/**
 * Permissions System
 * 
 * Defines and checks user permissions based on roles
 */

import type { UserRole } from './types';

export type Permission =
  | 'products.create'
  | 'products.read'
  | 'products.update'
  | 'products.delete'
  | 'orders.create'
  | 'orders.read'
  | 'orders.update'
  | 'orders.delete'
  | 'customers.create'
  | 'customers.read'
  | 'customers.update'
  | 'customers.delete'
  | 'users.create'
  | 'users.read'
  | 'users.update'
  | 'users.delete'
  | 'settings.read'
  | 'settings.update'
  | 'analytics.read'
  | 'tenants.create'
  | 'tenants.read'
  | 'tenants.update'
  | 'tenants.delete';

/**
 * Role-based permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  landlord: [
    // Full access to everything
    'products.create',
    'products.read',
    'products.update',
    'products.delete',
    'orders.create',
    'orders.read',
    'orders.update',
    'orders.delete',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.delete',
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'settings.read',
    'settings.update',
    'analytics.read',
    'tenants.create',
    'tenants.read',
    'tenants.update',
    'tenants.delete',
  ],
  tenant_admin: [
    // Full access to tenant resources
    'products.create',
    'products.read',
    'products.update',
    'products.delete',
    'orders.create',
    'orders.read',
    'orders.update',
    'orders.delete',
    'customers.create',
    'customers.read',
    'customers.update',
    'customers.delete',
    'users.create',
    'users.read',
    'users.update',
    'users.delete',
    'settings.read',
    'settings.update',
    'analytics.read',
  ],
  tenant_staff: [
    // Limited access - read and update only
    'products.read',
    'products.update',
    'orders.read',
    'orders.update',
    'customers.read',
    'customers.update',
    'settings.read',
  ],
  customer: [
    // Customer-facing permissions
    'products.read',
    'orders.create',
    'orders.read',
  ],
};

/**
 * Check if user has specific permission
 * 
 * @param role - User role
 * @param permission - Permission to check
 * @returns True if user has permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @returns True if user has any of the permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Check if user has all of the specified permissions
 * 
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 * 
 * @param role - User role
 * @returns Array of permissions
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

