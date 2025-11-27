/**
 * One-time Script: Sync Product Stocks with Variants
 * 
 * This script updates the stock_quantity for all products that have variants.
 * For each product with variants, stock_quantity = sum of variant stocks.
 * 
 * Run with: npx tsx scripts/sync-product-stocks.ts
 */

import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncAllProductStocks() {
  console.log('Starting product stock sync...\n');

  // Get all products that have variants
  const productsWithVariants = await prisma.products.findMany({
    where: {
      product_variants: {
        some: {}, // Has at least one variant
      },
    },
    select: {
      id: true,
      name: true,
      tenant_id: true,
      stock_quantity: true,
      product_variants: {
        select: {
          stock_quantity: true,
        },
      },
    },
  });

  console.log(`Found ${productsWithVariants.length} products with variants.\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of productsWithVariants) {
    // Calculate sum of variant stocks
    const variantTotal = product.product_variants.reduce((sum, variant) => {
      return sum + (variant.stock_quantity ?? 0);
    }, 0);

    // Check if update is needed
    if (product.stock_quantity === variantTotal) {
      skipped++;
      continue;
    }

    // Update product stock
    await prisma.products.update({
      where: { id: product.id },
      data: { stock_quantity: variantTotal },
    });

    console.log(`✓ ${product.name}: ${product.stock_quantity} → ${variantTotal}`);
    updated++;
  }

  console.log('\n--- Summary ---');
  console.log(`Total products with variants: ${productsWithVariants.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Already synced: ${skipped}`);
  console.log('\nSync complete!');
}

syncAllProductStocks()
  .catch((error) => {
    console.error('Error syncing product stocks:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

