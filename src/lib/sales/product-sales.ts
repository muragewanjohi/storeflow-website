import { prisma } from '@/lib/prisma/client';
import {
  addProductToSaleSchema,
  updateProductSaleSchema,
} from '@/lib/sales/validation';
import type { z } from 'zod';

export class SaleProductError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SaleProductError';
  }
}

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  sale_price: true,
  image: true,
  stock_quantity: true,
  status: true,
  category_id: true,
} as const;

export type SaleProductDto = {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    salePrice: number | null;
    image: string | null;
    stockQuantity: number | null;
    status: string | null;
    categoryId: string | null;
  };
  salePrice: number | null;
  discountPercent: number | null;
  orderIndex: number | null;
  createdAt: string | null;
};

function mapProductSaleRow(ps: {
  id: string;
  sale_price: unknown;
  discount_percent: unknown;
  order_index: number | null;
  created_at: Date | null;
  products: {
    id: string;
    name: string;
    slug: string | null;
    price: unknown;
    sale_price: unknown;
    image: string | null;
    stock_quantity: number | null;
    status: string | null;
    category_id?: string | null;
  };
}): SaleProductDto {
  return {
    id: ps.id,
    product: {
      id: ps.products.id,
      name: ps.products.name,
      slug: ps.products.slug ?? '',
      price: Number(ps.products.price),
      salePrice: ps.products.sale_price != null ? Number(ps.products.sale_price) : null,
      image: ps.products.image,
      stockQuantity: ps.products.stock_quantity,
      status: ps.products.status,
      categoryId: ps.products.category_id ?? null,
    },
    salePrice: ps.sale_price != null ? Number(ps.sale_price) : null,
    discountPercent: ps.discount_percent != null ? Number(ps.discount_percent) : null,
    orderIndex: ps.order_index,
    createdAt: ps.created_at?.toISOString() ?? null,
  };
}

async function assertSale(tenantId: string, saleId: string) {
  const sale = await prisma.sales.findFirst({
    where: { id: saleId, tenant_id: tenantId },
  });
  if (!sale) {
    throw new SaleProductError('Sale not found', 404);
  }
  return sale;
}

export async function listSaleProducts(tenantId: string, saleId: string): Promise<SaleProductDto[]> {
  await assertSale(tenantId, saleId);

  const rows = await prisma.product_sales.findMany({
    where: { sale_id: saleId, tenant_id: tenantId },
    include: { products: { select: productSelect } },
    orderBy: { order_index: 'asc' },
  });

  return rows.map(mapProductSaleRow);
}

function computeDiscountPercent(regularPrice: number, salePrice: number | null | undefined) {
  if (salePrice == null) return null;
  if (salePrice < regularPrice && regularPrice > 0) {
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }
  return null;
}

export async function addProductToSale(
  tenantId: string,
  saleId: string,
  input: z.infer<typeof addProductToSaleSchema>,
): Promise<SaleProductDto> {
  await assertSale(tenantId, saleId);

  const product = await prisma.products.findFirst({
    where: { id: input.product_id, tenant_id: tenantId },
  });

  if (!product) {
    throw new SaleProductError('Product not found', 404);
  }

  const existing = await prisma.product_sales.findFirst({
    where: {
      tenant_id: tenantId,
      sale_id: saleId,
      product_id: input.product_id,
    },
  });

  if (existing) {
    throw new SaleProductError('Product is already in this sale', 400);
  }

  const discountPercent = computeDiscountPercent(Number(product.price), input.sale_price);

  const maxOrder = await prisma.product_sales.findFirst({
    where: { sale_id: saleId, tenant_id: tenantId },
    orderBy: { order_index: 'desc' },
    select: { order_index: true },
  });

  const orderIndex =
    input.order_index ??
    (maxOrder?.order_index != null ? maxOrder.order_index + 1 : 0);

  const created = await prisma.product_sales.create({
    data: {
      tenant_id: tenantId,
      sale_id: saleId,
      product_id: input.product_id,
      sale_price: input.sale_price ?? null,
      discount_percent: discountPercent,
      order_index: orderIndex,
    },
    include: { products: { select: productSelect } },
  });

  return mapProductSaleRow(created);
}

export async function updateSaleProduct(
  tenantId: string,
  saleId: string,
  productId: string,
  input: z.infer<typeof updateProductSaleSchema>,
): Promise<SaleProductDto> {
  await assertSale(tenantId, saleId);

  const existing = await prisma.product_sales.findFirst({
    where: { tenant_id: tenantId, sale_id: saleId, product_id: productId },
    include: { products: true },
  });

  if (!existing) {
    throw new SaleProductError('Product is not in this sale', 404);
  }

  let discountPercent =
    existing.discount_percent != null ? Number(existing.discount_percent) : null;

  if (input.sale_price !== undefined) {
    discountPercent = computeDiscountPercent(Number(existing.products.price), input.sale_price);
  }

  const updated = await prisma.product_sales.update({
    where: { id: existing.id },
    data: {
      ...(input.sale_price !== undefined && { sale_price: input.sale_price }),
      ...(input.sale_price !== undefined && { discount_percent: discountPercent }),
      ...(input.order_index !== undefined && { order_index: input.order_index }),
    },
    include: { products: { select: productSelect } },
  });

  return mapProductSaleRow(updated);
}

export async function removeProductFromSale(
  tenantId: string,
  saleId: string,
  productId: string,
): Promise<void> {
  await assertSale(tenantId, saleId);

  const row = await prisma.product_sales.findFirst({
    where: { tenant_id: tenantId, sale_id: saleId, product_id: productId },
  });

  if (!row) {
    throw new SaleProductError('Product is not in this sale', 404);
  }

  await prisma.product_sales.delete({ where: { id: row.id } });
}

/** Web JSON shape (snake_case) */
export function saleProductToWebJson(dto: SaleProductDto) {
  return {
    id: dto.id,
    product: {
      id: dto.product.id,
      name: dto.product.name,
      slug: dto.product.slug,
      price: dto.product.price,
      sale_price: dto.product.salePrice,
      image: dto.product.image,
      stock_quantity: dto.product.stockQuantity,
      status: dto.product.status,
      category_id: dto.product.categoryId,
    },
    sale_price: dto.salePrice,
    discount_percent: dto.discountPercent,
    order_index: dto.orderIndex,
    created_at: dto.createdAt,
  };
}
