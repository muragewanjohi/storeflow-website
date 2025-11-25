/**
 * Page Detail API Route
 * 
 * Handles GET (get page), PUT (update page), and DELETE (delete page) requests
 * 
 * Day 27: Content Management - Pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updatePageSchema, generateSlug } from '@/lib/content/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pages/[id]
 * 
 * Get a single page by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const page = await prisma.pages.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error fetching page:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch page')
          : 'Failed to fetch page'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pages/[id]
 * 
 * Update a page
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
    const validatedData = updatePageSchema.parse(body);

    // Check if page exists and belongs to tenant
    const existingPage = await prisma.pages.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingPage) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Generate slug if title is being updated and slug is not provided
    let slug = validatedData.slug;
    if (validatedData.title && !slug) {
      slug = generateSlug(validatedData.title);
    } else if (!slug) {
      slug = existingPage.slug ?? undefined;
    }

    // Check if slug already exists for another page
    if (slug && slug !== existingPage.slug) {
      const slugExists = await prisma.pages.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A page with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update page
    const page = await prisma.pages.update({
      where: { id },
      data: {
        title: validatedData.title,
        slug: slug || undefined,
        content: validatedData.content !== undefined ? validatedData.content : undefined,
        banner_image: validatedData.banner_image !== undefined ? validatedData.banner_image : undefined,
        meta_title: validatedData.meta_title !== undefined ? validatedData.meta_title : undefined,
        meta_description: validatedData.meta_description !== undefined ? validatedData.meta_description : undefined,
        meta_tags: validatedData.meta_tags !== undefined ? validatedData.meta_tags : undefined,
        status: validatedData.status,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error updating page:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to update page')
          : 'Failed to update page'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pages/[id]
 * 
 * Delete a page
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Check if page exists and belongs to tenant
    const page = await prisma.pages.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!page) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Delete page
    await prisma.pages.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Page deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to delete page')
          : 'Failed to delete page'
      },
      { status: 500 }
    );
  }
}

