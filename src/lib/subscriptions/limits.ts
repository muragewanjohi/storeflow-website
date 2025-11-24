/**
 * Subscription Plan Limits Enforcement
 * 
 * Utilities for checking and enforcing plan limits (products, orders, storage, etc.)
 */

import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';

export interface PlanLimits {
  max_products?: number; // -1 means unlimited
  max_orders?: number;
  max_storage_mb?: number; // Storage in MB
  max_customers?: number;
  max_pages?: number;
  max_blogs?: number;
  max_staff_users?: number;
  [key: string]: number | undefined;
}

/**
 * Get plan limits from price plan features JSON
 */
export function getPlanLimits(planFeatures: any): PlanLimits {
  if (!planFeatures || typeof planFeatures !== 'object') {
    return {};
  }

  return {
    max_products: planFeatures.max_products ?? planFeatures.product_permission_feature ?? undefined,
    max_orders: planFeatures.max_orders ?? undefined,
    max_storage_mb: planFeatures.max_storage_mb ?? planFeatures.storage_permission_feature ?? undefined,
    max_customers: planFeatures.max_customers ?? undefined,
    max_pages: planFeatures.max_pages ?? planFeatures.page_permission_feature ?? undefined,
    max_blogs: planFeatures.max_blogs ?? planFeatures.blog_permission_feature ?? undefined,
    max_staff_users: planFeatures.max_staff_users ?? undefined,
  };
}

/**
 * Check if a limit is unlimited (-1 means unlimited)
 */
export function isUnlimited(limit: number | undefined): boolean {
  return limit === -1 || limit === undefined;
}

/**
 * Check if tenant can create more products
 */
export async function canCreateProduct(tenant: Tenant): Promise<{ allowed: boolean; reason?: string }> {
  if (!tenant.plan_id) {
    return { allowed: false, reason: 'No active subscription plan' };
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan) {
    return { allowed: false, reason: 'Subscription plan not found' };
  }

  const limits = getPlanLimits(plan.features);
  const maxProducts = limits.max_products;

  // Unlimited
  if (isUnlimited(maxProducts)) {
    return { allowed: true };
  }

  // Check current product count
  const productCount = await prisma.products.count({
    where: { tenant_id: tenant.id },
  });

  if (productCount >= maxProducts!) {
    return {
      allowed: false,
      reason: `Product limit reached (${productCount}/${maxProducts}). Please upgrade your plan to add more products.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if tenant can create more orders
 */
export async function canCreateOrder(tenant: Tenant): Promise<{ allowed: boolean; reason?: string }> {
  if (!tenant.plan_id) {
    return { allowed: false, reason: 'No active subscription plan' };
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan) {
    return { allowed: false, reason: 'Subscription plan not found' };
  }

  const limits = getPlanLimits(plan.features);
  const maxOrders = limits.max_orders;

  // Unlimited
  if (isUnlimited(maxOrders)) {
    return { allowed: true };
  }

  // Check current order count
  const orderCount = await prisma.orders.count({
    where: { tenant_id: tenant.id },
  });

  if (orderCount >= maxOrders!) {
    return {
      allowed: false,
      reason: `Order limit reached (${orderCount}/${maxOrders}). Please upgrade your plan to process more orders.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if tenant can use more storage
 */
export async function canUseStorage(
  tenant: Tenant,
  additionalBytes: number
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
  if (!tenant.plan_id) {
    return { allowed: false, reason: 'No active subscription plan' };
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan) {
    return { allowed: false, reason: 'Subscription plan not found' };
  }

  const limits = getPlanLimits(plan.features);
  const maxStorageMB = limits.max_storage_mb;

  // Unlimited
  if (isUnlimited(maxStorageMB)) {
    return { allowed: true };
  }

  // TODO: Calculate current storage usage from Supabase Storage
  // For now, we'll just check the limit
  const maxStorageBytes = maxStorageMB! * 1024 * 1024; // Convert MB to bytes
  const additionalMB = additionalBytes / (1024 * 1024);

  // For now, return allowed but with a note that storage tracking needs to be implemented
  // In production, you'd query Supabase Storage to get actual usage
  return {
    allowed: true, // TODO: Implement actual storage usage check
    currentUsage: 0, // TODO: Get from Supabase Storage
    limit: maxStorageMB,
  };
}

/**
 * Check if tenant can create more pages
 */
export async function canCreatePage(tenant: Tenant): Promise<{ allowed: boolean; reason?: string }> {
  if (!tenant.plan_id) {
    return { allowed: false, reason: 'No active subscription plan' };
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan) {
    return { allowed: false, reason: 'Subscription plan not found' };
  }

  const limits = getPlanLimits(plan.features);
  const maxPages = limits.max_pages;

  // Unlimited
  if (isUnlimited(maxPages)) {
    return { allowed: true };
  }

  // Check current page count
  const pageCount = await prisma.pages.count({
    where: { tenant_id: tenant.id },
  });

  if (pageCount >= maxPages!) {
    return {
      allowed: false,
      reason: `Page limit reached (${pageCount}/${maxPages}). Please upgrade your plan to add more pages.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if tenant can create more blogs
 */
export async function canCreateBlog(tenant: Tenant): Promise<{ allowed: boolean; reason?: string }> {
  if (!tenant.plan_id) {
    return { allowed: false, reason: 'No active subscription plan' };
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan) {
    return { allowed: false, reason: 'Subscription plan not found' };
  }

  const limits = getPlanLimits(plan.features);
  const maxBlogs = limits.max_blogs;

  // Unlimited
  if (isUnlimited(maxBlogs)) {
    return { allowed: true };
  }

  // Check current blog count
  const blogCount = await prisma.blogs.count({
    where: { tenant_id: tenant.id },
  });

  if (blogCount >= maxBlogs!) {
    return {
      allowed: false,
      reason: `Blog limit reached (${blogCount}/${maxBlogs}). Please upgrade your plan to add more blogs.`,
    };
  }

  return { allowed: true };
}

/**
 * Get tenant usage statistics
 */
export async function getTenantUsage(tenant: Tenant): Promise<{
  products: { current: number; limit: number | null };
  orders: { current: number; limit: number | null };
  pages: { current: number; limit: number | null };
  blogs: { current: number; limit: number | null };
  customers: { current: number; limit: number | null };
  storage_mb: { current: number; limit: number | null };
}> {
  const [productCount, orderCount, pageCount, blogCount, customerCount] = await Promise.all([
    prisma.products.count({ where: { tenant_id: tenant.id } }),
    prisma.orders.count({ where: { tenant_id: tenant.id } }),
    prisma.pages.count({ where: { tenant_id: tenant.id } }),
    prisma.blogs.count({ where: { tenant_id: tenant.id } }),
    prisma.customers.count({ where: { tenant_id: tenant.id } }),
  ]);

  let limits: PlanLimits = {};
  if (tenant.plan_id) {
    const plan = await prisma.price_plans.findUnique({
      where: { id: tenant.plan_id },
    });
    if (plan) {
      limits = getPlanLimits(plan.features);
    }
  }

  return {
    products: {
      current: productCount,
      limit: limits.max_products === -1 ? null : limits.max_products ?? null,
    },
    orders: {
      current: orderCount,
      limit: limits.max_orders === -1 ? null : limits.max_orders ?? null,
    },
    pages: {
      current: pageCount,
      limit: limits.max_pages === -1 ? null : limits.max_pages ?? null,
    },
    blogs: {
      current: blogCount,
      limit: limits.max_blogs === -1 ? null : limits.max_blogs ?? null,
    },
    customers: {
      current: customerCount,
      limit: limits.max_customers === -1 ? null : limits.max_customers ?? null,
    },
    storage_mb: {
      current: 0, // TODO: Get from Supabase Storage
      limit: limits.max_storage_mb === -1 ? null : limits.max_storage_mb ?? null,
    },
  };
}

