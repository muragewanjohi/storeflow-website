/**
 * Product Detail API Route
 * 
 * Handles GET (get product), PUT (update product), and DELETE (delete product) requests
 * 
 * Day 15: Product Model & API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateProductSchema, generateSlug } from '@/lib/products/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]
 * 
 * Get product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const product = await prisma.products.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        product_variants: {
          select: {
            id: true,
            attribute_id: true,
            attribute_value_id: true,
            price: true,
            stock_quantity: true,
            sku: true,
            image: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // stock_quantity is already synced with variant totals in the database
    return NextResponse.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to fetch product'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]
 * 
 * Update product
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Log the incoming body for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Product update body:', JSON.stringify(body, null, 2));
    }

    // Validate request body (strips unknown fields)
    const validatedData = updateProductSchema.parse(body);

    // Check if product exists and belongs to tenant
    const existingProduct = await prisma.products.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Generate slug if name is being updated
    let slug = existingProduct.slug;
    if (validatedData.name && validatedData.name !== existingProduct.name) {
      slug = validatedData.slug || generateSlug(validatedData.name);
      
      // Check if new slug already exists
      const slugExists = await prisma.products.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A product with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (slug !== existingProduct.slug) updateData.slug = slug;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.short_description !== undefined) updateData.short_description = validatedData.short_description;
    if (validatedData.price !== undefined) updateData.price = validatedData.price;
    if (validatedData.sale_price !== undefined) updateData.sale_price = validatedData.sale_price;
    if (validatedData.sku !== undefined) updateData.sku = validatedData.sku;
    if (validatedData.stock_quantity !== undefined) updateData.stock_quantity = validatedData.stock_quantity;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.image !== undefined) updateData.image = validatedData.image;
    if (validatedData.gallery !== undefined) updateData.gallery = validatedData.gallery;
    if (validatedData.category_id !== undefined) updateData.category_id = validatedData.category_id;
    if (validatedData.brand_id !== undefined) updateData.brand_id = validatedData.brand_id;
    if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata;

    // Update product
    const product = await prisma.products.update({
      where: { id },
      data: updateData,
      // Note: Direct category relation via category_id
    });

    return NextResponse.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to update product'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * 
 * Delete product
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Check if product exists and belongs to tenant
    const product = await prisma.products.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete product (cascade will handle related records)
    await prisma.products.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to delete product'
      },
      { status: 500 }
    );
  }
}

