/**
 * Price Plans API Route
 * 
 * Handles CRUD operations for price plans (landlord only)
 * 
 * Day 25-26: Subscription Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createPricePlanSchema, updatePricePlanSchema } from '@/lib/subscriptions/validation';

/**
 * GET /api/admin/price-plans
 * List all price plans (landlord only)
 * 
 * Query params:
 * - status: 'active' | 'inactive' | 'all' (default: 'active')
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'active';

    const where: any = {};
    if (statusFilter !== 'all') {
      where.status = statusFilter;
    }

    const pricePlans = await prisma.price_plans.findMany({
      where,
      orderBy: {
        price: 'asc',
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration_months: true,
        trial_days: true,
        features: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ pricePlans }, { status: 200 });
  } catch (error) {
    console.error('Error fetching price plans:', error);
    
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
          : 'Failed to fetch price plans'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/price-plans
 * Create a new price plan (landlord only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const validatedData = createPricePlanSchema.parse(body);

    // Check if plan with same name already exists
    const existingPlan = await prisma.price_plans.findFirst({
      where: {
        name: validatedData.name,
      },
    });

    if (existingPlan) {
      return NextResponse.json(
        { message: 'A price plan with this name already exists' },
        { status: 409 }
      );
    }

    const pricePlan = await prisma.price_plans.create({
      data: {
        name: validatedData.name,
        price: validatedData.price,
        duration_months: validatedData.duration_months,
        trial_days: validatedData.trial_days || 0,
        features: validatedData.features || {},
        status: validatedData.status,
      },
    });

    return NextResponse.json(
      { 
        message: 'Price plan created successfully',
        pricePlan 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating price plan:', error);
    
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
          : 'Failed to create price plan'
      },
      { status: 500 }
    );
  }
}

