/**
 * User Guide Articles API Route
 * 
 * Handles GET (list articles) and POST (create article) requests
 * Landlord admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createArticleSchema = z.object({
  category_id: z.string().uuid('Invalid category ID'),
  title: z.string().min(1, 'Article title is required'),
  slug: z.string().optional(),
  content: z.string().min(1, 'Article content is required'),
  image: z.string().optional(),
  image_alt: z.string().optional(),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
  is_popular: z.boolean().optional().default(false),
});

/**
 * GET /api/admin/user-guide/articles
 * List all user guide articles
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');

    const where: any = {};
    if (categoryId) {
      where.category_id = categoryId;
    }

    const articles = await prisma.user_guide_articles.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [
        { category: { sort_order: 'asc' } },
        { sort_order: 'asc' },
      ],
    });

    return NextResponse.json({ articles }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching user guide articles:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/user-guide/articles
 * Create a new user guide article
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const validatedData = createArticleSchema.parse(body);

    // Verify category exists
    const category = await prisma.user_guide_categories.findUnique({
      where: { id: validatedData.category_id },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Generate slug if not provided
    const slug = validatedData.slug || validatedData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if slug already exists
    const existing = await prisma.user_guide_articles.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An article with this slug already exists' },
        { status: 400 }
      );
    }

    const article = await prisma.user_guide_articles.create({
      data: {
        category_id: validatedData.category_id,
        title: validatedData.title,
        slug,
        content: validatedData.content,
        image: validatedData.image,
        image_alt: validatedData.image_alt,
        sort_order: validatedData.sort_order,
        is_active: validatedData.is_active,
        is_popular: validatedData.is_popular,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating user guide article:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create article' },
      { status: 500 }
    );
  }
}
