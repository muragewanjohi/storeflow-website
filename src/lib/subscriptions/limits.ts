/**
 * Subscription Plan Limits Enforcement
 * 
 * Utilities for checking and enforcing plan limits (products, orders, storage, etc.)
 */

import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';
import type { AiFeature, AiUsageBucket } from '@/lib/ai/types';

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
 * Read-only snapshot shape for the subscription dashboard/mobile summary
 * (src/lib/subscriptions/load-subscription-snapshot.ts). camelCase,
 * `null`-based, distinct from PlanLimits above (snake_case, `-1`-based,
 * used at enforcement time by canCreate*() below) on purpose — this was
 * previously a second file (plan-limits.ts) with its own independent
 * `features` JSON parser, which is exactly the kind of drift this file was
 * merged to prevent: planLimitsFromFeatures() now delegates to
 * getPlanLimits() below for the actual field extraction, so there is one
 * parser, not two, even though there remain two output shapes for two
 * different callers.
 */
export type PlanLimitsSnapshot = {
  maxProducts: number | null;
  maxOrders: number | null;
  maxPages: number | null;
  maxBlogs: number | null;
  maxCustomers: number | null;
  maxStorageMb: number | null;
  ai: AiPlanLimits;
};

/**
 * AI feature quotas — see docs/AI_FEATURES_PLAN.md "Plan quotas" section for
 * the reasoning behind the setup/monthly split. `null` means "not available
 * on this plan" (not "unlimited") — treat null as a hard gate, distinct from
 * a generous numeric quota. This is a different `null` convention than the
 * top-level PlanLimitsSnapshot fields above, where `null` means "key absent
 * from features JSON" and a literal `-1` (passed through unchanged) is what
 * actually means unlimited — see isUnlimited() and buildUsageDetails() in
 * load-subscription-snapshot.ts, which already handles that distinction.
 */
export type AiPlanLimits = {
  /** One-time allowance consumed during initial store build, not tied to the calendar month. */
  setup: {
    descriptions: number | null;
    photoQaPasses: number | null;
    marketingImages: number | null;
    themeStylingPasses: number | null;
    legalPageDrafts: number | null;
  };
  /** Recurring allowance, resets monthly, for post-setup usage. */
  monthly: {
    /** Product descriptions and photo-QA passes share one counter — see AI_FEATURES_PLAN.md. */
    descriptionsAndPhotoQa: number | null;
    marketingImages: number | null;
    /** Gated to Pro/Premium via hasAdvancedAnalyticsAccess() — expect null on Basic regardless of this value. */
    analyticsInsights: number | null;
    /** Dashboard AI Assistant (docs/DASHBOARD_AI_ASSISTANT_PLAN.md) — unlike analyticsInsights, available on both tiers, differentiated by this quota rather than a hard gate. */
    assistantQueries: number | null;
  };
};

function readNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

/** undefined (key absent) becomes null; -1 and every other value pass through unchanged. */
function toSnapshotValue(raw: number | undefined): number | null {
  return raw === undefined ? null : raw;
}

export function planLimitsFromFeatures(features: unknown): PlanLimitsSnapshot {
  const enforcementLimits = getPlanLimits(features);

  const f =
    features && typeof features === 'object' && !Array.isArray(features)
      ? (features as Record<string, unknown>)
      : {};
  const ai =
    f.ai && typeof f.ai === 'object' && !Array.isArray(f.ai)
      ? (f.ai as Record<string, unknown>)
      : {};
  const aiSetup =
    ai.setup && typeof ai.setup === 'object' && !Array.isArray(ai.setup)
      ? (ai.setup as Record<string, unknown>)
      : {};
  const aiMonthly =
    ai.monthly && typeof ai.monthly === 'object' && !Array.isArray(ai.monthly)
      ? (ai.monthly as Record<string, unknown>)
      : {};

  return {
    maxProducts: toSnapshotValue(enforcementLimits.max_products),
    maxOrders: toSnapshotValue(enforcementLimits.max_orders),
    maxPages: toSnapshotValue(enforcementLimits.max_pages),
    maxBlogs: toSnapshotValue(enforcementLimits.max_blogs),
    maxCustomers: toSnapshotValue(enforcementLimits.max_customers),
    maxStorageMb: toSnapshotValue(enforcementLimits.max_storage_mb),
    ai: {
      setup: {
        descriptions: readNumberOrNull(aiSetup.descriptions),
        photoQaPasses: readNumberOrNull(aiSetup.photo_qa_passes),
        marketingImages: readNumberOrNull(aiSetup.marketing_images),
        themeStylingPasses: readNumberOrNull(aiSetup.theme_styling_passes),
        legalPageDrafts: readNumberOrNull(aiSetup.legal_page_drafts),
      },
      monthly: {
        descriptionsAndPhotoQa: readNumberOrNull(aiMonthly.descriptions_and_photo_qa),
        marketingImages: readNumberOrNull(aiMonthly.marketing_images),
        analyticsInsights: readNumberOrNull(aiMonthly.analytics_insights),
        assistantQueries: readNumberOrNull(aiMonthly.assistant_queries),
      },
    },
  };
}

/**
 * Default AI quotas by plan-name substring, used when a price_plans row's
 * `features` JSON hasn't been backfilled with an `ai` block yet. Mirrors the
 * recommended defaults in docs/AI_FEATURES_PLAN.md — update both together.
 */
export function defaultAiPlanLimits(planName: string | null | undefined): AiPlanLimits {
  const isPro = !!planName && /pro|premium/i.test(planName);

  if (isPro) {
    return {
      setup: {
        descriptions: 50,
        photoQaPasses: 50,
        marketingImages: 15,
        themeStylingPasses: 5,
        legalPageDrafts: 3,
      },
      monthly: {
        descriptionsAndPhotoQa: 150,
        marketingImages: 20,
        analyticsInsights: 30,
        assistantQueries: 200, // effectively unlimited for real usage patterns
      },
    };
  }

  return {
    setup: {
      descriptions: 50,
      photoQaPasses: 50,
      marketingImages: 15,
      themeStylingPasses: 5,
      legalPageDrafts: 3,
    },
    monthly: {
      descriptionsAndPhotoQa: 40,
      marketingImages: 4,
      analyticsInsights: null, // gated off entirely — use hasAdvancedAnalyticsAccess(), not this value, to enforce
      // Available on Basic too, per DASHBOARD_AI_ASSISTANT_PLAN.md's
      // resolved gating decision — quota-differentiated, not hard-gated.
      // Raised from 20 to 50 (docs/IMPLEMENTATION_TRACKER.md, DA.14) after
      // real device testing showed 20 gets burned in a single realistic
      // onboarding session (Haiku 4.5 cost is trivial either way — ~$0.002
      // real average per request, so ~$0.09/tenant/month worst case at 50;
      // this was never a cost constraint, just too tight a UX ceiling).
      // Admin-editable per plan from here down — see
      // src/app/admin/price-plans/[id]/edit-plan-form.tsx; this default
      // only applies until a plan's features.ai block is explicitly saved.
      assistantQueries: 50,
    },
  };
}

/**
 * Per-field "what would actually apply right now" snapshot — declared value
 * from `features.ai` where present, the plan-name default otherwise. Used
 * to pre-fill the admin price-plan edit form (edit-plan-form.tsx) so an
 * admin editing a plan that has never had its `ai` block explicitly saved
 * still sees real, honest numbers instead of blanks or nulls.
 *
 * Deliberately per-field, NOT the same all-or-nothing rule
 * canUseAiFeature()/getAiFeatureLimit() use at enforcement time (there, ANY
 * declared field makes the whole block authoritative, so an
 * unmentioned field there means "off", not "use the default") — that
 * distinction stops mattering the moment the admin form saves, since it
 * always writes the complete 9-field block from here on. This function
 * exists purely to make the FIRST edit of a not-yet-backfilled plan show
 * sensible numbers, not to change how enforcement itself reads the JSON.
 */
export function effectiveAiPlanLimits(features: unknown, planName: string | null | undefined): AiPlanLimits {
  const declared = planLimitsFromFeatures(features).ai;
  const fallback = defaultAiPlanLimits(planName);
  return {
    setup: {
      descriptions: declared.setup.descriptions ?? fallback.setup.descriptions,
      photoQaPasses: declared.setup.photoQaPasses ?? fallback.setup.photoQaPasses,
      marketingImages: declared.setup.marketingImages ?? fallback.setup.marketingImages,
      themeStylingPasses: declared.setup.themeStylingPasses ?? fallback.setup.themeStylingPasses,
      legalPageDrafts: declared.setup.legalPageDrafts ?? fallback.setup.legalPageDrafts,
    },
    monthly: {
      descriptionsAndPhotoQa: declared.monthly.descriptionsAndPhotoQa ?? fallback.monthly.descriptionsAndPhotoQa,
      marketingImages: declared.monthly.marketingImages ?? fallback.monthly.marketingImages,
      analyticsInsights: declared.monthly.analyticsInsights ?? fallback.monthly.analyticsInsights,
      assistantQueries: declared.monthly.assistantQueries ?? fallback.monthly.assistantQueries,
    },
  };
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
 * Check if tenant can add more staff users
 * 
 * @param tenant - Tenant object
 * @param excludeUserId - Optional user ID to exclude from count (e.g., when updating existing user)
 * @returns Object with allowed status and reason if not allowed
 */
export async function canAddStaffUser(
  tenant: Tenant,
  excludeUserId?: string
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number }> {
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
  const maxStaffUsers = limits.max_staff_users;

  // Unlimited
  if (isUnlimited(maxStaffUsers)) {
    return { allowed: true };
  }

  // Count current staff users (tenant_admin and tenant_staff) for this tenant
  // We need to query Supabase Auth to get users with matching tenant_id
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();
  
  const { data: { users }, error } = await adminClient.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users for staff limit check:', error);
    return { allowed: false, reason: 'Failed to check staff user limit' };
  }

  // Filter users by tenant_id and role (tenant_admin or tenant_staff)
  const staffUsers = users.filter((u: any) => {
    const userTenantId = u.user_metadata?.tenant_id;
    const userRole = u.user_metadata?.role;
    const isStaffUser = userRole === 'tenant_admin' || userRole === 'tenant_staff';
    
    // Exclude the user being updated if provided
    if (excludeUserId && u.id === excludeUserId) {
      return false;
    }
    
    return userTenantId === tenant.id && isStaffUser;
  });

  const currentCount = staffUsers.length;

  if (currentCount >= maxStaffUsers!) {
    return {
      allowed: false,
      reason: `Staff user limit reached (${currentCount}/${maxStaffUsers}). Please upgrade your plan to add more staff users.`,
      current: currentCount,
      limit: maxStaffUsers,
    };
  }

  return { allowed: true, current: currentCount, limit: maxStaffUsers };
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

/**
 * Look up the quota for one AI feature+bucket combination from a plan's
 * AiPlanLimits. Returns:
 *   - a number: the enforced cap (compared against cumulative item_count)
 *   - null: feature explicitly unavailable on this plan
 *   - undefined: no cap defined for this feature/bucket — canUseAiFeature
 *     allows it unconditionally (rate limiting in @/lib/ai/rate-limit is
 *     still the abuse guard for these). This is deliberate for features
 *     like expense_categorization that are unlimited-by-design because
 *     their per-request cost is trivial — see docs/AI_FEATURES_PLAN.md.
 */
function getAiFeatureLimit(
  limits: AiPlanLimits,
  feature: AiFeature,
  bucket: AiUsageBucket
): number | null | undefined {
  if (bucket === 'setup') {
    switch (feature) {
      case 'product_description':
        return limits.setup.descriptions;
      case 'photo_qa':
        return limits.setup.photoQaPasses;
      case 'marketing_image_prompt':
        return limits.setup.marketingImages;
      case 'theme_styling':
        return limits.setup.themeStylingPasses;
      case 'legal_page_draft':
        return limits.setup.legalPageDrafts;
      default:
        return undefined;
    }
  }

  switch (feature) {
    case 'product_description':
    case 'photo_qa':
      // Descriptions and photo-QA passes share one monthly counter — see
      // docs/AI_FEATURES_PLAN.md "Plan quotas".
      return limits.monthly.descriptionsAndPhotoQa;
    case 'marketing_image_prompt':
      return limits.monthly.marketingImages;
    case 'analytics_insight':
      return limits.monthly.analyticsInsights;
    case 'assistant_query':
      return limits.monthly.assistantQueries;
    default:
      return undefined;
  }
}

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Check whether a tenant can use an AI feature, against the setup-bucket or
 * monthly-bucket quota (see docs/AI_FEATURES_PLAN.md "Plan quotas"). Counts
 * cumulative item_count from ai_usage_log, not row count, so a single
 * batched call generating 10 descriptions correctly consumes 10 units of
 * quota, not 1.
 *
 * This is a quota check only — pair it with checkAiRateLimit()
 * (@/lib/ai/rate-limit) on every AI route; that guards against
 * abuse/retry-storms within the quota, which this function does not.
 */
export async function canUseAiFeature(
  tenant: Tenant,
  feature: AiFeature,
  bucket: AiUsageBucket
): Promise<{ allowed: boolean; reason?: string; current?: number; limit?: number | null }> {
  if (!tenant.plan_id) {
    return { allowed: false, reason: 'No active subscription plan' };
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan) {
    return { allowed: false, reason: 'Subscription plan not found' };
  }

  const declaredAi = planLimitsFromFeatures(plan.features).ai;
  const hasDeclaredAi =
    Object.values(declaredAi.setup).some((v) => v !== null) ||
    Object.values(declaredAi.monthly).some((v) => v !== null);
  const limits = hasDeclaredAi ? declaredAi : defaultAiPlanLimits(plan.name);

  const limit = getAiFeatureLimit(limits, feature, bucket);

  if (limit === undefined) {
    return { allowed: true };
  }
  if (limit === null) {
    return { allowed: false, reason: `${feature} is not available on your current plan.` };
  }

  const since = bucket === 'monthly' ? startOfCurrentMonth() : undefined;
  const agg = await prisma.ai_usage_log.aggregate({
    where: {
      tenant_id: tenant.id,
      feature,
      bucket,
      ...(since ? { created_at: { gte: since } } : {}),
    },
    _sum: { item_count: true },
  });
  const current = agg._sum.item_count ?? 0;

  if (current >= limit) {
    return {
      allowed: false,
      reason: `${feature} limit reached (${current}/${limit}) for this ${
        bucket === 'setup' ? 'store setup' : 'month'
      }. Please upgrade your plan to continue.`,
      current,
      limit,
    };
  }

  return { allowed: true, current, limit };
}

