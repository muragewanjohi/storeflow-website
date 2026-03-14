import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { productQuerySchema } from '@/lib/products/validation';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard products'),
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

    const rawQuery: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      rawQuery[key] = value;
    }

    // Keep compatibility with existing web query naming.
    if (rawQuery.category && !rawQuery.category_id) {
      rawQuery.category_id = rawQuery.category;
    }

    const query = productQuerySchema.parse(rawQuery);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.productsWhereInput = {
      tenant_id: user.tenant_id,
    };

    if (query.search?.trim()) {
      const trimmed = query.search.trim();
      where.OR = [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { description: { contains: trimmed, mode: 'insensitive' } },
        { sku: { contains: trimmed, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.category_id) {
      const categoryFilters = query.category_id
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (categoryFilters.length > 0) {
        where.category_id = categoryFilters.length === 1 ? categoryFilters[0] : { in: categoryFilters };
      }
    }

    if (query.min_price !== undefined || query.max_price !== undefined) {
      where.price = {};
      if (query.min_price !== undefined) {
        where.price.gte = query.min_price;
      }
      if (query.max_price !== undefined) {
        where.price.lte = query.max_price;
      }
    }

    if (query.in_stock !== undefined) {
      where.stock_quantity = query.in_stock ? { gt: 0 } : { lte: 0 };
    }

    const orderBy: Prisma.productsOrderByWithRelationInput = {
      [query.sort_by ?? 'created_at']: query.sort_order ?? 'desc',
    };

    const [items, total] = await Promise.all([
      prisma.products.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          description: true,
          price: true,
          sale_price: true,
          stock_quantity: true,
          status: true,
          image: true,
          category_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      prisma.products.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess(
        {
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            sku: item.sku,
            description: item.description,
            price: Number(item.price),
            salePrice: item.sale_price ? Number(item.sale_price) : null,
            stockQuantity: item.stock_quantity ?? 0,
            status: item.status ?? 'active',
            image: item.image,
            categoryId: item.category_id,
            createdAt: item.created_at?.toISOString() ?? null,
            updatedAt: item.updated_at?.toISOString() ?? null,
          })),
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

    console.error('[Mobile Dashboard Products] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch products'),
      { status: 500 },
    );
  }
}

