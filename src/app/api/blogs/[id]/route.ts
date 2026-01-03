/**
 * Blog API Route (Individual)
 * 
 * Handles GET, PUT, and DELETE requests for individual blogs
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
 * Get a single blog by ID
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
        { error: 'Blog not found' },
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
 * Update a blog
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    // Check if tenant has edit access
    const { requireEditAccess } = await import('@/lib/tenant-context/access-control-server');
    await requireEditAccess();
    
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = updateBlogSchema.parse(body);

    // Check if blog exists
    const existingBlog = await prisma.blogs.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingBlog) {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Generate slug if title is being updated and slug is not provided
    let slug = validatedData.slug;
    if (validatedData.title && !validatedData.slug) {
      slug = generateSlug(validatedData.title);
      
      // Check if new slug conflicts with another blog
      const slugConflict = await prisma.blogs.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'A blog with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update blog
    const blog = await prisma.blogs.update({
      where: { id },
      data: {
        ...validatedData,
        ...(slug && { slug }),
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
 * Delete a blog
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    
    // Check if tenant has edit access
    const { requireEditAccess } = await import('@/lib/tenant-context/access-control-server');
    await requireEditAccess();
    
    const { id } = await params;

    // Check if blog exists
    const existingBlog = await prisma.blogs.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingBlog) {
      return NextResponse.json(
        { error: 'Blog not found' },
        { status: 404 }
      );
    }

    // Delete blog
    await prisma.blogs.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
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
