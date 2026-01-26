/**
 * Demo Store Data Seeding
 * 
 * Seeds a tenant with sample products, categories, and content for demo purposes
 */

import { prisma } from '@/lib/prisma/client';

interface DemoProduct {
  name: string;
  description: string;
  price: number;
  sku: string;
  stock_quantity: number;
  image?: string;
  category?: string;
}

const DEMO_CATEGORIES = [
  { name: 'Electronics', slug: 'electronics', description: 'Latest gadgets and tech' },
  { name: 'Fashion', slug: 'fashion', description: 'Trendy clothing and accessories' },
  { name: 'Home & Living', slug: 'home-living', description: 'Everything for your home' },
  { name: 'Sports', slug: 'sports', description: 'Sports equipment and gear' },
];

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling headphones with 30-hour battery life. Perfect for music lovers and professionals.',
    price: 129.99,
    sku: 'WH-001',
    stock_quantity: 50,
    category: 'Electronics',
  },
  {
    name: 'Smart Watch Pro',
    description: 'Track your fitness, receive notifications, and stay connected. Water-resistant design with heart rate monitor.',
    price: 299.99,
    sku: 'SW-002',
    stock_quantity: 30,
    category: 'Electronics',
  },
  {
    name: 'Classic Denim Jacket',
    description: 'Timeless denim jacket made from premium cotton. Perfect for any season and style.',
    price: 79.99,
    sku: 'DJ-003',
    stock_quantity: 25,
    category: 'Fashion',
  },
  {
    name: 'Leather Crossbody Bag',
    description: 'Elegant leather bag with adjustable strap. Spacious interior with multiple compartments.',
    price: 149.99,
    sku: 'LB-004',
    stock_quantity: 15,
    category: 'Fashion',
  },
  {
    name: 'Modern Coffee Table',
    description: 'Sleek coffee table with glass top and metal legs. Perfect centerpiece for your living room.',
    price: 249.99,
    sku: 'CT-005',
    stock_quantity: 10,
    category: 'Home & Living',
  },
  {
    name: 'Yoga Mat Premium',
    description: 'Non-slip yoga mat with extra cushioning. Eco-friendly materials, easy to clean.',
    price: 39.99,
    sku: 'YM-006',
    stock_quantity: 40,
    category: 'Sports',
  },
  {
    name: 'Running Shoes Pro',
    description: 'Lightweight running shoes with advanced cushioning technology. Perfect for long-distance running.',
    price: 119.99,
    sku: 'RS-007',
    stock_quantity: 35,
    category: 'Sports',
  },
  {
    name: 'Portable Phone Charger',
    description: '10,000mAh power bank with fast charging. Compact design, perfect for travel.',
    price: 29.99,
    sku: 'PC-008',
    stock_quantity: 60,
    category: 'Electronics',
  },
];

/**
 * Seed demo store with sample data
 */
export async function seedDemoStoreData(tenantId: string): Promise<void> {
  console.log(`🌱 Seeding demo data for tenant: ${tenantId}`);

  try {
    // 1. Create categories
    const categoryMap = new Map<string, string>();
    
    for (const cat of DEMO_CATEGORIES) {
      const category = await prisma.categories.create({
        data: {
          tenant_id: tenantId,
          name: cat.name,
          slug: cat.slug,
          status: 'active',
        },
      });
      categoryMap.set(cat.name, category.id);
      console.log(`✅ Created category: ${cat.name}`);
    }

    // 2. Create products
    for (const product of DEMO_PRODUCTS) {
      const categoryId = product.category ? categoryMap.get(product.category) : undefined;
      
      await prisma.products.create({
        data: {
          tenant_id: tenantId,
          name: product.name,
          description: product.description,
          price: product.price,
          sku: product.sku,
          stock_quantity: product.stock_quantity,
          status: 'active',
          category_id: categoryId || null,
          image: product.image || `https://images.unsplash.com/photo-${Math.random().toString(36).substring(7)}?w=800&h=600&fit=crop`,
        },
      });
      console.log(`✅ Created product: ${product.name}`);
    }

    // 3. Create a sample blog post
    await prisma.blogs.create({
      data: {
        tenant_id: tenantId,
        title: 'Welcome to Our Demo Store',
        slug: 'welcome-to-our-demo-store',
        excerpt: 'This is a demo store showcasing the features and capabilities of our platform.',
        content: '<p>This is a <strong>demo store</strong> created to showcase the features of our e-commerce platform. You can browse products, explore categories, and see how everything works.</p><p>All products and content shown here are for demonstration purposes only.</p>',
        status: 'published',
        meta_title: 'Welcome to Our Demo Store',
        meta_description: 'Explore our demo store and see what our platform can do for your business.',
      },
    });
    console.log('✅ Created demo blog post');

    // 4. Create a sample page (use 'about' slug, not 'about-us')
    // Note: This page creation is optional and may conflict with theme installation pages
    // The about page should be created by theme installation with slug 'about'
    // Skipping to avoid duplicate pages
    console.log('ℹ️ Skipping demo page creation - about page should be created by theme installation');

    console.log(`✅ Demo store seeding completed for tenant: ${tenantId}`);
  } catch (error) {
    console.error('❌ Error seeding demo store:', error);
    throw error;
  }
}

/**
 * Reset demo store to original state
 * Deletes all tenant data and re-seeds
 */
export async function resetDemoStore(tenantId: string): Promise<void> {
  console.log(`🔄 Resetting demo store: ${tenantId}`);

  try {
    // Delete all tenant-scoped data
    await Promise.all([
      prisma.products.deleteMany({ where: { tenant_id: tenantId } }),
      prisma.categories.deleteMany({ where: { tenant_id: tenantId } }),
      prisma.blogs.deleteMany({ where: { tenant_id: tenantId } }),
      prisma.pages.deleteMany({ where: { tenant_id: tenantId } }),
      prisma.orders.deleteMany({ where: { tenant_id: tenantId } }),
      prisma.cart_items.deleteMany({ where: { tenant_id: tenantId } }),
      prisma.customers.deleteMany({ where: { tenant_id: tenantId } }),
    ]);

    console.log('✅ Cleared existing demo data');

    // Re-seed with fresh data
    await seedDemoStoreData(tenantId);
    
    console.log(`✅ Demo store reset completed for tenant: ${tenantId}`);
  } catch (error) {
    console.error('❌ Error resetting demo store:', error);
    throw error;
  }
}

/**
 * Check if a tenant is a demo store
 */
export function isDemoStore(tenant: { data?: any }): boolean {
  return tenant.data?.isDemo === true;
}

