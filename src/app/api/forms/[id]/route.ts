/**
 * Form Builder Detail API Route
 * 
 * Handles GET (get form), PUT (update form), and DELETE (delete form) requests
 * 
 * Day 27: Content Management - Form Builder
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateFormBuilderSchema, generateFormSlug } from '@/lib/forms/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/forms/[id]
 * 
 * Get a single form builder by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;

    const form = await prisma.form_builders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        _count: {
          select: {
            form_submissions: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Error fetching form:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch form')
          : 'Failed to fetch form'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/forms/[id]
 * 
 * Update a form builder
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
    const validatedData = updateFormBuilderSchema.parse(body);

    // Check if form exists and belongs to tenant
    const existingForm = await prisma.form_builders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingForm) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Generate slug if title is being updated and slug is not provided
    let slug = validatedData.slug;
    if (validatedData.title && !slug) {
      slug = generateFormSlug(validatedData.title);
    } else if (!slug) {
      slug = existingForm.slug ?? undefined;
    }

    // Check if slug already exists for another form
    if (slug && slug !== existingForm.slug) {
      const slugExists = await prisma.form_builders.findFirst({
        where: {
          tenant_id: tenant.id,
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'A form with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Update form
    const form = await prisma.form_builders.update({
      where: { id },
      data: {
        title: validatedData.title,
        slug: slug || undefined,
        description: validatedData.description !== undefined ? validatedData.description : undefined,
        email: validatedData.email !== undefined ? validatedData.email : undefined,
        button_text: validatedData.button_text,
        fields: validatedData.fields,
        success_message: validatedData.success_message !== undefined ? validatedData.success_message : undefined,
        status: validatedData.status,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    console.error('Error updating form:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to update form')
          : 'Failed to update form'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/forms/[id]
 * 
 * Delete a form builder
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Check if form exists and belongs to tenant
    const form = await prisma.form_builders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        _count: {
          select: {
            form_submissions: true,
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    // Delete form (submissions will be cascade deleted)
    await prisma.form_builders.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Form deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting form:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to delete form')
          : 'Failed to delete form'
      },
      { status: 500 }
    );
  }
}

