/**
 * Attribute Values API Route
 * 
 * Handles GET (list values) and POST (create value) for a specific attribute
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createAttributeValueSchema = z.object({
  value: z.string().min(1).max(255),
  color_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  // Note: Images are stored at variant level, not attribute value level
  // This keeps attributes reusable across products
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/attributes/[id]/values
 * 
 * List all values for an attribute
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    // Verify attribute exists and belongs to tenant
    const attribute = await prisma.attributes.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: 'Attribute not found' },
        { status: 404 }
      );
    }

    const values = await prisma.attribute_values.findMany({
      where: {
        attribute_id: id,
        tenant_id: tenant.id,
      },
      orderBy: {
        value: 'asc',
      },
    });

    return NextResponse.json({ values });
  } catch (error) {
    console.error('Error fetching attribute values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribute values' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attributes/[id]/values
 * 
 * Create a new value for an attribute
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

    const validatedData = createAttributeValueSchema.parse(body);

    // Verify attribute exists and belongs to tenant
    const attribute = await prisma.attributes.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!attribute) {
      return NextResponse.json(
        { error: 'Attribute not found' },
        { status: 404 }
      );
    }

    const value = await prisma.attribute_values.create({
      data: {
        tenant_id: tenant.id,
        attribute_id: id,
        value: validatedData.value,
        color_code: validatedData.color_code || null,
        // Note: image field exists in schema but should not be used
        // Variant images are stored in product_variants.image
      },
    });

    return NextResponse.json(
      { value },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating attribute value:', error);

    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create attribute value' },
      { status: 500 }
    );
  }
}

