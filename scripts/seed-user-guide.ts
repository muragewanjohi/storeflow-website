/**
 * Seed User Guide Content
 * 
 * Populates the database with initial user guide categories and articles
 */

import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Load environment variables
const envPath = resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath, override: true });
dotenv.config({ path: resolve(process.cwd(), '.env'), override: true });

// Create Prisma client - handle both direct connections and Prisma Accelerate
const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env.local file');
  process.exit(1);
}

console.log('📡 Connecting to database...');
const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
console.log(`   Database URL: ${maskedUrl.substring(0, 80)}...`);

// Check if using Prisma Accelerate (prisma+postgres://)
const isAccelerate = databaseUrl.startsWith('prisma+postgres://');

let prisma: PrismaClient;
let connectionString: string;

if (isAccelerate) {
  // Prisma Accelerate - prefer DIRECT_URL, but fallback to DATABASE_URL if DIRECT_URL is direct connection
  if (directUrl && !directUrl.startsWith('prisma+')) {
    // Check if DIRECT_URL is a direct connection (port 5432) which may not be IPv4 compatible
    const isDirectConnection = directUrl.includes(':5432/') && 
                              !directUrl.includes('pooler.supabase.com');
    
    if (isDirectConnection) {
      console.log('   ⚠️  DIRECT_URL uses direct connection (port 5432) - may not be IPv4 compatible');
      console.log('   Trying DATABASE_URL (pooler) instead for better compatibility...');
      
      // Try using DATABASE_URL if it's a pooler connection
      if (databaseUrl.includes('pooler.supabase.com') || databaseUrl.includes(':6543')) {
        connectionString = databaseUrl;
        console.log('   ✅ Using DATABASE_URL (Session Pooler) for IPv4 compatibility');
      } else {
        connectionString = directUrl;
        console.log('   ⚠️  Using DIRECT_URL (may fail on IPv4 networks)');
      }
    } else {
      console.log('   Using DIRECT_URL for adapter (bypassing Accelerate)');
      connectionString = directUrl;
    }
  } else {
    console.log('   ⚠️  Prisma Accelerate detected but DIRECT_URL not set');
    console.error('   ❌ Seed scripts require DIRECT_URL for Prisma Accelerate connections');
    console.error('   Please set DIRECT_URL in your .env.local file');
    console.error('   DIRECT_URL should be a Session Pooler connection string (IPv4 compatible)');
    console.error('\n💡 For Supabase, use Session Pooler connection:');
    console.error('   Project Settings → Database → Connection String');
    console.error('   Select: Type=URI, Source=Primary Database, Method=Session');
    process.exit(1);
  }
} else {
  // Not Accelerate - use DATABASE_URL
  console.log('   Using DATABASE_URL connection');
  connectionString = databaseUrl;
  
  // Check if it's a direct connection that might not be IPv4 compatible
  const isDirectConnection = connectionString.includes(':5432/') && 
                            !connectionString.includes('pooler.supabase.com');
  
  if (isDirectConnection) {
    console.log('   ⚠️  Direct connection detected (port 5432) - may not be IPv4 compatible');
    console.log('   Consider using Session Pooler connection string for better compatibility');
  }
}

const pool = new Pool({
  connectionString: connectionString,
  max: 10,
  // Add connection timeout to fail faster
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
prisma = new PrismaClient({ adapter });

// Test connection
async function testConnection() {
  try {
    await prisma.$connect();
    // Try a simple query to verify connection works
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message);
    
    if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
      console.error('\n⚠️  Database server unreachable. Possible issues:');
      console.error('1. Supabase database is paused (free tier pauses after inactivity)');
      console.error('   → Go to Supabase Dashboard → Project Settings → Restore');
      console.error('2. Direct connection (port 5432) is not IPv4 compatible');
      console.error('   → Use Session Pooler connection string instead (IPv4 compatible)');
      console.error('   → Get it from: Project Settings → Database → Connection String');
      console.error('   → Select: Type=URI, Source=Primary Database, Method=Session');
      console.error('3. Network/firewall blocking connection');
      console.error('4. DIRECT_URL is incorrect or pointing to wrong database');
      console.error('\n💡 Solution: Update DIRECT_URL in .env.local to use Session Pooler:');
      console.error('   Format: postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres');
    } else {
      console.error('\nPossible issues:');
      console.error('1. Database server is not running');
      console.error('2. DATABASE_URL/DIRECT_URL is incorrect');
      console.error('3. Migration has not been applied (run the SQL migration first)');
      console.error('\nTo apply migration:');
      console.error('   - Open Supabase SQL Editor');
      console.error('   - Run: supabase/migrations/999_create_user_guide_tables.sql');
    }
    process.exit(1);
  }
}

async function main() {
  // Test connection first
  await testConnection();
  
  console.log('🌱 Seeding user guide content...');

  // Check if tables exist by trying to count
  try {
    await prisma.user_guide_categories.count();
    console.log('✅ Tables exist, proceeding with seed...');
  } catch (error: any) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.error('❌ Tables do not exist. Please run the migration first:');
      console.error('   1. Open Supabase SQL Editor');
      console.error('   2. Run: supabase/migrations/999_create_user_guide_tables.sql');
      console.error('   3. Or run: npx prisma db push');
      process.exit(1);
    } else if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
      console.error('❌ Cannot reach database server. Please check:');
      console.error('   1. Supabase database is active (not paused)');
      console.error('   2. DIRECT_URL is correct and accessible');
      console.error('   3. Network/firewall allows connection');
      process.exit(1);
    }
    throw error;
  }

  // Clear existing data (optional - comment out if you want to keep existing data)
  await prisma.user_guide_articles.deleteMany({});
  await prisma.user_guide_categories.deleteMany({});

  // Create categories and articles
  const introductionCategory = await prisma.user_guide_categories.create({
    data: {
      name: 'Introduction',
      slug: 'introduction',
      icon: 'BookOpenIcon',
      color: 'text-blue-600',
      bg_color: 'bg-blue-50',
      sort_order: 0,
      is_active: true,
      articles: {
        create: {
          title: 'DukaNest User Guide',
          slug: 'user-guide-overview',
          content: `Welcome to the DukaNest user guide. This guide is intended to help customers learn how to shop effectively on DukaNest stores and manage their accounts.

![DukaNest Store Overview](/images/user-guide/store-overview.png)

## Who is this guide for?

This guide is for customers shopping on DukaNest-powered stores. You don't need any technical knowledge to follow this guide.

You can also follow this guide if you're exploring DukaNest stores and want to understand how to make purchases, manage your account, and get the most out of your shopping experience.

## Getting Started

To start shopping on a DukaNest store, simply visit the store's website. You can browse products, add items to your cart, and make purchases. Creating an account is optional but recommended for a better shopping experience.`,
          image: '/images/user-guide/store-overview.png',
          image_alt: 'DukaNest Store Overview',
          sort_order: 0,
          is_active: true,
          is_popular: true,
        },
      },
    },
  });

  const gettingStartedCategory = await prisma.user_guide_categories.create({
    data: {
      name: 'Getting Started',
      slug: 'getting-started',
      icon: 'UserIcon',
      color: 'text-blue-600',
      bg_color: 'bg-blue-50',
      sort_order: 1,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Creating an Account',
            slug: 'creating-account',
            content: `Creating an account allows you to track orders, save addresses, and enjoy faster checkout.

![Account Registration](/images/user-guide/signup-page.png)

## Steps to Create an Account

1. **Click "Sign Up" or "Create Account"** in the header
   - Look for the "Sign Up" or "Create Account" button in the top navigation
   - This will take you to the registration page

2. **Fill in your information**
   - Enter your full name
   - Provide a valid email address
   - Create a strong password (8+ characters recommended)
   - Confirm your password

3. **Verify your email address**
   - Check your email inbox for a verification message
   - Click the verification link to activate your account
   - If you don't see the email, check your spam folder

4. **Start shopping!**
   - Once verified, you can log in and start shopping
   - Your account is now active and ready to use

## Benefits of Creating an Account

- **Order Tracking**: View all your past and current orders
- **Saved Addresses**: Save multiple shipping and billing addresses
- **Faster Checkout**: Use saved information for quicker purchases
- **Wishlist**: Save products you love for later
- **Order History**: Access your complete purchase history`,
            image: '/images/user-guide/signup-page.png',
            image_alt: 'Account Registration',
            sort_order: 0,
            is_active: true,
            is_popular: true,
          },
          {
            title: 'Logging In',
            slug: 'logging-in',
            content: `To log into your account, follow these steps:

1. Click "Log In" or "Sign In" in the header
2. Enter your email address and password
3. Click "Log In" to access your account

## Forgot Password?

If you've forgotten your password:

1. Click "Forgot Password?" on the login page
2. Enter your email address
3. Check your email for password reset instructions
4. Follow the link to create a new password`,
            sort_order: 1,
            is_active: true,
          },
        ],
      },
    },
  });

  const shoppingCategory = await prisma.user_guide_categories.create({
    data: {
      name: 'Shopping',
      slug: 'shopping',
      icon: 'ShoppingCartIcon',
      color: 'text-green-600',
      bg_color: 'bg-green-50',
      sort_order: 2,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Browsing Products',
            slug: 'browsing-products',
            content: `Learn how to find and explore products on DukaNest stores.

## Search Products

Use the search bar in the header to find products by:
- Product name
- SKU or product code
- Keywords or descriptions
- Brand names

Simply type what you're looking for and press Enter or click the search icon.

## Browse Categories

Navigate through product categories:
- Click on category names in the navigation menu
- Browse featured categories on the homepage
- Use category filters on product listing pages

## Product Listing Features

On product listing pages, you can:
- Filter products by price, category, brand, and more
- Sort products by price, popularity, newest, etc.
- View products in grid or list format
- See product images, prices, and availability at a glance`,
            sort_order: 0,
            is_active: true,
          },
          {
            title: 'Viewing Product Details',
            slug: 'product-details',
            content: `Click on any product to view detailed information.

## Product Information

Each product page includes:
- **Product Images**: Click to zoom and view gallery images
- **Product Description**: Detailed information about the product
- **Price**: Regular price and sale price (if applicable)
- **Variants**: Select size, color, or other options
- **Stock Status**: See if the product is available
- **Reviews**: Read customer reviews and ratings

## Adding to Cart

1. Select product variants (if available)
2. Choose quantity
3. Click "Add to Cart" button
4. Continue shopping or proceed to checkout`,
            sort_order: 1,
            is_active: true,
          },
        ],
      },
    },
  });

  console.log('✅ User guide content seeded successfully!');
  console.log(`   - Created ${await prisma.user_guide_categories.count()} categories`);
  console.log(`   - Created ${await prisma.user_guide_articles.count()} articles`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding user guide:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
