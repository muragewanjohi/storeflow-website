/**
 * Form Submissions API Route
 * 
 * Handles GET requests for listing form submissions
 * 
 * Day 27: Content Management - Form Builder
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/forms/[id]/submissions
 * 
 * List all submissions for a form
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Check if form exists and belongs to tenant
    const form = await prisma.form_builders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      );
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Fetch submissions with pagination
    const [submissions, total] = await Promise.all([
      prisma.form_submissions.findMany({
        where: {
          form_id: id,
          tenant_id: tenant.id,
        },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          data: true,
          ip_address: true,
          created_at: true,
        },
      }),
      prisma.form_submissions.count({
        where: {
          form_id: id,
          tenant_id: tenant.id,
        },
      }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to fetch submissions')
          : 'Failed to fetch submissions'
      },
      { status: 500 }
    );
  }
}

