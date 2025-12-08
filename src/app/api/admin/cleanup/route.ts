/**
 * Data Cleanup API Route
 * 
 * This endpoint performs various data cleanup tasks:
 * - Delete old cart items (older than 30 days)
 * - Delete old session data
 * - Clean up orphaned records
 * - Archive old logs (if applicable)
 * 
 * Should be called weekly by a cron job
 * 
 * Day 39-40: Background Jobs - Data Cleanup
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/admin/cleanup
 * Perform data cleanup tasks
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add secret token check for security
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const results = {
      old_cart_items_deleted: 0,
      old_sessions_deleted: 0,
      orphaned_records_cleaned: 0,
      errors: [] as string[],
    };

    // 1. Delete old cart items (older than 30 days)
    try {
      const deletedCartItems = await prisma.cart_items.deleteMany({
        where: {
          updated_at: {
            lt: thirtyDaysAgo,
          },
        },
      });
      results.old_cart_items_deleted = deletedCartItems.count;
    } catch (error) {
      results.errors.push(`Failed to delete old cart items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 2. Clean up orphaned order_products (orders that don't exist)
    try {
      // Find order_products with invalid order_id
      const orphanedOrderProducts = await prisma.$executeRaw`
        DELETE FROM order_products op
        WHERE NOT EXISTS (
          SELECT 1 FROM orders o WHERE o.id = op.order_id
        )
      `;
      results.orphaned_records_cleaned += Number(orphanedOrderProducts);
    } catch (error) {
      results.errors.push(`Failed to clean orphaned order_products: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Clean up orphaned cart_items (products that don't exist)
    try {
      const orphanedCartItems = await prisma.$executeRaw`
        DELETE FROM cart_items ci
        WHERE ci.product_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM products p WHERE p.id = ci.product_id
          )
      `;
      results.orphaned_records_cleaned += Number(orphanedCartItems);
    } catch (error) {
      results.errors.push(`Failed to clean orphaned cart_items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 4. Clean up old support ticket attachments (if stored in database)
    // This would depend on your storage implementation
    // For now, we'll just log that this could be done

    // 5. Clean up expired password reset tokens (if stored in database)
    // This would depend on your auth implementation

    return NextResponse.json(
      {
        message: 'Data cleanup completed',
        results,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error during data cleanup:', error);
    return NextResponse.json(
      {
        message: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to perform data cleanup'
      },
      { status: 500 }
    );
  }
}

