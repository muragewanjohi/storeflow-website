import { createProductSchema } from '@/lib/products/validation';

describe('createProductSchema', () => {
  it('allows a quick product without a category', () => {
    const result = createProductSchema.safeParse({
      name: 'Leather handbag',
      price: 2500,
      stock_quantity: 1,
      status: 'active',
    });

    expect(result.success).toBe(true);
  });

  it('validates a category when one is supplied', () => {
    const result = createProductSchema.safeParse({
      name: 'Leather handbag',
      price: 2500,
      category_id: 'not-a-category-id',
    });

    expect(result.success).toBe(false);
  });
});
