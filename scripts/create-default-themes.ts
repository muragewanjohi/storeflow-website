/**
 * Script to create default themes
 * 
 * Run with: npx tsx scripts/create-default-themes.ts
 */

/**
 * Script to create default themes
 * 
 * Run with: npx tsx scripts/create-default-themes.ts
 * 
 * NOTE: If this script fails with connection errors, you can seed themes using:
 * 1. SQL Migration: Run supabase/migrations/006_seed_default_themes.sql in Supabase SQL Editor
 * 2. Prisma Studio: npx prisma studio (then manually create themes)
 * 3. Supabase Dashboard: Use the SQL editor to run the migration SQL
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local (same as prisma.config.ts)
config({ path: resolve(process.cwd(), '.env.local') });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set!');
  console.error('Please ensure .env.local file exists and contains DATABASE_URL');
  process.exit(1);
}

console.log('✓ DATABASE_URL loaded:', process.env.DATABASE_URL ? 'Yes' : 'No');
console.log('✓ Database host:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown');

// Use the shared Prisma client from lib/prisma/client
// But for scripts, we'll create a new instance with explicit connection
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function createDefaultThemes() {
  try {
    console.log('Creating default themes...');
    console.log('Testing database connection...');

    // Test connection first
    await prisma.$connect();
    console.log('✓ Database connection successful');

    // Check if themes already exist
    const existingThemes = await prisma.themes.findMany({
      where: {
        slug: {
          in: ['default', 'minimal', 'modern'],
        },
      },
    });

    if (existingThemes.length > 0) {
      console.log('Default themes already exist. Skipping creation.');
      console.log('Existing themes:', existingThemes.map((t: { title: string }) => t.title));
      return;
    }

    // Default Theme
    const defaultTheme = await prisma.themes.create({
      data: {
        title: 'Default Theme',
        slug: 'default',
        description: 'A clean and professional default theme perfect for any store',
        author: 'StoreFlow',
        version: '1.0.0',
        status: true,
        is_premium: false,
        unique_key: 'default-theme-v1',
        colors: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
          accent: '#10b981',
          background: '#ffffff',
          text: '#1f2937',
          muted: '#6b7280',
        },
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          baseFontSize: 16,
          headingWeight: 700,
          bodyWeight: 400,
        },
        config: {
          features: {
            megaMenu: true,
            quickView: true,
            wishlist: true,
            compareProducts: false,
            ajaxSearch: true,
            stickyCart: true,
          },
        },
      },
    });

    console.log('✅ Created Default Theme:', defaultTheme.id);

    // Minimal Theme
    const minimalTheme = await prisma.themes.create({
      data: {
        title: 'Minimal Theme',
        slug: 'minimal',
        description: 'A minimal and elegant theme with clean lines and simple design',
        author: 'StoreFlow',
        version: '1.0.0',
        status: true,
        is_premium: false,
        unique_key: 'minimal-theme-v1',
        colors: {
          primary: '#000000',
          secondary: '#6b7280',
          accent: '#000000',
          background: '#ffffff',
          text: '#1f2937',
          muted: '#9ca3af',
        },
        typography: {
          headingFont: 'Inter',
          bodyFont: 'Inter',
          baseFontSize: 16,
          headingWeight: 600,
          bodyWeight: 400,
        },
        config: {
          features: {
            megaMenu: false,
            quickView: false,
            wishlist: true,
            compareProducts: false,
            ajaxSearch: false,
            stickyCart: false,
          },
        },
      },
    });

    console.log('✅ Created Minimal Theme:', minimalTheme.id);

    // Modern Theme
    const modernTheme = await prisma.themes.create({
      data: {
        title: 'Modern Theme',
        slug: 'modern',
        description: 'A modern theme with bold colors and contemporary design',
        author: 'StoreFlow',
        version: '1.0.0',
        status: true,
        is_premium: false,
        unique_key: 'modern-theme-v1',
        colors: {
          primary: '#ec4899',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          background: '#f9fafb',
          text: '#111827',
          muted: '#6b7280',
        },
        typography: {
          headingFont: 'Poppins',
          bodyFont: 'Inter',
          baseFontSize: 16,
          headingWeight: 700,
          bodyWeight: 400,
        },
        config: {
          features: {
            megaMenu: true,
            quickView: true,
            wishlist: true,
            compareProducts: true,
            ajaxSearch: true,
            stickyCart: true,
          },
        },
      },
    });

    console.log('✅ Created Modern Theme:', modernTheme.id);

    console.log('\n🎉 All default themes created successfully!');
    console.log('\nThemes Summary:');
    console.log('1. Default Theme - Free - Professional and clean');
    console.log('2. Minimal Theme - Free - Elegant and simple');
    console.log('3. Modern Theme - Free - Bold and contemporary');
  } catch (error: any) {
    console.error('\n❌ Error creating default themes:', error.message);
    
    if (error.code === 'P5010') {
      console.error('\n⚠️  Connection Error: Cannot connect to database');
      console.error('This might be due to:');
      console.error('  1. Network connectivity issues');
      console.error('  2. DATABASE_URL pointing to Prisma Data Proxy/Accelerate (not supported in scripts)');
      console.error('  3. Firewall blocking the connection');
      console.error('\n💡 Alternative: You can create themes manually via:');
      console.error('  - Prisma Studio: npx prisma studio');
      console.error('  - Direct SQL: Run the SQL in supabase/migrations/001_create_theme_schema.sql');
      console.error('  - Supabase Dashboard: Use the SQL editor');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createDefaultThemes()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

