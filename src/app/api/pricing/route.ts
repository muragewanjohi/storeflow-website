/**
 * Public Pricing Plans API Route
 * 
 * GET /api/pricing
 * 
 * Returns all active pricing plans (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
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
        trial_days: true,
        features: true,
        status: true,
      },
    });

    // Convert Prisma Decimal to number
    const plans = pricePlans.map((plan) => ({
      ...plan,
      price: Number(plan.price),
    }));

    return NextResponse.json({ plans }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pricing plans:', error);
    
    return NextResponse.json(
      { 
        message: 'Failed to fetch pricing plans',
        error: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
      },
      { status: 500 }
    );
  }
}

