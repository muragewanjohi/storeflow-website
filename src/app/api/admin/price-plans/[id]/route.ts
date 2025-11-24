/**
 * Price Plan Detail API Route
 * 
 * Handles GET, PUT, and DELETE operations for a specific price plan (landlord only)
 * 
 * Day 25-26: Subscription Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updatePricePlanSchema } from '@/lib/subscriptions/validation';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/price-plans/[id]
 * Get a specific price plan (landlord only)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    const pricePlan = await prisma.price_plans.findUnique({
      where: { id },
    });

    if (!pricePlan) {
      return NextResponse.json(
        { message: 'Price plan not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ pricePlan }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching price plan:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to fetch price plan'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/price-plans/[id]
 * Update a price plan (landlord only)
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;
    const body = await request.json();

    // Check if plan exists
    const existingPlan = await prisma.price_plans.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { message: 'Price plan not found' },
        { status: 404 }
      );
    }

    // Validate request body
    const validatedData = updatePricePlanSchema.parse(body);

    // Check if name is being changed and if it conflicts with another plan
    if (validatedData.name && validatedData.name !== existingPlan.name) {
      const nameConflict = await prisma.price_plans.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { message: 'A price plan with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update plan
    const updatedPlan = await prisma.price_plans.update({
      where: { id },
      data: {
        ...validatedData,
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      { 
        message: 'Price plan updated successfully',
        pricePlan: updatedPlan 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating price plan:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to update price plan'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/price-plans/[id]
 * Delete a price plan (landlord only)
 * 
 * Note: This is a soft delete - sets status to 'inactive' instead of actually deleting
 * to preserve data integrity for existing tenant subscriptions
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id } = await params;

    // Check if plan exists
    const existingPlan = await prisma.price_plans.findUnique({
      where: { id },
      include: {
        tenants: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    if (!existingPlan) {
      return NextResponse.json(
        { message: 'Price plan not found' },
        { status: 404 }
      );
    }

    // Check if any tenants are using this plan
    if (existingPlan.tenants && existingPlan.tenants.length > 0) {
      // Soft delete: set status to inactive instead of deleting
      const updatedPlan = await prisma.price_plans.update({
        where: { id },
        data: {
          status: 'inactive',
          updated_at: new Date(),
        },
      });

      return NextResponse.json(
        { 
          message: 'Price plan deactivated (in use by tenants). Set to inactive instead of deleting.',
          pricePlan: updatedPlan 
        },
        { status: 200 }
      );
    }

    // If no tenants are using it, we can actually delete it
    await prisma.price_plans.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Price plan deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting price plan:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { message: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { message: 'Access denied. Landlord role required.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        message: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to delete price plan'
      },
      { status: 500 }
    );
  }
}

