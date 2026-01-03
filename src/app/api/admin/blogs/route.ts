/**
 * Admin Blogs API Route
 * 
 * Handles POST requests for creating blogs (admin can create for any tenant)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createBlogSchema, generateSlug } from '@/lib/content/validation';
import { MARKETING_TENANT_ID, isMarketingBlog } from '@/lib/content/marketing';

/**
 * POST /api/admin/blogs
 * 
 * Create a new blog (admin can specify tenant_id)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only landlords can create blogs via admin API
    if (user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();

    // Auto-detect tenant_id: use from user if tenant user, or require from body if landlord
    let tenantId: string;
    
    if (user.tenant_id) {
      // Tenant user: use their tenant_id
      tenantId = user.tenant_id;
    } else {
      // Landlord: tenant_id must be provided in request body (can be marketing or regular tenant)
      if (!body.tenant_id) {
        return NextResponse.json(
          { error: 'tenant_id is required for landlords' },
          { status: 400 }
        );
      }
      tenantId = body.tenant_id;
    }
    
    // Validate request body (tenant_id is optional in schema since we handle it above)
    const adminBlogSchema = createBlogSchema.extend({
      tenant_id: z.string().uuid('Invalid tenant ID').optional(),
    });
    
    const validatedData = adminBlogSchema.parse(body);

    // Verify tenant exists (skip for marketing blogs)
    if (!isMarketingBlog(tenantId)) {
      const tenant = await prisma.tenants.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
    }

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.title);

    // Check if slug already exists for this tenant
    const existingBlog = await prisma.blogs.findFirst({
      where: {
        tenant_id: tenantId,
        slug,
      },
    });

    if (existingBlog) {
      return NextResponse.json(
        { error: 'A blog with this slug already exists for this tenant' },
        { status: 400 }
      );
    }

    // Create blog
    const blog = await prisma.blogs.create({
      data: {
        tenant_id: tenantId,
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

