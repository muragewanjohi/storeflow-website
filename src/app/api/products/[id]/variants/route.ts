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

const createVariantSchema = z.object({
  attribute_id: z.string().uuid().optional().nullable(),
  attribute_value_id: z.string().uuid().optional().nullable(),
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

    // Create variant
    const variant = await prisma.product_variants.create({
      data: {
        tenant_id: tenant.id,
        product_id: id,
        attribute_id: validatedData.attribute_id || null,
        attribute_value_id: validatedData.attribute_value_id || null,
        price: validatedData.price || null,
        stock_quantity: validatedData.stock_quantity || 0,
        sku: validatedData.sku || null,
        image: validatedData.image || null,
      },
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

