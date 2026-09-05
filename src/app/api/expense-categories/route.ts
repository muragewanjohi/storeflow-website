import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { ensureDefaultExpenseCategories, normalizeExpenseCategorySlug } from '@/lib/finance/expense-categories';

const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(80),
  slug: z.string().max(80).optional(),
  description: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    await ensureDefaultExpenseCategories(tenant.id);

    const categories = await prisma.expense_categories.findMany({
      where: { tenant_id: tenant.id },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: { categories } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch expense categories' } },
      { status: error.status || 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const tenant = await requireTenant();
    const input = createExpenseCategorySchema.parse(await request.json());
    const slug = normalizeExpenseCategorySlug(input.slug || input.name);

    if (!slug) {
      return NextResponse.json(
        { success: false, error: { message: 'Category slug is required' } },
        { status: 400 },
      );
    }

    const existing = await prisma.expense_categories.findFirst({
      where: { tenant_id: tenant.id, slug },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { message: 'An expense category with this slug already exists' } },
        { status: 409 },
      );
    }

    const category = await prisma.expense_categories.create({
      data: {
        tenant_id: tenant.id,
        name: input.name,
        slug,
        description: input.description ?? null,
        is_default: false,
      },
    });

    return NextResponse.json({ success: true, data: { category } }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: 'Validation error', details: error.issues } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create expense category' } },
      { status: error.status || 500 },
    );
  }
}
