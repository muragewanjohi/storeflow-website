/**
 * Blogs API Route
 * 
 * Handles GET (list blogs) and POST (create blog) requests
 * Full CRUD with validation, search, filtering, and pagination
 * 
 * Day 27: Content Management - Blogs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createBlogSchema, blogQuerySchema, generateSlug } from '@/lib/content/validation';
import { canCreateBlog } from '@/lib/subscriptions/limits';

/**
 * GET /api/blogs
 * 
 * List blogs with search, filtering, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'page' || key === 'limit') {
        queryParams[key] = parseInt(value, 10) || (key === 'page' ? 1 : 20);
      } else {
        queryParams[key] = value;
      }
    }

    const validatedQuery = blogQuerySchema.parse(queryParams);

    const {
      page = 1,
      limit = 20,
      search,
      status,
      category_id,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = validatedQuery;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Category filter
    if (category_id) {
      where.category_id = category_id;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch blogs with pagination
    const [blogs, total] = await Promise.all([
      prisma.blogs.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sort_by]: sort_order,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          image: true,
          status: true,
          category_id: true,
          created_at: true,
          updated_at: true,
          blog_categories: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.blogs.count({ where }),
    ]);

    // Add cache control headers to prevent caching
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, max-age=0');

    return NextResponse.json(
      {
        blogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching blogs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch blogs')
          : 'Failed to fetch blogs'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blogs
 * 
 * Create a new blog post
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    // Validate request body
    const validatedData = createBlogSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.title);

    // Check if slug already exists for this tenant
    const existingBlog = await prisma.blogs.findFirst({
      where: {
        tenant_id: tenant.id,
        slug,
      },
    });

    if (existingBlog) {
      return NextResponse.json(
        { error: 'A blog post with this slug already exists' },
        { status: 400 }
      );
    }

    // Check plan limits before creating blog
    const limitCheck = await canCreateBlog(tenant);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Blog limit reached' },
        { status: 403 }
      );
    }

    // Create blog
    const blog = await prisma.blogs.create({
      data: {
        tenant_id: tenant.id,
        title: validatedData.title,
        slug,
        content: validatedData.content || null,
        excerpt: validatedData.excerpt || null,
        category_id: validatedData.category_id || null,
        image: validatedData.image || null,
        meta_title: validatedData.meta_title || null,
        meta_description: validatedData.meta_description || null,
        meta_tags: validatedData.meta_tags || null,
        status: validatedData.status || 'draft',
      },
      include: {
        blog_categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(
      { blog },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating blog:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to create blog')
          : 'Failed to create blog'
      },
      { status: 500 }
    );
  }
}

