/**
 * Price Plans API Route
 * 
 * Handles GET requests for fetching available price plans
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/admin/price-plans
 * List all active price plans (landlord only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const pricePlans = await prisma.price_plans.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        price: 'asc',
      },
      select: {
        id: true,
        name: true,
        price: true,
        duration_months: true,
        features: true,
        status: true,
        created_at: true,
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

