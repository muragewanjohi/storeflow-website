import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { mobileError, mobileSuccess } from '@/lib/api/mobile-response';
import { requireMobileTenantStaff, mobileTenantMustAllowWrites } from '@/lib/auth/mobile-dashboard-tenant';
import { ensureDefaultExpenseCategories, normalizeExpenseCategorySlug } from '@/lib/finance/expense-categories';

const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(80),
  slug: z.string().max(80).optional(),
  description: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const { tenantId } = gate.ctx;

  try {
    await ensureDefaultExpenseCategories(tenantId);
    const categories = await prisma.expense_categories.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json(mobileSuccess({ categories }), { status: 200 });
  } catch (error) {
    console.error('[Mobile expense categories GET]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to list expense categories'), { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMobileTenantStaff(request);
  if (!gate.ok) return gate.response;
  const forbid = mobileTenantMustAllowWrites(gate.ctx.tenant);
  if (forbid) return forbid;
  const { tenantId } = gate.ctx;

  try {
    const input = createExpenseCategorySchema.parse(await request.json());
    const slug = normalizeExpenseCategorySlug(input.slug || input.name);
    if (!slug) {
      return NextResponse.json(
        mobileError('VALIDATION_ERROR', 'Category slug is required', [
          { field: 'slug', message: 'Category slug is required' },
        ]),
        { status: 400 },
      );
    }

    const existing = await prisma.expense_categories.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (existing) {
      return NextResponse.json(mobileError('CONFLICT', 'An expense category with this slug already exists'), {
        status: 409,
      });
    }

    const category = await prisma.expense_categories.create({
      data: {
        tenant_id: tenantId,
        name: input.name,
        slug,
        description: input.description ?? null,
        is_default: false,
      },
    });

    return NextResponse.json(mobileSuccess({ category }), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        mobileError(
          'VALIDATION_ERROR',
          'Validation error',
          error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        ),
        { status: 400 },
      );
    }
    console.error('[Mobile expense categories POST]', error);
    return NextResponse.json(mobileError('INTERNAL_ERROR', 'Failed to create expense category'), { status: 500 });
  }
}
