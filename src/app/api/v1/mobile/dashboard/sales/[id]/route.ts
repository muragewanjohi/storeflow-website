import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { updateSaleSchema, generateSaleSlug } from '@/lib/sales/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const sale = await prisma.sales.findFirst({
      where: { id, tenant_id: tenantId },
      include: {
        product_sales: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                sale_price: true,
                image: true,
                stock_quantity: true,
                status: true,
              },
            },
          },
          orderBy: { order_index: 'asc' },
        },
        _count: { select: { product_sales: true } },
      },
    });

    if (!sale) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Sale not found'), { status: 404 });
    }

    return NextResponse.json(mobileSuccess({ sale }), { status: 200 });
  } catch (e) {
    console.error('[Mobile sale GET]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to fetch sale'), { status: 500 });
  }
}

async function updateSale(request: NextRequest, params: Promise<{ id: string }>) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = updateSaleSchema.parse(body);

    const existingSale = await prisma.sales.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingSale) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Sale not found'), { status: 404 });
    }

    let slug: string | undefined;
    if (validatedData.slug !== undefined) {
      slug = generateSaleSlug(validatedData.slug);
      if (!slug) {
        return NextResponse.json(
          mobileError('VALIDATION_ERROR', 'Invalid sale slug. Use letters, numbers, and hyphens only.'),
          { status: 400 },
        );
      }
    } else if (validatedData.name) {
      slug = generateSaleSlug(validatedData.name);
      if (!slug) {
        return NextResponse.json(
          mobileError('VALIDATION_ERROR', 'Invalid sale name for slug generation.'),
          { status: 400 },
        );
      }
    }

    if (slug && slug !== existingSale.slug) {
      const slugConflict = await prisma.sales.findFirst({
        where: { tenant_id: tenantId, slug, id: { not: id } },
      });
      if (slugConflict) {
        return NextResponse.json(mobileError('CONFLICT', 'A sale with this slug already exists'), {
          status: 409,
        });
      }
    }

    const startDate = validatedData.start_date;
    const endDate = validatedData.end_date;
    const finalStartDate = startDate ?? existingSale.start_date;
    const finalEndDate = endDate ?? existingSale.end_date;

    if (finalStartDate && finalEndDate && finalStartDate >= finalEndDate) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'End date must be after start date', [
          { field: 'end_date', message: 'Must be after start date' },
        ]),
        { status: 400 },
      );
    }

    const sale = await prisma.sales.update({
      where: { id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(slug && { slug }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        ...(validatedData.banner_image !== undefined && { banner_image: validatedData.banner_image }),
        ...(validatedData.badge_text !== undefined && { badge_text: validatedData.badge_text }),
        ...(validatedData.badge_color !== undefined && { badge_color: validatedData.badge_color }),
        ...(startDate !== undefined && { start_date: startDate }),
        ...(endDate !== undefined && { end_date: endDate }),
        ...(validatedData.status !== undefined && { status: validatedData.status }),
        ...(validatedData.is_featured !== undefined && { is_featured: validatedData.is_featured }),
        ...(validatedData.metadata !== undefined && { metadata: validatedData.metadata }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(mobileSuccess({ sale }), { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          e.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile sale PUT]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to update sale'), { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateSale(request, ctx.params);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return updateSale(request, ctx.params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;
  const { id } = await params;

  try {
    const existingSale = await prisma.sales.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!existingSale) {
      return NextResponse.json(mobileError('NOT_FOUND', 'Sale not found'), { status: 404 });
    }

    await prisma.sales.delete({ where: { id } });

    return NextResponse.json(mobileSuccess({ message: 'Sale deleted successfully' }), { status: 200 });
  } catch (e) {
    console.error('[Mobile sale DELETE]', e);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to delete sale'), { status: 500 });
  }
}
