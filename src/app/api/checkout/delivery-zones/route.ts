/**
 * Delivery Zones API (Public - for checkout)
 * 
 * GET: Get active delivery zones for zone selection
 * POST: Auto-detect zone based on address
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/checkout/delivery-zones - Get active delivery zones
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    const zones = await prisma.delivery_zones.findMany({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        price: Number(zone.price),
        locations: zone.locations,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching delivery zones:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch delivery zones' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/checkout/delivery-zones/detect - Auto-detect zone based on address
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();

    const { formatted_address, city, state, address_line_1, coordinates } = body;

    if (!formatted_address && !city && !state && !address_line_1) {
      return NextResponse.json(
        { error: 'Address information required' },
        { status: 400 }
      );
    }

    // Get all active zones
    const zones = await prisma.delivery_zones.findMany({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
      orderBy: [
        { sort_order: 'asc' },
        { name: 'asc' },
      ],
    });

    // Try to match address to zone
    // Use formatted_address (from Google Places) as primary, then fall back to individual components
    let matchedZone = null;

    // Normalize search terms - prioritize formatted_address
    const searchTerms: string[] = [];
    
    // Use formatted address if available (most reliable from Google Places)
    if (formatted_address) {
      // Extract location names from formatted address
      // Format: "123 Main St, Westlands, Nairobi, Kenya"
      const addressParts = formatted_address.toLowerCase().split(',').map((part: string) => part.trim());
      searchTerms.push(...addressParts);
    } else {
      // Fall back to individual components
      if (city) searchTerms.push(city.toLowerCase().trim());
      if (state) searchTerms.push(state.toLowerCase().trim());
      if (address_line_1) {
        // Extract area names from address (e.g., "Westlands" from "123 Main St, Westlands")
        const addressParts = address_line_1.toLowerCase().split(/[,\s]+/);
        searchTerms.push(...addressParts);
      }
    }

    // Match against zone locations
    // Each zone has a locations array - match if any location matches any search term
    for (const zone of zones) {
      for (const location of zone.locations) {
        const locationLower = location.toLowerCase().trim();
        for (const term of searchTerms) {
          // More flexible matching - check if location contains term or vice versa
          if (locationLower.includes(term) || term.includes(locationLower)) {
            matchedZone = zone;
            break;
          }
        }
        if (matchedZone) break;
      }
      if (matchedZone) break;
    }

    if (matchedZone) {
      return NextResponse.json({
        success: true,
        zone: {
          id: matchedZone.id,
          name: matchedZone.name,
          price: Number(matchedZone.price),
          locations: matchedZone.locations,
        },
        matched: true,
      });
    }

    // No zone matched
    return NextResponse.json({
      success: true,
      zone: null,
      matched: false,
      message: 'No delivery zone found for this address. Delivery fee will be calculated manually.',
    });
  } catch (error: any) {
    console.error('Error detecting delivery zone:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to detect delivery zone' },
      { status: error.status || 500 }
    );
  }
}
