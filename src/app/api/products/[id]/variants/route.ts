/**
 * Product Variants API Route
 * 
 * Handles GET (list variants) and POST (create variant) requests
 * 
 * Day 15: Product Model & API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';
import { generateSKU } from '@/lib/products/validation';
import type { Prisma } from '@prisma/client';

const variantAttributeSchema = z.object({
  attribute_id: z.string().uuid(),
  attribute_value_id: z.string().uuid(),
});

const createVariantSchema = z.object({
  // Legacy single attribute (for backward compatibility)
  attribute_id: z.string().uuid().optional().nullable(),
  attribute_value_id: z.string().uuid().optional().nullable(),
  // New: Multiple attributes array
  attributes: z.array(variantAttributeSchema).optional(),
  price: z.number().positive().optional().nullable().or(z.string().transform((val) => parseFloat(val)).optional().nullable()),
  stock_quantity: z.number().int().min(0).default(0).optional(),
  sku: z.string().max(100).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

const updateVariantSchema = createVariantSchema.partial();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/products/[id]/variants
 * 
 * List all variants for a product
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    // Verify product exists and belongs to tenant
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

    const variants = await prisma.product_variants.findMany({
      where: {
        product_id: id,
        tenant_id: tenant.id,
      },
      include: {
        product_variant_attributes: {
          include: {
            attributes: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            attribute_values: {
              select: {
                id: true,
                value: true,
                color_code: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Error fetching variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/variants
 * 
 * Create a new variant for a product
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = createVariantSchema.parse(body);

    // Verify product exists and belongs to tenant
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

    // Generate SKU if not provided
    const sku = validatedData.sku || generateSKU(product.name, tenant.id);

    // Check if SKU already exists for this tenant
    const existingSKU = await prisma.product_variants.findFirst({
      where: {
        tenant_id: tenant.id,
        sku,
      },
    });

    if (existingSKU) {
      // Regenerate SKU if collision
      const newSKU = generateSKU(product.name, tenant.id);
      validatedData.sku = newSKU;
    } else {
      validatedData.sku = sku;
    }

    // Determine which attributes to use
    let attributesToCreate: Array<{ attribute_id: string; attribute_value_id: string }> = [];
    
    if (validatedData.attributes && validatedData.attributes.length > 0) {
      // Use new multiple attributes format
      attributesToCreate = validatedData.attributes;
    } else if (validatedData.attribute_id && validatedData.attribute_value_id) {
      // Use legacy single attribute format (for backward compatibility)
      attributesToCreate = [{
        attribute_id: validatedData.attribute_id,
        attribute_value_id: validatedData.attribute_value_id,
      }];
    }

    // Create variant with attributes in a transaction
    const variant = await (prisma.$transaction as any)(async (tx: Prisma.TransactionClient) => {
      // Create the variant
      const newVariant = await tx.product_variants.create({
        data: {
          tenant_id: tenant.id,
          product_id: id,
          // Keep legacy fields for backward compatibility
          attribute_id: validatedData.attribute_id || null,
          attribute_value_id: validatedData.attribute_value_id || null,
          price: validatedData.price || null,
          stock_quantity: validatedData.stock_quantity || 0,
          sku: validatedData.sku || null,
          image: validatedData.image || null,
        },
      });

      // Create variant attributes if provided
      if (attributesToCreate.length > 0) {
        await tx.product_variant_attributes.createMany({
          data: attributesToCreate.map((attr) => ({
            tenant_id: tenant.id,
            variant_id: newVariant.id,
            attribute_id: attr.attribute_id,
            attribute_value_id: attr.attribute_value_id,
          })),
        });
      }

      // Fetch the complete variant with attributes
      return await tx.product_variants.findUnique({
        where: { id: newVariant.id },
        include: {
          product_variant_attributes: {
            include: {
              attributes: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              attribute_values: {
                select: {
                  id: true,
                  value: true,
                  color_code: true,
                },
              },
            },
          },
        },
      });
    });

    // Sync product-level stock after creating variant
    // Product-level stock should equal sum of all variant stocks
    const { syncProductStockFromVariants } = await import('@/lib/inventory/sync-product-stock');
    await syncProductStockFromVariants(id, tenant.id).catch((err) => {
      console.error('Error syncing product stock after variant creation:', err);
    });

    return NextResponse.json(
      { variant },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating variant:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create variant' },
      { status: 500 }
    );
  }
}

