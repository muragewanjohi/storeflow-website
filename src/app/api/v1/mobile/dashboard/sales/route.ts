import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';

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
