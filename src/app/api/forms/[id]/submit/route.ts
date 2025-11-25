/**
 * Form Submission API Route
 * 
 * Handles POST requests for submitting form data
 * 
 * Day 27: Content Management - Form Builder
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { formSubmissionSchema } from '@/lib/forms/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/forms/[id]/submit
 * 
 * Submit form data
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Validate request body
    const validatedData = formSubmissionSchema.parse({
      ...body,
      form_id: id,
    });

    // Check if form exists and is active
    const form = await prisma.form_builders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
        status: 'active',
      },
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Form not found or inactive' },
        { status: 404 }
      );
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create submission
    const submission = await prisma.form_submissions.create({
      data: {
        tenant_id: tenant.id,
        form_id: id,
        data: validatedData.data,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // TODO: Send email notification if form.email is set
    // This can be implemented later with email service

    return NextResponse.json(
      { 
        message: form.success_message || 'Form submitted successfully',
        submission_id: submission.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting form:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid form data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to submit form')
          : 'Failed to submit form'
      },
      { status: 500 }
    );
  }
}

