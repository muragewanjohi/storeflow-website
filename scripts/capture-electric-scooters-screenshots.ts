/**
 * Script to Capture Screenshots from Electric Scooters Website
 * 
 * Uses Playwright to take screenshots of key pages from scooters.localhost:3000
 * for the user guide on the marketing website
 * 
 * Usage:
 *   1. Make sure the dev server is running: npm run dev
 *   2. Make sure Electric Scooters website is accessible at http://scooters.localhost:3000
 *   3. Run: npx tsx scripts/capture-electric-scooters-screenshots.ts
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'images', 'user-guide');
const BASE_URL = 'http://scooters.localhost:3000';

// Ensure screenshots directory exists
async function ensureDirectory() {
  try {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
    console.log(`✅ Screenshots directory: ${SCREENSHOTS_DIR}`);
  } catch (error) {
    console.error('Failed to create directory:', error);
  }
}

interface ScreenshotConfig {
  name: string;
  url: string;
  description: string;
  waitForSelector?: string;
  fullPage?: boolean;
  delay?: number;
  preAction?: (page: Page) => Promise<void>;
}

const screenshots: ScreenshotConfig[] = [
  {
    name: 'signup-page',
    url: '/customer-register',
    description: 'Customer registration form',
    waitForSelector: 'form input[name="email"]',
    fullPage: true,
    delay: 1000,
  },
  {
    name: 'login-page',
    url: '/customer-login',
    description: 'Customer login page',
    waitForSelector: 'form input[name="email"]',
    fullPage: true,
    delay: 1000,
  },
  {
    name: 'products-listing',
    url: '/products',
    description: 'Products listing page with search and filters',
    waitForSelector: '[data-testid="products"], .product-grid, .products-list',
    fullPage: true,
    delay: 2000,
  },
  {
    name: 'product-detail',
    url: '/products',
    description: 'Product detail page',
    waitForSelector: '[data-testid="products"], .product-grid, .products-list',
    fullPage: false,
    delay: 2000,
    preAction: async (page) => {
      // Click on first product
      const firstProduct = page.locator('a[href*="/products/"]').first();
      if (await firstProduct.isVisible({ timeout: 5000 })) {
        await firstProduct.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }
    },
  },
  {
    name: 'shopping-cart',
    url: '/cart',
    description: 'Shopping cart with items',
    waitForSelector: '.cart, [data-testid="cart"]',
    fullPage: true,
    delay: 1000,
    preAction: async (page) => {
      // First, add a product to cart if cart is empty
      await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
      const firstProduct = page.locator('a[href*="/products/"]').first();
      if (await firstProduct.isVisible({ timeout: 5000 })) {
        await firstProduct.click();
        await page.waitForLoadState('networkidle');
        
        // Try to add to cart
        const addToCartBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add")').first();
        if (await addToCartBtn.isVisible({ timeout: 5000 })) {
          await addToCartBtn.click();
          await page.waitForTimeout(2000);
        }
      }
    },
  },
  {
    name: 'checkout-page',
    url: '/checkout',
    description: 'Checkout form with address and payment fields',
    waitForSelector: 'form, input[name="email"], input[type="email"]',
    fullPage: true,
    delay: 1000,
  },
  {
    name: 'account-dashboard',
    url: '/account',
    description: 'Customer account dashboard',
    waitForSelector: '.account, [data-testid="account"]',
    fullPage: true,
    delay: 1000,
  },
  {
    name: 'order-history',
    url: '/account/orders',
    description: 'Order history page',
    waitForSelector: '.orders, [data-testid="orders"]',
    fullPage: true,
    delay: 1000,
  },
  {
    name: 'wishlist',
    url: '/account/wishlist',
    description: 'Wishlist page with saved products',
    waitForSelector: '.wishlist, [data-testid="wishlist"]',
    fullPage: true,
    delay: 1000,
  },
  {
    name: 'support-ticket-form',
    url: '/support',
    description: 'Support ticket creation form',
    waitForSelector: 'form, textarea, input[name="subject"]',
    fullPage: true,
    delay: 1000,
  },
];

async function captureScreenshot(page: Page, config: ScreenshotConfig) {
  console.log(`\n📸 Capturing: ${config.description}`);
  console.log(`   URL: ${BASE_URL}${config.url}`);
  
  try {
    // Navigate to URL
    await page.goto(`${BASE_URL}${config.url}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for specific selector if provided
    if (config.waitForSelector) {
      try {
        await page.waitForSelector(config.waitForSelector, { timeout: 10000 });
      } catch (error) {
        console.warn(`   ⚠️  Selector "${config.waitForSelector}" not found, continuing anyway...`);
      }
    }

    // Run pre-action if provided
    if (config.preAction) {
      await config.preAction(page);
    }

    // Wait for delay if specified
    if (config.delay) {
      await page.waitForTimeout(config.delay);
    }

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${config.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: config.fullPage ?? true,
    });

    console.log(`   ✅ Saved: ${screenshotPath}`);
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    // Capture error screenshot for debugging
    try {
      const errorPath = path.join(SCREENSHOTS_DIR, `${config.name}-error.png`);
      await page.screenshot({ path: errorPath, fullPage: true });
      console.log(`   📷 Error screenshot saved: ${errorPath}`);
    } catch (screenshotError) {
      console.error(`   ❌ Failed to save error screenshot: ${screenshotError}`);
    }
  }
}

async function main() {
  await ensureDirectory();

  let browser: Browser | undefined;
  try {
    console.log('🚀 Starting screenshot capture...');
    console.log(`📁 Output directory: ${SCREENSHOTS_DIR}`);
    console.log(`🌐 Base URL: ${BASE_URL}\n`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Set viewport to standard desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Capture all screenshots
    for (const config of screenshots) {
      await captureScreenshot(page, config);
    }

    console.log('\n✅ Screenshot capture complete!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();

