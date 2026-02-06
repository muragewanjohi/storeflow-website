/**
 * User Guide Categories API Route
 * 
 * Handles GET (list categories) and POST (create category) requests
 * Landlord admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  slug: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  bg_color: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

/**
 * GET /api/admin/user-guide/categories
 * List all user guide categories
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const categories = await prisma.user_guide_categories.findMany({
      include: {
        articles: {
          where: { is_active: true },
          orderBy: { sort_order: 'asc' },
        },
      },
      orderBy: {
        sort_order: 'asc',
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user guide categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/user-guide/categories
 * Create a new user guide category
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const validatedData = createCategorySchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if slug already exists
    const existing = await prisma.user_guide_categories.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.user_guide_categories.create({
      data: {
        name: validatedData.name,
        slug,
        icon: validatedData.icon,
        color: validatedData.color,
        bg_color: validatedData.bg_color,
        sort_order: validatedData.sort_order,
        is_active: validatedData.is_active,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating user guide category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
