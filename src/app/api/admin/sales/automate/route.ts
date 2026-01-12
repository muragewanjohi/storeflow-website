/**
 * Sales Automation API Route
 * 
 * This endpoint automates sale status updates:
 * - Activates sales at start_date
 * - Deactivates sales at end_date
 * - Updates sale status automatically
 * - Auto-calculates discount percentages
 * 
 * Can be called by a cron job (Vercel Cron, GitHub Actions, etc.)
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json
 * - Manual: GET /api/admin/sales/automate
 * 
 * Phase 5: Automation - Sales Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { startCronJobLog, completeCronJobLog } from '@/lib/cron-jobs/logger';

/**
 * GET /api/admin/sales/automate
 * Automate sale status updates and discount calculations
 * 
 * This is a public endpoint that should be protected by a secret token
 * or called only from cron jobs
 */
export async function GET(request: NextRequest) {
  const logId = await startCronJobLog({
    jobName: 'Sales Automation',
    jobPath: '/api/admin/sales/automate',
  });

  try {
    // Security: Check for Vercel Cron header OR valid token
    const allHeaders = Object.fromEntries(
      Array.from(request.headers.entries()).map(([k, v]) => [k.toLowerCase(), v])
    );
    const vercelCronHeader = allHeaders['x-vercel-cron'] || allHeaders['x-vercel-signature'];
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const queryToken = searchParams.get('token');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    // Allow if it's a Vercel Cron call (has x-vercel-cron header)
    // OR if token is provided and valid
    // OR if no token is configured (development mode)
    if (expectedToken && !vercelCronHeader) {
      const headerToken = authHeader?.replace('Bearer ', '').trim();
      const providedToken = queryToken || headerToken;
      
      if (!providedToken || providedToken !== expectedToken) {
        await completeCronJobLog(logId, 'failed', {
          error: 'Unauthorized - Invalid token',
        });
        return NextResponse.json(
          { 
            message: 'Unauthorized',
            error: 'Invalid token. Ensure CRON_SECRET_TOKEN is set in Vercel environment variables.',
          },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    const results = {
      activated: 0,
      deactivated: 0,
      discountCalculated: 0,
      errors: [] as string[],
    };

    // 1. Activate scheduled sales that have reached their start_date
    try {
      const salesToActivate = await prisma.sales.findMany({
        where: {
          status: 'scheduled',
          start_date: {
            lte: now,
          },
        },
      });

      for (const sale of salesToActivate) {
        try {
          await prisma.sales.update({
            where: { id: sale.id },
            data: { status: 'active' },
          });
          results.activated++;
        } catch (error) {
          const errorMsg = `Failed to activate sale ${sale.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
    } catch (error) {
      const errorMsg = `Error finding sales to activate: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg, error);
    }

    // 2. Deactivate/End sales that have passed their end_date
    try {
      const salesToDeactivate = await prisma.sales.findMany({
        where: {
          status: { in: ['active', 'scheduled'] },
          end_date: {
            lte: now,
          },
        },
      });

      for (const sale of salesToDeactivate) {
        try {
          await prisma.sales.update({
            where: { id: sale.id },
            data: { status: 'ended' },
          });
          results.deactivated++;
        } catch (error) {
          const errorMsg = `Failed to deactivate sale ${sale.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
    } catch (error) {
      const errorMsg = `Error finding sales to deactivate: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg, error);
    }

    // 3. Auto-calculate discount percentages for product_sales without discount_percent
    try {
      const productSalesWithoutDiscount = await prisma.product_sales.findMany({
        where: {
          discount_percent: null,
          OR: [
            { sale_price: { not: null } },
            {
              products: {
                sale_price: { not: null },
              },
            },
          ],
        },
        include: {
          products: {
            select: {
              price: true,
              sale_price: true,
            },
          },
        },
      });

      for (const productSale of productSalesWithoutDiscount) {
        try {
          const regularPrice = Number(productSale.products.price);
          const salePrice = productSale.sale_price
            ? Number(productSale.sale_price)
            : productSale.products.sale_price
            ? Number(productSale.products.sale_price)
            : regularPrice;

          if (salePrice < regularPrice && regularPrice > 0) {
            const discountPercent = Math.round(((regularPrice - salePrice) / regularPrice) * 100);

            await prisma.product_sales.update({
              where: { id: productSale.id },
              data: { discount_percent: discountPercent },
            });
            results.discountCalculated++;
          }
        } catch (error) {
          const errorMsg = `Failed to calculate discount for product_sale ${productSale.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
    } catch (error) {
      const errorMsg = `Error calculating discounts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg, error);
    }

    // 4. Update discount percentages for existing product_sales when prices change
    // This ensures discount percentages stay accurate if product prices are updated
    try {
      const allProductSales = await prisma.product_sales.findMany({
        where: {
          sale_price: { not: null },
        },
        include: {
          products: {
            select: {
              price: true,
            },
        },
        },
      });

      for (const productSale of allProductSales) {
        try {
          const regularPrice = Number(productSale.products.price);
          const salePrice = productSale.sale_price ? Number(productSale.sale_price) : regularPrice;

          if (salePrice < regularPrice && regularPrice > 0) {
            const newDiscountPercent = Math.round(((regularPrice - salePrice) / regularPrice) * 100);
            const currentDiscountPercent = productSale.discount_percent;

            // Only update if discount percentage has changed (to avoid unnecessary writes)
            const currentDiscount = currentDiscountPercent ? Number(currentDiscountPercent) : null;
            if (currentDiscount !== newDiscountPercent) {
              await prisma.product_sales.update({
                where: { id: productSale.id },
                data: { discount_percent: newDiscountPercent },
              });
              results.discountCalculated++;
            }
          } else if (productSale.discount_percent !== null) {
            // If sale price is no longer less than regular price, clear discount
            await prisma.product_sales.update({
              where: { id: productSale.id },
              data: { discount_percent: null },
            });
          }
        } catch (error) {
          const errorMsg = `Failed to update discount for product_sale ${productSale.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg, error);
        }
      }
    } catch (error) {
      const errorMsg = `Error updating discounts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg, error);
    }

    const success = results.errors.length === 0;
    await completeCronJobLog(logId, success ? 'success' : 'failed', {
      result: results,
      error: success ? undefined : `Completed with ${results.errors.length} error(s)`,
    });

    return NextResponse.json({
      success,
      message: 'Sales automation completed',
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    await completeCronJobLog(logId, 'failed', {
      error: errorMessage,
    });

    console.error('[Sales Automation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
