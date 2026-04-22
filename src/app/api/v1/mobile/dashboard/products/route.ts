import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import {
  createProductSchema,
  generateSKU,
  generateSlug,
  productQuerySchema,
} from '@/lib/products/validation';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { canCreateProduct } from '@/lib/subscriptions/limits';
import { getProductCachePatterns } from '@/lib/cache/product-cache-keys';
import { deleteCachePattern } from '@/lib/cache/redis';

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
          cost_price: true,
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
            costPrice: item.cost_price != null ? Number(item.cost_price) : null,
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

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;

  const { user, tenantId, tenant } = gate.ctx;

  try {
    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    const slug = validatedData.slug || generateSlug(validatedData.name);
    const slugTaken = await prisma.products.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (slugTaken) {
      return NextResponse.json(mobileError('CONFLICT', 'A product with this slug already exists'), {
        status: 409,
      });
    }

    const limitCheck = await canCreateProduct(tenant);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        mobileError('FORBIDDEN', limitCheck.reason || 'Product limit reached'),
        { status: 403 },
      );
    }

    let finalSku =
      validatedData.sku && validatedData.sku.trim() !== ''
        ? validatedData.sku.trim()
        : generateSKU(validatedData.name, tenantId);

    const skuCollision = await prisma.products.findFirst({
      where: { tenant_id: tenantId, sku: finalSku },
    });
    if (skuCollision) {
      finalSku = generateSKU(validatedData.name, tenantId);
    }

    if (validatedData.category_id) {
      const cat = await prisma.categories.findFirst({
        where: { id: validatedData.category_id, tenant_id: tenantId },
      });
      if (!cat) {
        return NextResponse.json(
          mobileError('VALIDATION_ERROR', 'Category not found', [
            { field: 'category_id', message: 'Invalid category for this store' },
          ]),
          { status: 400 },
        );
      }
    }

    const product = await prisma.products.create({
      data: {
        tenant_id: tenantId,
        name: validatedData.name,
        slug,
        description: validatedData.description ?? null,
        short_description: validatedData.short_description ?? null,
        price: Number(validatedData.price),
        cost_price: validatedData.cost_price != null ? Number(validatedData.cost_price) : null,
        sale_price: validatedData.sale_price != null ? Number(validatedData.sale_price) : null,
        sku: finalSku,
        stock_quantity: validatedData.stock_quantity ?? 0,
        status: validatedData.status ?? 'active',
        image: validatedData.image ?? null,
        gallery: Array.isArray(validatedData.gallery) ? validatedData.gallery : [],
        category_id: validatedData.category_id ?? null,
        brand_id: validatedData.brand_id ?? null,
        created_by: user.id,
        metadata:
          validatedData.metadata && typeof validatedData.metadata === 'object'
            ? validatedData.metadata
            : {},
        estimated_delivery_days: validatedData.estimated_delivery_days ?? null,
      },
    });

    try {
      await prisma.$executeRaw`
        UPDATE products
        SET search_vector =
          setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
          setweight(to_tsvector('english', COALESCE(sku, '')), 'A')
        WHERE id = ${product.id}::uuid
      `;
    } catch (e) {
      console.warn('[Mobile product POST] search_vector', e);
    }

    try {
      revalidateTag(`products-${tenantId}`);
      revalidateTag(`products-count-${tenantId}`);
      for (const pattern of getProductCachePatterns(tenantId)) {
        await deleteCachePattern(pattern);
      }
    } catch (e) {
      console.warn('[Mobile product POST] cache', e);
    }

    return NextResponse.json(
      mobileSuccess({ product, message: 'Product created successfully' }),
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile Dashboard Products POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create product'), { status: 500 });
  }
}

