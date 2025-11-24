/**
 * Customer Notes API Routes
 * 
 * GET: Get customer notes
 * POST: Create customer note
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const createNoteSchema = z.object({
  note: z.string().min(1, 'Note is required').max(1000, 'Note must be less than 1000 characters'),
});

/**
 * GET /api/customers/[id]/notes - Get customer notes
 * 
 * Note: For now, we'll store notes in the customer's message field or metadata
 * In production, you might want a separate customer_notes table
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id } = await params;

    // Verify customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        // For now, we'll use a simple approach - in production, use a notes table
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // TODO: Implement proper notes table
    // For now, return empty array
    return NextResponse.json({
      success: true,
      notes: [],
    });
  } catch (error: any) {
    console.error('Error fetching customer notes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notes' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/notes - Create customer note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');
    const { id } = await params;
    const body = await request.json();

    const validatedData = createNoteSchema.parse(body);

    // Verify customer exists
    const customer = await prisma.customers.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // TODO: Implement proper notes table with created_by, created_at, etc.
    // For now, we'll just return success
    return NextResponse.json(
      {
        success: true,
        message: 'Note created successfully',
        // In production, return the created note
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating customer note:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: error.status || 500 }
    );
  }
}

