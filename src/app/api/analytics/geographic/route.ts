/**
 * Geographic Analytics API Route
 * 
 * Returns sales and customer data by geographic location:
 * - Sales by Country
 * - Sales by State/Region
 * - Sales by City
 * - Top markets
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    // Fetch orders with shipping addresses
    const orders = await prisma.orders.findMany({
      where: {
        tenant_id: tenant.id,
        payment_status: 'paid',
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        total_amount: true,
        shipping_address: true,
        billing_address: true,
      },
    });

    // Aggregate by country
    const byCountry: Record<string, { country: string; revenue: number; orders: number }> = {};
    const byState: Record<string, { state: string; country: string; revenue: number; orders: number }> = {};
    const byCity: Record<string, { city: string; state: string; country: string; revenue: number; orders: number }> = {};

    orders.forEach((order: any) => {
      const address = order.shipping_address || order.billing_address || {};
      const country = address.country || 'Unknown';
      const state = address.state || address.region || 'Unknown';
      const city = address.city || 'Unknown';
      const revenue = Number(order.total_amount);

      // By country
      if (!byCountry[country]) {
        byCountry[country] = { country, revenue: 0, orders: 0 };
      }
      byCountry[country].revenue += revenue;
      byCountry[country].orders += 1;

      // By state
      const stateKey = `${country}-${state}`;
      if (!byState[stateKey]) {
        byState[stateKey] = { state, country, revenue: 0, orders: 0 };
      }
      byState[stateKey].revenue += revenue;
      byState[stateKey].orders += 1;

      // By city
      const cityKey = `${country}-${state}-${city}`;
      if (!byCity[cityKey]) {
        byCity[cityKey] = { city, state, country, revenue: 0, orders: 0 };
      }
      byCity[cityKey].revenue += revenue;
      byCity[cityKey].orders += 1;
    });

    // Convert to arrays and sort by revenue
    const countries = Object.values(byCountry)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const states = Object.values(byState)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const cities = Object.values(byCity)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    const data = {
      byCountry: countries,
      byState: states,
      byCity: cities,
      totalCountries: countries.length,
      totalStates: states.length,
      totalCities: cities.length,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching geographic analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch geographic analytics' },
      { status: error.status || 500 }
    );
  }
}
