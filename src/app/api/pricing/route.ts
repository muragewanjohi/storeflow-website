/**
 * Public Pricing Plans API Route
 * 
 * GET /api/pricing
 * 
 * Returns all active pricing plans with location-based pricing (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { detectUserLocation, getLocalizedPrice } from '@/lib/pricing/location';

export async function GET(request: NextRequest) {
  try {
    // Detect user location - check client-provided headers first, then server headers
    let locationInfo = detectUserLocation(request.headers);
    
    // Check if client provided location info (from client-side detection)
    const clientCountry = request.headers.get('x-user-country');
    const clientCurrency = request.headers.get('x-user-currency');
    
    if (clientCountry === 'KE' || clientCurrency === 'KES') {
      locationInfo = {
        currency: 'KES',
        currencySymbol: 'Ksh',
        isKenya: true,
      };
    } else if (clientCountry && clientCountry !== 'KE') {
      locationInfo = {
        currency: 'USD',
        currencySymbol: '$',
        isKenya: false,
      };
    }
    
    const pricePlans = await prisma.price_plans.findMany({
      where: {
        status: 'active',
        // Only return Basic and Pro plans
        OR: [
          { name: 'Basic' },
          { name: 'Pro' },
        ],
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

    // Convert Prisma Decimal to number and apply location-based pricing
    const plans = pricePlans.map((plan: {
      id: string;
      name: string;
      price: any; // Prisma Decimal type
      duration_months: number;
      trial_days: number | null;
      features: any;
      status: string | null;
    }) => {
      // Get localized price based on location
      const localizedPrice = getLocalizedPrice(plan.name, locationInfo.isKenya);
      
      return {
        ...plan,
        price: localizedPrice || Number(plan.price), // Use localized price if available, otherwise use DB price
        currency: locationInfo.currency,
        currencySymbol: locationInfo.currencySymbol,
      };
    });

    return NextResponse.json({ 
      plans,
      location: {
        country: locationInfo.isKenya ? 'KE' : 'US',
        currency: locationInfo.currency,
        currencySymbol: locationInfo.currencySymbol,
      },
    }, { status: 200 });
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

