/**
 * Tenant Access Control Utilities
 * 
 * Functions for checking tenant access levels and restrictions
 * based on subscription status and grace period
 */

import type { Tenant } from './index';

// Grace period in days (default: 2 days)
const GRACE_PERIOD_DAYS = parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS || '2');

/**
 * Access level for tenant based on status and expiry
 */
export type TenantAccessLevel = 'full' | 'read-only' | 'restricted' | 'blocked';

/**
 * Access restriction details
 */
export interface TenantAccessRestriction {
  level: TenantAccessLevel;
  reason: string;
  canRenew: boolean;
  canViewData: boolean;
  canEditData: boolean;
  canProcessOrders: boolean;
  daysRemaining?: number;
  gracePeriodEnd?: Date;
}

/**
 * Calculate days expired from expiry date
 */
function getDaysExpired(expireDate: Date | null, now: Date = new Date()): number {
  if (!expireDate) return 0;
  return Math.floor((now.getTime() - expireDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Get tenant access level and restrictions
 * 
 * @param tenant - Tenant object with status and expire_date
 * @returns Access restriction details
 */
export function getTenantAccessRestriction(tenant: Tenant): TenantAccessRestriction {
  const now = new Date();
  const expireDate = tenant.expire_date ? new Date(tenant.expire_date) : null;
  const daysExpired = expireDate ? getDaysExpired(expireDate, now) : 0;
  const gracePeriodEnd = expireDate 
    ? new Date(expireDate.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const daysRemaining = gracePeriodEnd 
    ? Math.max(0, Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : undefined;

  // Deleted tenants - completely blocked
  if (tenant.status === 'deleted') {
    return {
      level: 'blocked',
      reason: 'Account has been deleted',
      canRenew: false,
      canViewData: false,
      canEditData: false,
      canProcessOrders: false,
    };
  }

  // Suspended tenants - restricted access (login + payment only)
  if (tenant.status === 'suspended') {
    return {
      level: 'restricted',
      reason: 'Subscription has been suspended. Please renew to restore access.',
      canRenew: true,
      canViewData: false,
      canEditData: false,
      canProcessOrders: false,
    };
  }

  // Expired tenants - check grace period
  if (tenant.status === 'expired' || (expireDate && daysExpired >= 0)) {
    if (daysExpired <= GRACE_PERIOD_DAYS) {
      // Still in grace period - read-only access
      return {
        level: 'read-only',
        reason: `Subscription expired. Grace period ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Please renew to continue full access.`,
        canRenew: true,
        canViewData: true,
        canEditData: false,
        canProcessOrders: false,
        daysRemaining,
        gracePeriodEnd: gracePeriodEnd || undefined,
      };
    } else {
      // Past grace period - should be suspended (fallback)
      return {
        level: 'restricted',
        reason: 'Grace period has ended. Please renew to restore access.',
        canRenew: true,
        canViewData: false,
        canEditData: false,
        canProcessOrders: false,
      };
    }
  }

  // Active tenants - full access
  if (tenant.status === 'active' && (!expireDate || daysExpired < 0)) {
    return {
      level: 'full',
      reason: '',
      canRenew: true,
      canViewData: true,
      canEditData: true,
      canProcessOrders: true,
    };
  }

  // Default: restricted access
  return {
    level: 'restricted',
    reason: 'Account status is unclear. Please contact support.',
    canRenew: true,
    canViewData: false,
    canEditData: false,
    canProcessOrders: false,
  };
}

/**
 * Check if tenant has full access
 */
export function hasFullAccess(tenant: Tenant): boolean {
  return getTenantAccessRestriction(tenant).level === 'full';
}

/**
 * Check if tenant has read-only access (grace period)
 */
export function hasReadOnlyAccess(tenant: Tenant): boolean {
  return getTenantAccessRestriction(tenant).level === 'read-only';
}

/**
 * Check if tenant access is restricted or blocked
 */
export function isAccessRestricted(tenant: Tenant): boolean {
  const restriction = getTenantAccessRestriction(tenant);
  return restriction.level === 'restricted' || restriction.level === 'blocked';
}

/**
 * Check if tenant can edit data
 */
export function canEditData(tenant: Tenant): boolean {
  return getTenantAccessRestriction(tenant).canEditData;
}

/**
 * Check if tenant can process orders
 */
export function canProcessOrders(tenant: Tenant): boolean {
  return getTenantAccessRestriction(tenant).canProcessOrders;
}

