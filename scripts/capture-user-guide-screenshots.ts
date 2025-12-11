/**
 * Script to Capture Screenshots for User Guide
 * 
 * Uses Playwright to take screenshots of key pages for the user guide
 * 
 * Usage:
 *   npm run dev  # Start dev server in another terminal
 *   npx tsx scripts/capture-user-guide-screenshots.ts
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'public', 'images', 'user-guide');
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TENANT_SUBDOMAIN = process.env.TEST_TENANT_SUBDOMAIN || 'teststore';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  console.log(`✅ Created directory: ${SCREENSHOTS_DIR}`);
}

interface ScreenshotConfig {
  name: string;
  url: string;
  description: string;
  waitForSelector?: string;
  fullPage?: boolean;
  viewport?: { width: number; height: number };
}

const screenshots: ScreenshotConfig[] = [
  {
    name: 'homepage',
    url: '/',
    description: 'Homepage with featured products',
    waitForSelector: 'h1, [data-testid="homepage"]',
    fullPage: true,
    viewport: { width: 1920, height: 1080 },
  },
  {
    name: 'signup-page',
    url: '/customer-register',
    description: 'Customer registration page',
    waitForSelector: 'form, input[name="email"]',
    fullPage: true,
  },
  {
    name: 'login-page',
    url: '/customer-login',
    description: 'Customer login page',
    waitForSelector: 'form, input[name="email"]',
    fullPage: true,
  },
  {
    name: 'products-listing',
    url: '/products',
    description: 'Product listing page with filters',
    waitForSelector: '[data-testid="products"], .product-card, h1',
    fullPage: true,
  },
  {
    name: 'product-detail',
    url: '/products', // Will need to navigate to a specific product
    description: 'Product detail page with images and add to cart',
    waitForSelector: 'button:has-text("Add to Cart"), img',
    fullPage: true,
  },
  {
    name: 'shopping-cart',
    url: '/cart',
    description: 'Shopping cart page with items',
    waitForSelector: '[data-testid="cart"], .cart-item, h1',
    fullPage: true,
  },
  {
    name: 'checkout-page',
    url: '/checkout',
    description: 'Checkout page with address and payment forms',
    waitForSelector: 'form, input[name="name"]',
    fullPage: true,
  },
  {
    name: 'account-dashboard',
    url: '/account',
    description: 'Customer account dashboard',
    waitForSelector: 'h1, [data-testid="account"]',
    fullPage: true,
  },
  {
    name: 'order-history',
    url: '/account/orders',
    description: 'Order history page',
    waitForSelector: 'h1, .order-item, [data-testid="orders"]',
    fullPage: true,
  },
  {
    name: 'wishlist',
    url: '/account', // Will need to navigate to wishlist
    description: 'Wishlist page with saved products',
    waitForSelector: '.wishlist-item, [data-testid="wishlist"]',
    fullPage: true,
  },
  {
    name: 'support-ticket-form',
    url: '/support',
    description: 'Support ticket creation form',
    waitForSelector: 'form, input[name="subject"]',
    fullPage: true,
  },
  {
    name: 'help-page',
    url: '/help',
    description: 'User guide help page',
    waitForSelector: 'h1:has-text("User Guide")',
    fullPage: true,
  },
];

async function takeScreenshot(
  page: Page,
  config: ScreenshotConfig,
  tenantUrl: string
): Promise<void> {
  try {
    console.log(`📸 Capturing: ${config.description}...`);

    // Set viewport if specified
    if (config.viewport) {
      await page.setViewportSize(config.viewport);
    }

    // Navigate to page
    const fullUrl = `${tenantUrl}${config.url}`;
    console.log(`   Navigating to: ${fullUrl}`);
    
    await page.goto(fullUrl, {
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

    // Wait a bit for any animations or dynamic content
    await page.waitForTimeout(1000);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOTS_DIR, `${config.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: config.fullPage ?? true,
    });

    console.log(`   ✅ Saved: ${screenshotPath}`);
  } catch (error: any) {
    console.error(`   ❌ Error capturing ${config.name}:`, error.message);
  }
}

async function navigateToProduct(page: Page, tenantUrl: string): Promise<string | null> {
  try {
    // Navigate to products page
    await page.goto(`${tenantUrl}/products`, { waitUntil: 'networkidle' });
    
    // Wait for products to load
    await page.waitForSelector('a[href*="/products/"], .product-card a', { timeout: 10000 });
    
    // Get first product link
    const productLink = await page.locator('a[href*="/products/"]').first().getAttribute('href');
    
    if (productLink) {
      return productLink;
    }
    
    return null;
  } catch (error) {
    console.warn('   ⚠️  Could not find product link');
    return null;
  }
}

async function main() {
  console.log('🚀 Starting screenshot capture for user guide...\n');
  console.log(`📁 Screenshots will be saved to: ${SCREENSHOTS_DIR}\n`);

  // Construct tenant URL
  let tenantUrl: string;
  if (TENANT_SUBDOMAIN.includes('.')) {
    tenantUrl = `https://${TENANT_SUBDOMAIN}`;
  } else {
    tenantUrl = `${BASE_URL}`;
    console.warn(`⚠️  Using base URL. For subdomain testing, set TEST_TENANT_SUBDOMAIN to full domain (e.g., teststore.dukanest.com)`);
  }

  console.log(`🌐 Using URL: ${tenantUrl}\n`);

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // First, try to find a product for product detail screenshot
    let productUrl: string | null = null;
    try {
      console.log('🔍 Finding a product for product detail screenshot...');
      productUrl = await navigateToProduct(page, tenantUrl);
      if (productUrl) {
        console.log(`   ✅ Found product: ${productUrl}\n`);
      }
    } catch (error) {
      console.warn('   ⚠️  Could not find product, skipping product detail screenshot\n');
    }

    // Capture all screenshots
    for (const config of screenshots) {
      // Special handling for product detail
      if (config.name === 'product-detail' && productUrl) {
        const productDetailConfig = {
          ...config,
          url: productUrl,
        };
        await takeScreenshot(page, productDetailConfig, tenantUrl);
      } else if (config.name !== 'product-detail') {
        // Skip product detail if we don't have a product URL
        await takeScreenshot(page, config, tenantUrl);
      }

      // Small delay between screenshots
      await page.waitForTimeout(500);
    }

    console.log('\n✅ Screenshot capture complete!');
    console.log(`\n📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review the screenshots');
    console.log('   2. Update user-guide-content.tsx to use the images');
    console.log('   3. Replace Image placeholders with:');
    console.log('      <Image src="/images/user-guide/filename.png" alt="..." width={800} height={600} />');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the script
main().catch(console.error);

