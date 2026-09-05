import { revalidateTag } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { getProductCachePatterns } from '@/lib/cache/product-cache-keys';
import { deleteCachePattern } from '@/lib/cache/redis';

export type DemoProductSource =
  | 'starter_pack_ai'
  | 'theme_demo_content'
  | 'admin_demo_store'
  | 'demo_store_seed';

export function buildDemoProductMetadata(
  source: DemoProductSource,
  demoType: string,
  metadata: Record<string, unknown> = {},
): Prisma.InputJsonObject {
  return {
    ...metadata,
    source,
    is_demo: true,
    demo_type: demoType,
  };
}

export async function countActiveDemoProducts(tenantId: string): Promise<number> {
  const [result] = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM products
    WHERE tenant_id = ${tenantId}::uuid
      AND (
        metadata->>'is_demo' = 'true'
        OR metadata->>'source' = 'starter_pack_ai'
      )
      AND COALESCE(status, 'active') <> 'archived'
  `;

  return result?.count ?? 0;
}

export async function invalidateDemoProductCaches(tenantId: string) {
  try {
    revalidateTag(`products-${tenantId}`);
    revalidateTag(`products-count-${tenantId}`);
    revalidateTag(`products-ratings-${tenantId}`);

    for (const pattern of getProductCachePatterns(tenantId)) {
      await deleteCachePattern(pattern);
    }
  } catch (error) {
    console.warn('[Demo products] Failed to invalidate product caches', error);
  }
}

export async function removeActiveDemoProducts(tenantId: string) {
  const demoProducts = await prisma.$queryRaw<Array<{ id: string; has_orders: boolean }>>`
    SELECT
      p.id::text AS id,
      EXISTS (
        SELECT 1
        FROM order_products op
        WHERE op.tenant_id = p.tenant_id
          AND op.product_id = p.id
      ) AS has_orders
    FROM products p
    WHERE p.tenant_id = ${tenantId}::uuid
      AND (
        p.metadata->>'is_demo' = 'true'
        OR p.metadata->>'source' = 'starter_pack_ai'
      )
      AND COALESCE(p.status, 'active') <> 'archived'
  `;

  const deleteIds = demoProducts.filter((product) => !product.has_orders).map((product) => product.id);
  const archiveIds = demoProducts.filter((product) => product.has_orders).map((product) => product.id);

  const deleted =
    deleteIds.length > 0
      ? await prisma.products.deleteMany({
          where: {
            tenant_id: tenantId,
            id: { in: deleteIds },
          },
        })
      : { count: 0 };

  const archived =
    archiveIds.length > 0
      ? await prisma.products.updateMany({
          where: {
            tenant_id: tenantId,
            id: { in: archiveIds },
          },
          data: { status: 'archived' },
        })
      : { count: 0 };

  if (demoProducts.length > 0) {
    await invalidateDemoProductCaches(tenantId);
  }

  return {
    matchedCount: demoProducts.length,
    deletedCount: deleted.count,
    archivedCount: archived.count,
    removedCount: deleted.count + archived.count,
  };
}
