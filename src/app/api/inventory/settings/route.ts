/**
 * Inventory Settings API Route
 * 
 * Handles GET and PUT requests for inventory settings (low stock threshold)
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { getLowStockThreshold, setLowStockThreshold } from '@/lib/inventory/threshold';
import { z } from 'zod';

const updateThresholdSchema = z.object({
  threshold: z.number().int().min(0).max(10000),
});

/**
 * GET /api/inventory/settings
 * 
 * Get current inventory settings
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const threshold = await getLowStockThreshold(tenant.id);

    return NextResponse.json({
      threshold,
    });
  } catch (error) {
    console.error('Error getting inventory settings:', error);
    return NextResponse.json(
      { error: 'Failed to get inventory settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/settings
 * 
 * Update inventory settings
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    const validatedData = updateThresholdSchema.parse(body);

    await setLowStockThreshold(tenant.id, validatedData.threshold);

    return NextResponse.json({
      message: 'Settings updated successfully',
      threshold: validatedData.threshold,
    });
  } catch (error) {
    console.error('Error updating inventory settings:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update inventory settings' },
      { status: 500 }
    );
  }
}

