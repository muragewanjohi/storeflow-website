/**
 * API Route Template
 * 
 * Use this template to create new API routes
 * 
 * Tenant Context:
 * - Tenant is automatically resolved from hostname in middleware
 * - Use getTenantFromRequest() to get tenant info
 * - RLS policies automatically filter by tenant_id
 * 
 * Example Usage:
 * 1. Copy this file to src/app/api/[your-route]/route.ts
 * 2. Implement your GET/POST/PUT/DELETE handlers
 * 3. Add validation with Zod schemas
 * 4. Use Prisma client with tenant context
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant-context';
import { createTenantSupabaseClient } from '@/lib/supabase/client';
import { prisma } from '@/lib/prisma/client';

/**
 * GET Handler Template
 * 
 * Example: GET /api/products
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Resolve tenant from request
    const hostname = request.headers.get('host') || '';
    const tenant = await getTenantFromRequest(hostname);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // 2. Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 3. Query database (RLS automatically filters by tenant_id)
    // Option A: Using Supabase
    // const supabase = createTenantSupabaseClient(tenant.id);
    // const { data, error } = await supabase
    //   .from('products')
    //   .select('*')
    //   .eq('tenant_id', tenant.id)
    //   .range((page - 1) * limit, page * limit - 1);

    // Option B: Using Prisma
    const data = await prisma.products.findMany({
      where: {
        tenant_id: tenant.id,
        // Add your filters here
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    // 4. Return response
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: data.length, // You might want to get actual count
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST Handler Template
 * 
 * Example: POST /api/products
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Resolve tenant
    const hostname = request.headers.get('host') || '';
    const tenant = await getTenantFromRequest(hostname);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    
    // TODO: Add Zod validation
    // const schema = z.object({
    //   name: z.string().min(1),
    //   price: z.number().positive(),
    // });
    // const validatedData = schema.parse(body);

    // 3. Create record (tenant_id is automatically set by RLS or explicitly)
    const data = await prisma.products.create({
      data: {
        tenant_id: tenant.id,
        // ...validatedData
        ...body,
      },
    });

    // 4. Return response
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle validation errors
    // if (error instanceof z.ZodError) {
    //   return NextResponse.json(
    //     { error: 'Validation failed', details: error.errors },
    //     { status: 400 }
    //   );
    // }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT Handler Template
 * 
 * Example: PUT /api/products/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostname = request.headers.get('host') || '';
    const tenant = await getTenantFromRequest(hostname);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id } = params;

    // Update record (RLS ensures tenant isolation)
    const data = await prisma.products.update({
      where: {
        id,
        tenant_id: tenant.id, // Ensure tenant isolation
      },
      data: body,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE Handler Template
 * 
 * Example: DELETE /api/products/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hostname = request.headers.get('host') || '';
    const tenant = await getTenantFromRequest(hostname);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const { id } = params;

    // Delete record (RLS ensures tenant isolation)
    await prisma.products.delete({
      where: {
        id,
        tenant_id: tenant.id, // Ensure tenant isolation
      },
    });

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

