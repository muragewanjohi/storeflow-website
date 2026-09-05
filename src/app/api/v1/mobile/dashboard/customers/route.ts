import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { requireMobileAuth } from '@/lib/auth/mobile-auth';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { customerQuerySchema } from '@/lib/customers/validation';

export async function GET(request: NextRequest) {
  try {
    const user = await requireMobileAuth(request);

    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff') {
      return NextResponse.json(
        mobileError('FORBIDDEN', 'Only tenant users can access mobile dashboard customers'),
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

    const query = customerQuerySchema.parse({
      page: getParam('page'),
      limit: getParam('limit'),
      search: getParam('search'),
      email: getParam('email'),
      sort_by: getParam('sort_by'),
      sort_order: getParam('sort_order'),
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.customersWhereInput = {
      tenant_id: user.tenant_id,
    };

    if (query.email?.trim()) {
      where.email = {
        contains: query.email.trim(),
        mode: 'insensitive',
      };
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { username: { contains: term, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.customersOrderByWithRelationInput = {
      [query.sort_by ?? 'created_at']: query.sort_order ?? 'desc',
    };

    const [customers, total] = await Promise.all([
      prisma.customers.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          mobile: true,
          company: true,
          email_verified: true,
          image: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              cart_items: true,
              product_reviews: true,
              product_wishlists: true,
              support_tickets: true,
            },
          },
        },
      }),
      prisma.customers.count({ where }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return NextResponse.json(
      mobileSuccess(
        {
          items: customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            username: customer.username,
            mobile: customer.mobile,
            company: customer.company,
            emailVerified: customer.email_verified,
            image: customer.image,
            stats: {
              cartItems: customer._count.cart_items,
              reviews: customer._count.product_reviews,
              wishlistItems: customer._count.product_wishlists,
              supportTickets: customer._count.support_tickets,
            },
            createdAt: customer.created_at?.toISOString() ?? null,
            updatedAt: customer.updated_at?.toISOString() ?? null,
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

    console.error('[Mobile Dashboard Customers] Unexpected error:', error);
    return NextResponse.json(
      mobileError('INTERNAL_ERROR', 'Failed to fetch customers'),
      { status: 500 },
    );
  }
}

