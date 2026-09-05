import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { inventoryQuerySchema } from '@/lib/inventory/validation';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard inventory'),
        { status: 403 },
      );
    }

    if (!user.tenant_id) {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Tenant context missing for this user'),
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const getParam = (key: string): string | undefined => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };

    const query = inventoryQuerySchema.parse({
      page: getParam('page'),
      limit: getParam('limit'),
      threshold: getParam('threshold'),
      low_stock_only: getParam('low_stock_only'),
    });

    const search = getParam('search')?.trim();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const threshold = query.threshold ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.productsWhereInput = {
      tenant_id: user.tenant_id,
      status: {
        in: ['active', 'draft'],
      },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.low_stock_only) {
      where.OR = [
        ...(where.OR ?? []),
        {
          AND: [
            {
              OR: [{ stock_quantity: { lte: threshold } }, { stock_quantity: null }],
            },
            { product_variants: { none: {} } },
          ],
        },
        {
          product_variants: {
            some: {
              stock_quantity: { lte: threshold },
            },
          },
        },
      ];
    }

    const [products, total, totalProducts, totalVariants, lowStockProducts, lowStockVariants, stockAggregate, lowStockVariantPreview] =
      await Promise.all([
        prisma.products.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updated_at: 'desc' },
          select: {
            id: true,
            name: true,
            sku: true,
            stock_quantity: true,
            status: true,
            image: true,
            updated_at: true,
            _count: {
              select: {
                product_variants: true,
              },
            },
          },
        }),
        prisma.products.count({ where }),
        prisma.products.count({
          where: {
            tenant_id: user.tenant_id,
            status: { in: ['active', 'draft'] },
          },
        }),
        prisma.product_variants.count({
          where: {
            tenant_id: user.tenant_id,
          },
        }),
        prisma.products.count({
          where: {
            tenant_id: user.tenant_id,
            status: { in: ['active', 'draft'] },
            product_variants: { none: {} },
            OR: [{ stock_quantity: { lte: threshold } }, { stock_quantity: null }],
          },
        }),
        prisma.product_variants.count({
          where: {
            tenant_id: user.tenant_id,
            stock_quantity: { lte: threshold },
          },
        }),
        prisma.products.aggregate({
          where: {
            tenant_id: user.tenant_id,
            status: { in: ['active', 'draft'] },
          },
          _sum: {
            stock_quantity: true,
          },
        }),
        prisma.product_variants.findMany({
          where: {
            tenant_id: user.tenant_id,
            stock_quantity: { lte: threshold },
          },
          orderBy: { stock_quantity: 'asc' },
          take: 10,
          select: {
            id: true,
            sku: true,
            stock_quantity: true,
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        }),
      ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess(
        {
          items: products.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            stockQuantity: product.stock_quantity ?? 0,
            status: product.status ?? 'active',
            image: product.image,
            variantCount: product._count.product_variants,
            lowStock:
              product._count.product_variants === 0 &&
              ((product.stock_quantity ?? 0) <= threshold),
            updatedAt: product.updated_at?.toISOString() ?? null,
          })),
          lowStockVariantPreview: lowStockVariantPreview.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            stockQuantity: variant.stock_quantity ?? 0,
            product: {
              id: variant.products.id,
              name: variant.products.name,
              sku: variant.products.sku,
            },
          })),
          stats: {
            totalProducts,
            totalVariants,
            totalStock: stockAggregate._sum.stock_quantity ?? 0,
            lowStockProducts,
            lowStockVariants,
            lowStockTotal: lowStockProducts + lowStockVariants,
          },
          threshold,
        },
        {
          page,
          limit,
          total,
          totalPages,
        },
      ),
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Invalid query parameters',
          error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        ),
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized mobile request')) {
      return NextResponse.json(
        mobileError('UNAUTHORIZED', 'Missing or invalid bearer token'),
        { status: 401 },
      );
    }

    console.error('[Mobile Dashboard Inventory] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch inventory'),
      { status: 500 },
    );
  }
}

