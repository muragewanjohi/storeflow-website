/**
 * Blog Detail API Route
 * 
 * Handles GET (get blog), PUT (update blog), and DELETE (delete blog) requests
 * 
 * Day 27: Content Management - Blogs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateBlogSchema, generateSlug } from '@/lib/content/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/blogs/[id]
 * 
 * Get a single blog post by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const blog = await prisma.blogs.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
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

    if (!blog) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ blog });
  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch blog')
          : 'Failed to fetch blog'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blogs/[id]
 * 
 * Update a blog post
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

    // Validate request body
    const validatedData = updateBlogSchema.parse(body);

    // Check if blog exists and belongs to tenant
    const existingBlog = await prisma.blogs.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingBlog) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Generate slug if title is being updated and slug is not provided
    let slug = validatedData.slug;
    if (validatedData.title && !slug) {
      slug = generateSlug(validatedData.title);
    } else if (!slug) {
      slug = existingBlog.slug ?? undefined;
    }

    // Check if slug already exists for another blog
    if (slug && slug !== existingBlog.slug) {
      const slugExists = await prisma.blogs.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A blog post with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update blog
    const blog = await prisma.blogs.update({
      where: { id },
      data: {
        title: validatedData.title,
        slug: slug || undefined,
        content: validatedData.content !== undefined ? validatedData.content : undefined,
        excerpt: validatedData.excerpt !== undefined ? validatedData.excerpt : undefined,
        category_id: validatedData.category_id !== undefined ? validatedData.category_id : undefined,
        image: validatedData.image !== undefined ? validatedData.image : undefined,
        meta_title: validatedData.meta_title !== undefined ? validatedData.meta_title : undefined,
        meta_description: validatedData.meta_description !== undefined ? validatedData.meta_description : undefined,
        meta_tags: validatedData.meta_tags !== undefined ? validatedData.meta_tags : undefined,
        status: validatedData.status,
        updated_at: new Date(),
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

    return NextResponse.json({ blog });
  } catch (error) {
    console.error('Error updating blog:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to update blog')
          : 'Failed to update blog'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blogs/[id]
 * 
 * Delete a blog post
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Check if blog exists and belongs to tenant
    const blog = await prisma.blogs.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!blog) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Delete blog
    await prisma.blogs.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Blog post deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to delete blog')
          : 'Failed to delete blog'
      },
      { status: 500 }
    );
  }
}

