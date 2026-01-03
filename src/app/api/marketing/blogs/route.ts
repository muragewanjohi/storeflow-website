/**
 * Marketing Blogs API Route
 * 
 * Handles GET requests for marketing blogs (blogs with special marketing tenant_id)
 * These blogs appear on the main marketing website
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { blogQuerySchema } from '@/lib/content/validation';
import { MARKETING_TENANT_ID } from '@/lib/content/marketing';

/**
 * GET /api/marketing/blogs
 * 
 * List marketing blogs with search, filtering, and pagination
 * No authentication required - public endpoint for marketing website
 */
export async function GET(request: NextRequest) {
  try {
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
      status = 'published', // Default to published for marketing blogs
      category_id,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = validatedQuery;

    // Build where clause - only marketing blogs
    const where: any = {
      tenant_id: MARKETING_TENANT_ID,
    };

    // Only show published blogs on marketing site
    where.status = 'published';

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category_id) {
      where.category_id = category_id;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Optimize orderBy to use indexed columns
    const orderBy: any = {};
    orderBy[sort_by] = sort_order;

    // Fetch blogs with pagination
    const [blogs, total] = await Promise.all([
      prisma.blogs.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
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

    // Add cache control headers for public content
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

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
    console.error('Error fetching marketing blogs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch marketing blogs')
          : 'Failed to fetch marketing blogs'
      },
      { status: 500 }
    );
  }
}

