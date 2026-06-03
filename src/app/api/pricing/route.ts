/**
 * Public Pricing Plans API Route
 * 
 * GET /api/pricing
 * 
 * Returns all active pricing plans with location-based pricing (public, no auth required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  detectUserLocation,
  getPricingInfoForCountry,
  normalizeCountryCode,
  resolvePlanMonthlyPrice,
} from '@/lib/pricing/location';

export async function GET(request: NextRequest) {
  try {
    const clientCountry = request.headers.get('x-user-country');
    const geoCountry = detectUserLocation(request.headers).countryCode;
    const countryCode =
      normalizeCountryCode(clientCountry) ?? normalizeCountryCode(geoCountry) ?? 'US';
    const locationInfo = getPricingInfoForCountry(countryCode);
    
    const pricePlans = await prisma.price_plans.findMany({
      where: {
        status: 'active',
        // Return Basic, Pro/Standard, and Premium plans
        OR: [
          { name: { equals: 'Basic', mode: 'insensitive' } },
          { name: { equals: 'Basic Plan', mode: 'insensitive' } },
          { name: { equals: 'Pro', mode: 'insensitive' } },
          { name: { equals: 'Pro Plan', mode: 'insensitive' } },
          { name: { equals: 'Standard', mode: 'insensitive' } },
          { name: { equals: 'Premium', mode: 'insensitive' } },
          { name: { equals: 'Premium Plan', mode: 'insensitive' } },
        ],
      },
      orderBy: {
        price: 'asc',
      },
      select: {
        id: true,
        name: true,
        price: true,
        price_kes: true,
        duration_months: true,
        trial_days: true,
        features: true,
        status: true,
      },
    });

    // Convert Prisma Decimal to number and apply location-based pricing
    const plans = pricePlans.map((plan) => {
      const displayPrice = resolvePlanMonthlyPrice(
        { price: plan.price, price_kes: plan.price_kes },
        locationInfo.isKenya,
      );

      return {
        ...plan,
        price: displayPrice,
        priceUsd: Number(plan.price),
        priceKes: plan.price_kes != null ? Number(plan.price_kes) : null,
        currency: locationInfo.currency,
        currencySymbol: locationInfo.currencySymbol,
      };
    });

    // Sort plans by price to ensure correct order (Basic, Standard/Pro, Premium)
    plans.sort((a, b) => a.price - b.price);

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

