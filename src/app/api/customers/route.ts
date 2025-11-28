/**
 * Customers API Routes
 * 
 * GET: List customers
 * POST: Create customer (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { customerQuerySchema, customerRegisterSchema } from '@/lib/customers/validation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * GET /api/customers - List customers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    // Only tenant admins and staff can view customers
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    
    const { searchParams } = new URL(request.url);
    
    // Convert null to undefined for optional fields
    const getParam = (key: string) => {
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

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (query.email) {
      where.email = {
        contains: query.email,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[query.sort_by || 'created_at'] = query.sort_order || 'desc';

    // Fetch customers
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

    return NextResponse.json({
      success: true,
      customers: customers.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        username: customer.username,
        mobile: customer.mobile,
        company: customer.company,
        email_verified: customer.email_verified,
        image: customer.image,
        stats: {
          cart_items: customer._count.cart_items,
          reviews: customer._count.product_reviews,
          wishlist_items: customer._count.product_wishlists,
          support_tickets: customer._count.support_tickets,
        },
        created_at: customer.created_at,
        updated_at: customer.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers - Create customer (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    // Only tenant admins and staff can create customers
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    
    const body = await request.json();
    const validatedData = customerRegisterSchema.parse(body);

    // Check if customer with this email already exists
    const existingCustomer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email: validatedData.email,
      },
    });

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');

    // Create customer
    const customer = await prisma.customers.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        mobile: validatedData.mobile,
        company: validatedData.company,
        email_verified: false,
        email_verify_token: emailVerifyToken,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        mobile: true,
        company: true,
        email_verified: true,
        created_at: true,
      },
    });

    // Send welcome email (async, don't wait)
    (async () => {
      try {
        const { sendCustomerWelcomeEmail } = await import('@/lib/customers/emails');
        await sendCustomerWelcomeEmail({
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
          },
          tenant,
          verificationToken: emailVerifyToken,
        });
      } catch (error) {
        console.error('Error sending welcome email:', error);
        // Don't fail customer creation if email fails
      }
    })();

    return NextResponse.json(
      {
        success: true,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          username: customer.username,
          mobile: customer.mobile,
          company: customer.company,
          email_verified: customer.email_verified,
          created_at: customer.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating customer:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: error.status || 500 }
    );
  }
}

