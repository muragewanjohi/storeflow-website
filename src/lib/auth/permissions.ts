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
  | 'dashboard.read'
  | 'themes.read'
  | 'themes.update'
  | 'sales.read'
  | 'sales.create'
  | 'sales.update'
  | 'sales.delete'
  | 'subscription.read'
  | 'pages.read'
  | 'pages.create'
  | 'pages.update'
  | 'pages.delete'
  | 'blogs.read'
  | 'blogs.create'
  | 'blogs.update'
  | 'blogs.delete'
  | 'forms.read'
  | 'forms.create'
  | 'forms.update'
  | 'forms.delete'
  | 'media.read'
  | 'media.create'
  | 'media.update'
  | 'media.delete'
  | 'support.read'
  | 'support.create'
  | 'support.update'
  | 'support.platform.read'
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
    'dashboard.read',
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
    'themes.read',
    'themes.update',
    'sales.read',
    'sales.create',
    'sales.update',
    'sales.delete',
    'subscription.read',
    'pages.read',
    'pages.create',
    'pages.update',
    'pages.delete',
    'blogs.read',
    'blogs.create',
    'blogs.update',
    'blogs.delete',
    'forms.read',
    'forms.create',
    'forms.update',
    'forms.delete',
    'media.read',
    'media.create',
    'media.update',
    'media.delete',
    'support.read',
    'support.create',
    'support.update',
    'support.platform.read',
  ],
  tenant_staff: [
    // Limited access - read and update only
    'dashboard.read',
    'products.read',
    'products.update',
    'orders.read',
    'orders.update',
    'customers.read',
    'customers.update',
    'settings.read',
    'pages.read',
    'pages.update',
    'blogs.read',
    'blogs.update',
    'forms.read',
    'forms.update',
    'media.read',
    'media.update',
    'support.read',
    'support.create',
    'support.update',
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
 * @param customPermissions - Optional array of custom permissions that override/extend role permissions
 * @returns True if user has permission
 */
export function hasPermission(
  role: UserRole, 
  permission: Permission,
  customPermissions?: Permission[]
): boolean {
  // If custom permissions are provided, check them first
  if (customPermissions && customPermissions.length > 0) {
    return customPermissions.includes(permission);
  }
  
  // Otherwise, check role-based permissions
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @param customPermissions - Optional array of custom permissions that override/extend role permissions
 * @returns True if user has any of the permissions
 */
export function hasAnyPermission(
  role: UserRole, 
  permissions: Permission[],
  customPermissions?: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission, customPermissions));
}

/**
 * Check if user has all of the specified permissions
 * 
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @param customPermissions - Optional array of custom permissions that override/extend role permissions
 * @returns True if user has all permissions
 */
export function hasAllPermissions(
  role: UserRole, 
  permissions: Permission[],
  customPermissions?: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(role, permission, customPermissions));
}

/**
 * Get all permissions for a role
 * 
 * @param role - User role
 * @param customPermissions - Optional array of custom permissions that override/extend role permissions
 * @returns Array of permissions (custom permissions if provided, otherwise role permissions)
 */
export function getRolePermissions(role: UserRole, customPermissions?: Permission[]): Permission[] {
  // If custom permissions are provided, return them (they override role permissions)
  if (customPermissions && customPermissions.length > 0) {
    return customPermissions;
  }
  
  // Otherwise, return role-based permissions
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get all available permissions
 * 
 * @returns Array of all available permissions
 */
export function getAllPermissions(): Permission[] {
  return [
    'dashboard.read',
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
    'themes.read',
    'themes.update',
    'sales.read',
    'sales.create',
    'sales.update',
    'sales.delete',
    'subscription.read',
    'pages.read',
    'pages.create',
    'pages.update',
    'pages.delete',
    'blogs.read',
    'blogs.create',
    'blogs.update',
    'blogs.delete',
    'forms.read',
    'forms.create',
    'forms.update',
    'forms.delete',
    'media.read',
    'media.create',
    'media.update',
    'media.delete',
    'support.read',
    'support.create',
    'support.update',
    'support.platform.read',
  ];
}
