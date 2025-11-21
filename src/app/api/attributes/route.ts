/**
 * Attributes API Route
 * 
 * Handles GET (list attributes) and POST (create attribute) requests
 * Used for product variant attributes (e.g., Size, Color, Weight)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createAttributeSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().max(255).optional().nullable(),
  type: z.enum(['color', 'size', 'text', 'number']).optional().nullable(),
});

/**
 * GET /api/attributes
 * 
 * List all attributes for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    const attributes = await prisma.attributes.findMany({
      where: {
        tenant_id: tenant.id,
      },
      include: {
        attribute_values: {
          orderBy: {
            value: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error('Error fetching attributes:', error);

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
          : 'Failed to fetch attributes'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/attributes
 * 
 * Create a new attribute
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    const validatedData = createAttributeSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const attribute = await prisma.attributes.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        slug,
        type: validatedData.type || null,
      },
      include: {
        attribute_values: true,
      },
    });

    return NextResponse.json(
      { attribute },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating attribute:', error);

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
          : 'Failed to create attribute'
      },
      { status: 500 }
    );
  }
}

