/**
 * Product Sales API Route
 * 
 * Handles product assignment to sales
 * - GET: List products in sale
 * - POST: Add product to sale
 * - PUT: Update product sale price/order
 * - DELETE: Remove product from sale
 * 
 * Phase 2: Backend API - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { addProductToSaleSchema, updateProductSaleSchema } from '@/lib/sales/validation';
import { z } from 'zod';

/**
 * GET /api/dashboard/sales/:id/products
 * 
 * List all products in a sale
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id: saleId } = await params;

    // Check if sale exists and belongs to tenant
    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        tenant_id: tenant.id,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Get products in sale
    const productSales = await prisma.product_sales.findMany({
      where: {
        sale_id: saleId,
        tenant_id: tenant.id,
      },
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
            category_id: true,
          },
        },
      },
      orderBy: {
        order_index: 'asc',
      },
    });

    return NextResponse.json({
      products: productSales.map((ps) => ({
        id: ps.id,
        product: ps.products,
        sale_price: ps.sale_price ? Number(ps.sale_price) : null,
        discount_percent: ps.discount_percent ? Number(ps.discount_percent) : null,
        order_index: ps.order_index,
        created_at: ps.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching sale products:', error);

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch sale products')
          : 'Failed to fetch sale products'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/sales/:id/products
 * 
 * Add a product to a sale
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id: saleId } = await params;
    const body = await request.json();
    const validatedData = addProductToSaleSchema.parse(body);

    // Check if sale exists and belongs to tenant
    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        tenant_id: tenant.id,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Check if product exists and belongs to tenant
    const product = await prisma.products.findFirst({
      where: {
        id: validatedData.product_id,
        tenant_id: tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product is already in sale
    const existingProductSale = await prisma.product_sales.findFirst({
      where: {
        tenant_id: tenant.id,
        sale_id: saleId,
        product_id: validatedData.product_id,
      },
    });

    if (existingProductSale) {
      return NextResponse.json(
        { error: 'Product is already in this sale' },
        { status: 400 }
      );
    }

    // Calculate discount percentage if sale_price is provided
    let discountPercent: number | null = null;
    if (validatedData.sale_price) {
      const regularPrice = Number(product.price);
      const salePrice = validatedData.sale_price;
      if (salePrice < regularPrice && regularPrice > 0) {
        discountPercent = Math.round(((regularPrice - salePrice) / regularPrice) * 100);
      }
    }

    // Get max order_index for this sale to append new product
    const maxOrder = await prisma.product_sales.findFirst({
      where: {
        sale_id: saleId,
        tenant_id: tenant.id,
      },
      orderBy: {
        order_index: 'desc',
      },
      select: {
        order_index: true,
      },
    });

    const orderIndex = validatedData.order_index ?? (maxOrder && maxOrder.order_index !== null ? maxOrder.order_index + 1 : 0);

    // Create product sale
    const productSale = await prisma.product_sales.create({
      data: {
        tenant_id: tenant.id,
        sale_id: saleId,
        product_id: validatedData.product_id,
        sale_price: validatedData.sale_price || null,
        discount_percent: discountPercent,
        order_index: orderIndex,
      },
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
    });

    return NextResponse.json(
      {
        product_sale: {
          id: productSale.id,
          product: productSale.products,
          sale_price: productSale.sale_price ? Number(productSale.sale_price) : null,
          discount_percent: productSale.discount_percent ? Number(productSale.discount_percent) : null,
          order_index: productSale.order_index,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding product to sale:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to add product to sale')
          : 'Failed to add product to sale'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/sales/:id/products
 * 
 * Update product sale price or order index
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id: saleId } = await params;
    const body = await request.json();
    const { product_id, ...updateData } = body;

    if (!product_id) {
      return NextResponse.json(
        { error: 'product_id is required' },
        { status: 400 }
      );
    }

    const validatedData = updateProductSaleSchema.parse(updateData);

    // Check if sale exists and belongs to tenant
    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        tenant_id: tenant.id,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Check if product sale exists
    const existingProductSale = await prisma.product_sales.findFirst({
      where: {
        tenant_id: tenant.id,
        sale_id: saleId,
        product_id,
      },
      include: {
        products: true,
      },
    });

    if (!existingProductSale) {
      return NextResponse.json(
        { error: 'Product is not in this sale' },
        { status: 404 }
      );
    }

    // Calculate discount percentage if sale_price is being updated
    let discountPercent: number | null = existingProductSale.discount_percent ? Number(existingProductSale.discount_percent) : null;
    if (validatedData.sale_price !== undefined) {
      const regularPrice = Number(existingProductSale.products.price);
      const salePrice = validatedData.sale_price;
      if (salePrice && salePrice < regularPrice && regularPrice > 0) {
        discountPercent = Math.round(((regularPrice - salePrice) / regularPrice) * 100);
      } else {
        discountPercent = null; // Clear discount if sale price is not less than regular price
      }
    }

    // Update product sale
    const productSale = await prisma.product_sales.update({
      where: {
        id: existingProductSale.id,
      },
      data: {
        ...(validatedData.sale_price !== undefined && { sale_price: validatedData.sale_price }),
        ...(discountPercent !== undefined && { discount_percent: discountPercent }),
        ...(validatedData.order_index !== undefined && { order_index: validatedData.order_index }),
      },
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
    });

    return NextResponse.json({
      product_sale: {
        id: productSale.id,
        product: productSale.products,
        sale_price: productSale.sale_price ? Number(productSale.sale_price) : null,
        discount_percent: productSale.discount_percent ? Number(productSale.discount_percent) : null,
        order_index: productSale.order_index,
      },
    });
  } catch (error) {
    console.error('Error updating product sale:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to update product sale')
          : 'Failed to update product sale'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/sales/:id/products
 * 
 * Remove a product from a sale
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id: saleId } = await params;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json(
        { error: 'product_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if sale exists and belongs to tenant
    const sale = await prisma.sales.findFirst({
      where: {
        id: saleId,
        tenant_id: tenant.id,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Find and delete product sale
    const productSale = await prisma.product_sales.findFirst({
      where: {
        tenant_id: tenant.id,
        sale_id: saleId,
        product_id: productId,
      },
    });

    if (!productSale) {
      return NextResponse.json(
        { error: 'Product is not in this sale' },
        { status: 404 }
      );
    }

    await prisma.product_sales.delete({
      where: { id: productSale.id },
    });

    return NextResponse.json(
      { message: 'Product removed from sale successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing product from sale:', error);

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to remove product from sale')
          : 'Failed to remove product from sale'
      },
      { status: 500 }
    );
  }
}
