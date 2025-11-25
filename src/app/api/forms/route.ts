/**
 * Form Builders API Route
 * 
 * Handles GET (list forms) and POST (create form) requests
 * 
 * Day 27: Content Management - Form Builder
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createFormBuilderSchema, generateFormSlug } from '@/lib/forms/validation';

/**
 * GET /api/forms
 * 
 * List all form builders for the tenant
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Fetch forms with pagination
    const [forms, total] = await Promise.all([
      prisma.form_builders.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          status: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              form_submissions: true,
            },
          },
        },
      }),
      prisma.form_builders.count({ where }),
    ]);

    return NextResponse.json({
      forms,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch forms')
          : 'Failed to fetch forms'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/forms
 * 
 * Create a new form builder
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    // Validate request body
    const validatedData = createFormBuilderSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || generateFormSlug(validatedData.title);

    // Check if slug already exists for this tenant
    const existingForm = await prisma.form_builders.findFirst({
      where: {
        tenant_id: tenant.id,
        slug,
      },
    });

    if (existingForm) {
      return NextResponse.json(
        { error: 'A form with this slug already exists' },
        { status: 400 }
      );
    }

    // Create form
    const form = await prisma.form_builders.create({
      data: {
        tenant_id: tenant.id,
        title: validatedData.title,
        slug,
        description: validatedData.description || null,
        email: validatedData.email || null,
        button_text: validatedData.button_text || 'Submit',
        fields: validatedData.fields || [],
        success_message: validatedData.success_message || null,
        status: validatedData.status || 'active',
      },
    });

    return NextResponse.json(
      { form },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating form:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to create form')
          : 'Failed to create form'
      },
      { status: 500 }
    );
  }
}

