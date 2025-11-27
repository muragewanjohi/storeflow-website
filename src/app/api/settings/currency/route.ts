/**
 * Currency Settings API Route
 * 
 * GET: Get currency settings for the current tenant
 * This endpoint is public (no auth required) so storefront can use it
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { cache } from '@/lib/cache/simple-cache';

export async function GET(request: NextRequest) {
  try {
    const tenant = await getTenant();
    
    if (!tenant) {
      // Return defaults for non-tenant requests
      return NextResponse.json({
        success: true,
        currency: {
          code: 'USD',
          symbol: '$',
          symbolPosition: 'left',
          thousandSeparator: ',',
          decimalSeparator: '.',
          decimalPlaces: 2,
        },
      });
    }

    // Check cache first (cache for 5 minutes)
    const cacheKey = `${tenant.id}:currency`;
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, currency: cached });
    }

    // Fetch currency settings from database
    const options = await prisma.static_options.findMany({
      where: {
        tenant_id: tenant.id,
        option_name: {
          in: [
            'currency_code',
            'currency_symbol',
            'currency_symbol_position',
            'currency_thousand_separator',
            'currency_decimal_separator',
            'currency_decimal_places',
          ],
        },
      },
    });

    // Build currency object from options
    const optionsMap: Record<string, string | null> = {};
    for (const opt of options) {
      optionsMap[opt.option_name] = opt.option_value;
    }

    const currency = {
      code: optionsMap.currency_code || 'USD',
      symbol: optionsMap.currency_symbol || '$',
      symbolPosition: (optionsMap.currency_symbol_position as 'left' | 'right') || 'left',
      thousandSeparator: optionsMap.currency_thousand_separator || ',',
      decimalSeparator: optionsMap.currency_decimal_separator || '.',
      decimalPlaces: optionsMap.currency_decimal_places 
        ? parseInt(optionsMap.currency_decimal_places, 10) 
        : 2,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, currency, 300);

    return NextResponse.json({ success: true, currency });
  } catch (error: any) {
    console.error('Error fetching currency settings:', error);
    return NextResponse.json(
      { 
        success: true, 
        currency: {
          code: 'USD',
          symbol: '$',
          symbolPosition: 'left',
          thousandSeparator: ',',
          decimalSeparator: '.',
          decimalPlaces: 2,
        },
      }
    );
  }
}

