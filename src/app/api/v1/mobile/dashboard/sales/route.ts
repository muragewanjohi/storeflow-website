import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { createSaleSchema, generateSaleSlug } from '@/lib/sales/validation';

const salesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard sales'),
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
    const query = salesQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.salesWhereInput = {
      tenant_id: user.tenant_id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.sales.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          banner_image: true,
          badge_text: true,
          badge_color: true,
          status: true,
          is_featured: true,
          start_date: true,
          end_date: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              product_sales: true,
            },
          },
        },
      }),
      prisma.sales.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess(
        {
          items: items.map((sale) => ({
            id: sale.id,
            name: sale.name,
            slug: sale.slug,
            description: sale.description,
            bannerImage: sale.banner_image,
            badgeText: sale.badge_text,
            badgeColor: sale.badge_color,
            status: sale.status ?? 'draft',
            featured: sale.is_featured ?? false,
            productCount: sale._count.product_sales,
            startDate: sale.start_date?.toISOString() ?? null,
            endDate: sale.end_date?.toISOString() ?? null,
            createdAt: sale.created_at?.toISOString() ?? null,
            updatedAt: sale.updated_at?.toISOString() ?? null,
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

    console.error('[Mobile Dashboard Sales] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch sales'),
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;

  try {
    const body = await request.json();
    const validatedData = createSaleSchema.parse(body);
    const slugSource = validatedData.slug?.trim() || validatedData.name;
    const slug = generateSaleSlug(slugSource);
    if (!slug) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'Invalid sale slug. Use letters, numbers, and hyphens only.'),
        { status: 400 },
      );
    }

    const existingSale = await prisma.sales.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (existingSale) {
      return NextResponse.json(mobileError('CONFLICT', 'A sale with this slug already exists'), {
        status: 409,
      });
    }

    const startDate = validatedData.start_date || null;
    const endDate = validatedData.end_date || null;
    if (startDate && endDate && startDate >= endDate) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'End date must be after start date', [
          { field: 'end_date', message: 'Must be after start_date' },
        ]),
        { status: 400 },
      );
    }

    const sale = await prisma.sales.create({
      data: {
        tenant_id: tenantId,
        name: validatedData.name,
        slug,
        description: validatedData.description || null,
        banner_image: validatedData.banner_image || null,
        badge_text: validatedData.badge_text || 'SALE',
        badge_color: validatedData.badge_color || '#EF4444',
        start_date: startDate,
        end_date: endDate,
        status: validatedData.status || 'draft',
        is_featured: validatedData.is_featured || false,
        metadata: validatedData.metadata || {},
      },
    });

    return NextResponse.json(mobileSuccess({ sale }), { status: 201 });
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
    console.error('[Mobile Dashboard Sales POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create sale'), { status: 500 });
  }
}
