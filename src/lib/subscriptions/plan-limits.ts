export type PlanLimits = {
  maxProducts: number | null;
  maxOrders: number | null;
  maxPages: number | null;
  maxBlogs: number | null;
  maxCustomers: number | null;
  maxStorageMb: number | null;
};

export function planLimitsFromFeatures(features: unknown): PlanLimits {
  const f =
    features && typeof features === 'object' && !Array.isArray(features)
      ? (features as Record<string, unknown>)
      : {};

  return {
    maxProducts:
      (f.max_products as number | undefined) ??
      (f.product_permission_feature as number | undefined) ??
      null,
    maxOrders: (f.max_orders as number | undefined) ?? null,
    maxPages:
      (f.max_pages as number | undefined) ??
      (f.page_permission_feature as number | undefined) ??
      null,
    maxBlogs:
      (f.max_blogs as number | undefined) ??
      (f.blog_permission_feature as number | undefined) ??
      null,
    maxCustomers: (f.max_customers as number | undefined) ?? null,
    maxStorageMb:
      (f.max_storage_mb as number | undefined) ??
      (f.storage_permission_feature as number | undefined) ??
      null,
  };
}
