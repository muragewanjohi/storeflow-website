import { prisma } from '@/lib/prisma/client';

export const defaultExpenseCategories = [
  { name: 'Ads & Marketing', slug: 'ads_marketing' },
  { name: 'Shipping & Fulfillment', slug: 'shipping_fulfillment' },
  { name: 'Packaging', slug: 'packaging' },
  { name: 'Software & Apps', slug: 'software_apps' },
  { name: 'Salaries & Contractors', slug: 'salaries_contractors' },
  { name: 'Rent & Utilities', slug: 'rent_utilities' },
  { name: 'Miscellaneous', slug: 'misc' },
] as const;

export const defaultExpenseCategorySlugs = defaultExpenseCategories.map((category) => category.slug);

export class ExpenseCategoryValidationError extends Error {
  constructor(
    message: string,
    public readonly field: 'category' | 'category_id',
  ) {
    super(message);
    this.name = 'ExpenseCategoryValidationError';
  }
}

export function normalizeExpenseCategorySlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export async function ensureDefaultExpenseCategories(tenantId: string) {
  await Promise.all(
    defaultExpenseCategories.map((category) =>
      prisma.expense_categories.upsert({
        where: {
          tenant_id_slug: {
            tenant_id: tenantId,
            slug: category.slug,
          },
        },
        update: {},
        create: {
          tenant_id: tenantId,
          name: category.name,
          slug: category.slug,
          is_default: true,
        },
      }),
    ),
  );
}

export async function resolveExpenseCategoryForTenant(
  tenantId: string,
  input: { category_id?: string | null; category?: string | null },
  options: { required: boolean },
) {
  if (input.category_id) {
    const category = await prisma.expense_categories.findFirst({
      where: { id: input.category_id, tenant_id: tenantId },
    });
    if (!category) {
      throw new ExpenseCategoryValidationError('Expense category not found', 'category_id');
    }
    return { category_id: category.id, category: category.slug };
  }

  if (input.category) {
    const slug = normalizeExpenseCategorySlug(input.category);
    if (!slug) {
      throw new ExpenseCategoryValidationError('Expense category is required', 'category');
    }

    const category = await prisma.expense_categories.findFirst({
      where: { tenant_id: tenantId, slug },
    });
    if (category) {
      return { category_id: category.id, category: category.slug };
    }

    if (defaultExpenseCategorySlugs.includes(slug as (typeof defaultExpenseCategorySlugs)[number])) {
      return { category_id: null, category: slug };
    }

    throw new ExpenseCategoryValidationError('Expense category not found. Create it first or pass a valid category_id.', 'category');
  }

  if (options.required) {
    throw new ExpenseCategoryValidationError('Expense category is required', 'category');
  }

  return {};
}

export function formatExpense(expense: any) {
  const categoryDetails = expense.expense_categories
    ? {
        id: expense.expense_categories.id,
        name: expense.expense_categories.name,
        slug: expense.expense_categories.slug,
        description: expense.expense_categories.description,
        is_default: expense.expense_categories.is_default,
      }
    : null;

  const { expense_categories: _expenseCategories, ...rest } = expense;

  return {
    ...rest,
    amount: Number(expense.amount),
    tax_amount: expense.tax_amount != null ? Number(expense.tax_amount) : null,
    category_details: categoryDetails,
  };
}
