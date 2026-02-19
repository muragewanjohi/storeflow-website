/**
 * Demo Store Seed Script
 * 
 * Creates comprehensive demo stores for all 12 business types with:
 * - 50 products and 10 categories per store
 * - 5 customers per store
 * - 10 orders per store
 * - Admin and staff users
 * - Grocery theme installed
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateSlug, generateSKU } from '@/lib/products/validation';
import { generateSlug as generatePageSlug } from '@/lib/content/validation';
import { getThemeDefaults, getBusinessTypeColorScheme } from './theme-defaults';
import { getDemoContentConfig, createDemoPages, createDemoSales, createDemoBlogCategories, createDemoBlogs, createDemoForm, createDemoAttributes } from './demo-content';
import { generateOrderNumber } from '@/lib/orders/utils';
import { getHomepageTemplateData, getHomepageLayout, convertLegacyLayoutToPageBuilder, createDefaultHomepageTemplate } from './homepage-templates';
import { addTenantDomain } from '@/lib/vercel-domains';
import { setStaticOption } from '@/lib/settings/static-options';

// Business types for demo stores
const BUSINESS_TYPES = [
  'Grocery Store / Supermarket',
  'Pharmacy / Health & Wellness',
  'Fashion / Clothing',
  'Electronics & Mobile Phones',
  'Beauty & Personal Care',
  'Home & Kitchen',
  'Baby & Kids Products',
  'Food & Beverages / Restaurant',
  'Convenience Store / Duka',
  'Furniture & Home Decor',
  'Pets',
  'Hardware',
];



/**
 * Create extended demo content (50 products, 10 categories)
 * Uses existing demo content config and extends it to 50 products
 */
async function createExtendedDemoContent(
  tenantId: string,
  businessType: string
): Promise<{ categoryMap: Record<number, string>; productIds: string[] }> {
  const config = getDemoContentConfig(businessType);
  
  // Extend categories to 10
  const baseCategories = config.categories;
  const extendedCategories = [...baseCategories];
  
  // Add more categories to reach 10
  const categoryNames = [
    'Special Offers', 'New Arrivals', 'Best Sellers', 'Featured Products',
    'Seasonal Items', 'Organic Selection', 'Premium Collection', 'Value Packs'
  ];
  
  for (let i = baseCategories.length; i < 10 && i < baseCategories.length + categoryNames.length; i++) {
    extendedCategories.push({
      name: categoryNames[i - baseCategories.length],
      image: baseCategories[0]?.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    });
  }

  const categoryMap: Record<number, string> = {};
  const productIds: string[] = [];

  // Create categories
  for (let i = 0; i < extendedCategories.length; i++) {
    const categoryData = extendedCategories[i];
    const slug = generateSlug(categoryData.name);

    const existingCategory = await prisma.categories.findFirst({
      where: { tenant_id: tenantId, slug },
    });

    if (existingCategory) {
      categoryMap[i] = existingCategory.id;
    } else {
      const category = await prisma.categories.create({
        data: {
          tenant_id: tenantId,
          name: categoryData.name,
          slug,
          image: categoryData.image || null,
          status: 'active',
        },
      });
      categoryMap[i] = category.id;
    }
  }

  // Helper function to get Unsplash image for product based on business type and category
  const getProductImage = (businessType: string, categoryIndex: number, productIndex: number): string => {
    const type = businessType.toLowerCase();
    
    // Get category-specific Unsplash images based on business type
    const categoryImages: Record<string, string[]> = {
      grocery: [
        'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop', // Fruits
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop', // Vegetables
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop', // Dairy
        'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop', // Meat
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop', // Bakery
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', // Beverages
        'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop', // Snacks
        'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop', // Produce
      ],
      pharmacy: [
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop', // Vitamins
        'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=400&fit=crop', // OTC
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop', // Prescription
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop', // Personal Care
        'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop', // Baby Care
      ],
      fashion: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', // Clothing
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', // Jeans
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop', // Jackets
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', // Shoes
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop', // Bags
      ],
      electronics: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop', // Phones
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop', // Laptops
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', // Headphones
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', // Watches
        'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop', // Accessories
      ],
      hardware: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop', // Hand Tools
        'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=400&fit=crop', // Electrical
        'https://images.unsplash.com/photo-1585399000684-d2f72660f092?w=400&h=400&fit=crop', // Plumbing
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop', // Paint & Supplies
        'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?w=400&h=400&fit=crop', // Power Tools
        'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop', // Fasteners
        'https://images.unsplash.com/photo-1617791160536-598cf32026fb?w=400&h=400&fit=crop', // Safety Equipment
        'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop', // Garden & Outdoor
      ],
      beauty: [
        'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop', // Makeup
        'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=400&fit=crop', // Skincare
        'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=400&fit=crop', // Hair Care
        'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop', // Fragrances
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=400&fit=crop', // Body Care
      ],
      home: [
        'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop', // Cookware
        'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop', // Appliances
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop', // Dining
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop', // Storage
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop', // Bakeware
      ],
      baby: [
        'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop', // Clothing
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', // Toys
        'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop', // Feeding
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400&h=400&fit=crop', // Nursery
        'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop', // Bath
      ],
      food: [
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop', // Main Dishes
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop', // Appetizers
        'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop', // Desserts
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', // Beverages
        'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=400&fit=crop', // Salads
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop', // Pizza
        'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=400&fit=crop', // Breakfast
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop', // Coffee
      ],
      convenience: [
        'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop', // Snacks
        'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', // Beverages
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop', // Personal Care
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop', // Household
        'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop', // Dairy
        'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=400&fit=crop', // Canned
      ],
      furniture: [
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop', // Living Room
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop', // Bedroom
        'https://images.unsplash.com/photo-1617104678098-de229db51175?w=400&h=400&fit=crop', // Dining
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop', // Office
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=400&fit=crop', // Lighting
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=400&fit=crop', // Rugs
      ],
      pets: [
        'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop', // Dog Food
        'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=400&h=400&fit=crop', // Cat Toys
        'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=400&fit=crop', // Accessories
        'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop', // Grooming
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop', // Dog Leash
      ],
      shoes: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', // Sneakers
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=400&fit=crop', // Running
        'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop', // Formal
        'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=400&fit=crop', // Boots
        'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=400&fit=crop', // Sandals
        'https://images.unsplash.com/photo-1555274175-6cbf6f3b137b?w=400&h=400&fit=crop', // Kids
      ],
    };
    
    // Determine which image set to use
    let imageSet = categoryImages.grocery; // default
    if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
      imageSet = categoryImages.pharmacy;
    } else if (type.includes('fashion') || type.includes('clothing')) {
      imageSet = categoryImages.fashion;
    } else if (type.includes('electronic') || type.includes('mobile')) {
      imageSet = categoryImages.electronics;
    } else if (type.includes('hardware')) {
      imageSet = categoryImages.hardware;
    } else if (type.includes('beauty') || type.includes('personal care')) {
      imageSet = categoryImages.beauty;
    } else if (type.includes('home') || type.includes('kitchen')) {
      imageSet = categoryImages.home;
    } else if (type.includes('baby') || type.includes('kids')) {
      imageSet = categoryImages.baby;
    } else if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
      imageSet = categoryImages.food;
    } else if (type.includes('convenience') || type.includes('duka')) {
      imageSet = categoryImages.convenience;
    } else if (type.includes('furniture') || type.includes('home decor')) {
      imageSet = categoryImages.furniture;
    } else if (type.includes('pet')) {
      imageSet = categoryImages.pets;
    } else if (type.includes('shoes') || type.includes('footwear')) {
      imageSet = categoryImages.shoes;
    }
    
    // Use category-specific image or cycle through available images
    return imageSet[categoryIndex % imageSet.length] || imageSet[0];
  };

  // Extend products to 50 by creating variations
  const baseProducts = config.products;
  const extendedProducts = [...baseProducts];
  
  // Create variations of existing products to reach 50
  const variations = ['Premium', 'Organic', 'Large', 'Small', 'Family Pack', 'Value Pack', 'Deluxe', 'Standard'];
  let productIndex = baseProducts.length;
  
  while (extendedProducts.length < 50 && productIndex < baseProducts.length * 3) {
    const baseProduct = baseProducts[productIndex % baseProducts.length];
    const variation = variations[Math.floor(productIndex / baseProducts.length) % variations.length];
    const categoryIndex = baseProduct.category_index % extendedCategories.length;
    
    extendedProducts.push({
      name: `${variation} ${baseProduct.name}`,
      description: `${baseProduct.description} ${variation} version.`,
      short_description: `${variation} ${baseProduct.short_description}`,
      price: baseProduct.price * (1 + (Math.random() * 0.3 - 0.15)), // Vary price by ±15%
      sale_price: Math.random() > 0.7 ? baseProduct.price * 0.8 : undefined,
      category_index: categoryIndex,
      // Use Unsplash image based on business type and category
      image: getProductImage(businessType, categoryIndex, productIndex),
      sku: undefined, // Will be generated
    });
    productIndex++;
  }

  // Create products
  for (const productData of extendedProducts.slice(0, 50)) {
    const categoryId = categoryMap[productData.category_index];
    if (!categoryId) continue;

    const slug = generateSlug(productData.name);
    const existingProduct = await prisma.products.findFirst({
      where: { tenant_id: tenantId, slug },
    });

    if (!existingProduct) {
      const sku = productData.sku || generateSKU(productData.name, tenantId);
      const product = await prisma.products.create({
        data: {
          tenant_id: tenantId,
          name: productData.name,
          slug,
          description: productData.description,
          short_description: productData.short_description,
          price: Number(productData.price.toFixed(2)),
          sale_price: productData.sale_price ? Number(productData.sale_price.toFixed(2)) : null,
          sku,
          stock_quantity: Math.floor(Math.random() * 50) + 10,
          status: 'active',
          image: productData.image || null,
          gallery: [],
          category_id: categoryId,
          brand_id: null,
          created_by: null,
          metadata: {},
        },
      });
      productIds.push(product.id);
    }
  }

  return { categoryMap, productIds };
}


/**
 * Create demo customers (5 customers)
 */
export async function createDemoCustomers(
  tenantId: string
): Promise<string[]> {
  const customerData = [
    { name: 'John Mwangi', email: 'john.mwangi@dukanest.com', mobile: '+254700000001' },
    { name: 'Sarah Wanjiku', email: 'sarah.wanjiku@dukanest.com', mobile: '+254700000002' },
    { name: 'David Ochieng', email: 'david.ochieng@dukanest.com', mobile: '+254700000003' },
    { name: 'Grace Akinyi', email: 'grace.akinyi@dukanest.com', mobile: '+254700000004' },
    { name: 'Peter Kamau', email: 'peter.kamau@dukanest.com', mobile: '+254700000005' },
  ];

  const customerIds: string[] = [];

  for (const data of customerData) {
    const existingCustomer = await prisma.customers.findFirst({
      where: { tenant_id: tenantId, email: data.email },
    });

    if (existingCustomer) {
      customerIds.push(existingCustomer.id);
    } else {
      const hashedPassword = await bcrypt.hash('Demo123!', 10);
      const emailVerifyToken = crypto.randomBytes(32).toString('hex');

      const customer = await prisma.customers.create({
        data: {
          tenant_id: tenantId,
          name: data.name,
          email: data.email,
          username: data.email.split('@')[0],
          password: hashedPassword,
          mobile: data.mobile,
          email_verified: true,
          email_verify_token: emailVerifyToken,
          country_code: 'KE',
        },
      });
      customerIds.push(customer.id);
    }
  }

  return customerIds;
}

/**
 * Create demo orders (10 orders)
 */
export async function createDemoOrders(
  tenantId: string,
  customerIds: string[],
  productIds: string[]
): Promise<void> {
  const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
  const paymentStatuses = ['pending', 'paid', 'failed'];
  const paymentGateways = ['mpesa', 'card', 'cash_on_delivery'];

  for (let i = 0; i < 10; i++) {
    const customerId = customerIds[i % customerIds.length];
    const customer = await prisma.customers.findUnique({
      where: { id: customerId },
      select: { name: true, email: true, mobile: true },
    });

    if (!customer) continue;

    // Select 1-4 random products
    const numProducts = Math.floor(Math.random() * 4) + 1;
    const selectedProducts = productIds
      .sort(() => Math.random() - 0.5)
      .slice(0, numProducts);

    const orderProducts = [];
    let totalAmount = 0;

    for (const productId of selectedProducts) {
      const product = await prisma.products.findUnique({
        where: { id: productId },
        select: { price: true, sale_price: true },
      });

      if (!product) continue;

      const price = product.sale_price ? Number(product.sale_price) : Number(product.price);
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemTotal = price * quantity;

      orderProducts.push({
        product_id: productId,
        quantity,
        price: price,
        total: itemTotal,
      });

      totalAmount += itemTotal;
    }

    if (orderProducts.length === 0) continue;

    // Generate unique order number
    let orderNumber = generateOrderNumber();
    let existingOrder = await prisma.orders.findUnique({
      where: { order_number: orderNumber },
    });
    
    // Ensure order number is unique
    while (existingOrder) {
      orderNumber = generateOrderNumber();
      existingOrder = await prisma.orders.findUnique({
        where: { order_number: orderNumber },
      });
    }

    const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
    const paymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
    const paymentGateway = paymentGateways[Math.floor(Math.random() * paymentGateways.length)];

    const shippingAddress = {
      name: customer.name,
      address: `${Math.floor(Math.random() * 999) + 1} Main Street`,
      city: 'Nairobi',
      state: 'Nairobi',
      country: 'Kenya',
      postal_code: '00100',
      phone: customer.mobile,
    };

    const order = await prisma.orders.create({
      data: {
        tenant_id: tenantId,
        order_number: orderNumber,
        user_id: customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.mobile,
        total_amount: Number(totalAmount.toFixed(2)),
        status,
        payment_status: paymentStatus,
        payment_gateway: paymentGateway,
        shipping_address: shippingAddress as any,
        billing_address: shippingAddress as any,
        checkout_type: 'delivery',
        order_products: {
          create: orderProducts.map((op) => ({
            tenant_id: tenantId,
            product_id: op.product_id,
            quantity: op.quantity,
            price: op.price,
            total: op.total,
          })),
        },
      },
    });
  }
}

/**
 * Create or update admin user for demo stores
 * Creates one admin user that can access all demo stores
 */
async function createAdminUser(
  tenantId: string
): Promise<string> {
  const adminClient = createAdminClient();
  const email = 'storeadmin@dukanest.com';
  const password = 'Avatar.12';

  // Check if user exists
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const existingUser = users.find((u: any) => u.email === email);

  if (existingUser) {
    // Update metadata to include this tenant_id in array
    const existingTenantIds = Array.isArray(existingUser.user_metadata?.tenant_ids) 
      ? existingUser.user_metadata.tenant_ids 
      : existingUser.user_metadata?.tenant_id 
        ? [existingUser.user_metadata.tenant_id] 
        : [];
    
    if (!existingTenantIds.includes(tenantId)) {
      existingTenantIds.push(tenantId);
    }

    await adminClient.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        ...existingUser.user_metadata,
        tenant_id: tenantId, // Set primary tenant_id
        tenant_ids: existingTenantIds, // Store all tenant IDs
        role: 'tenant_admin',
        name: 'Store Admin',
      },
    });
    return existingUser.id;
  }

  // Create new user
  const { data: authUser, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'tenant_admin',
      tenant_id: tenantId,
      tenant_ids: [tenantId], // Store as array for multi-tenant access
      name: 'Store Admin',
    },
  });

  if (error || !authUser) {
    throw new Error(`Failed to create admin user: ${error?.message}`);
  }

  return authUser.user.id;
}

/**
 * Create or update staff user for demo stores
 * Creates one staff user that can access all demo stores with view-only permissions
 */
async function createStaffUser(
  tenantId: string
): Promise<string> {
  const adminClient = createAdminClient();
  const email = 'tester@dukanest.com';
  const password = 'Avatar.12';

  // Check if user exists
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  const existingUser = users.find((u: any) => u.email === email);

  if (existingUser) {
    // Update metadata to include this tenant_id in array
    const existingTenantIds = Array.isArray(existingUser.user_metadata?.tenant_ids) 
      ? existingUser.user_metadata.tenant_ids 
      : existingUser.user_metadata?.tenant_id 
        ? [existingUser.user_metadata.tenant_id] 
        : [];
    
    if (!existingTenantIds.includes(tenantId)) {
      existingTenantIds.push(tenantId);
    }

    await adminClient.auth.admin.updateUserById(existingUser.id, {
      user_metadata: {
        ...existingUser.user_metadata,
        tenant_id: tenantId, // Set primary tenant_id
        tenant_ids: existingTenantIds, // Store all tenant IDs
        role: 'tenant_staff',
        name: 'Tester',
        customPermissions: ['view_orders', 'view_products', 'view_customers'],
      },
    });
    return existingUser.id;
  }

  // Create new user
  const { data: authUser, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'tenant_staff',
      tenant_id: tenantId,
      tenant_ids: [tenantId], // Store as array for multi-tenant access
      name: 'Tester',
      customPermissions: ['view_orders', 'view_products', 'view_customers'],
    },
  });

  if (error || !authUser) {
    throw new Error(`Failed to create staff user: ${error?.message}`);
  }

  return authUser.user.id;
}

/**
 * Seed an existing tenant with full demo content
 * This is used when creating a demo store from the admin form
 */
export async function seedExistingDemoStore(
  tenantId: string,
  businessType: string = 'Grocery Store / Supermarket'
): Promise<void> {
  const startTime = Date.now();
  console.log(`[Demo Store Seed] 🚀 Starting seed for existing tenant: ${tenantId}`);
  console.log(`[Demo Store Seed] Business type: ${businessType}`);

  try {
    // Get tenant
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    console.log(`[Demo Store Seed] Seeding tenant: ${tenant.name} (${tenant.subdomain})`);

    // Get Grocery theme
    const theme = await prisma.themes.findFirst({
      where: { slug: 'grocery' },
    });

    if (!theme) {
      throw new Error('Grocery theme not found');
    }

    // Check if theme is already installed
    const existingTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenantId,
        theme_id: theme.id,
      },
    });

    if (!existingTheme) {
      // Install theme with business type colors
      const themeDefaults = getThemeDefaults(theme.slug);
      const businessColors = getBusinessTypeColorScheme(businessType);
      const finalColors = businessColors ? { ...themeDefaults?.colors, ...businessColors } : themeDefaults?.colors;

      await prisma.tenant_themes.create({
        data: {
          tenant_id: tenantId,
          theme_id: theme.id,
          is_active: true,
          custom_colors: finalColors || {},
          custom_fonts: themeDefaults?.fonts || {},
        },
      });
      console.log(`[Demo Store Seed] ✅ Installed theme: ${theme.slug}`);
    } else {
      console.log(`[Demo Store Seed] ⏭️  Theme already installed`);
    }

    // Set store logo (use default logo from public folder)
    try {
      await setStaticOption(tenantId, 'store_logo', '/logo.png');
      console.log(`[Demo Store Seed] ✅ Set store logo: /logo.png`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error setting store logo:`, error.message);
    }

    // Create homepage with complete sections
    try {
      const pageTitle = ''; // Empty title to allow full customization via page builder
      const pageSlug = generatePageSlug('home');

      const existingHomepage = await prisma.pages.findFirst({
        where: { 
          tenant_id: tenantId, 
          OR: [
            { slug: pageSlug },
            { slug: 'home' },
          ]
        },
      });

      if (!existingHomepage) {
        // Use the complete grocery homepage template with all 8 sections, customized for business type
        const pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name, businessType);

        await prisma.pages.create({
          data: {
            tenant_id: tenantId,
            title: pageTitle,
            slug: pageSlug,
            content: JSON.stringify(pageBuilderData),
            status: 'published',
            meta_title: `${tenant.name} - Home`,
            meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
          },
        });
        console.log(`[Demo Store Seed] ✅ Created complete homepage with ${pageBuilderData.sections?.length || 0} sections`);
      } else {
        console.log(`[Demo Store Seed] ⏭️  Homepage already exists, skipping creation`);
      }
    } catch (error: any) {
      if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
        console.log(`[Demo Store Seed] ⏭️  Homepage already exists (unique constraint), skipping`);
      } else {
        console.error(`[Demo Store Seed] ⚠️  Error creating homepage:`, error.message);
      }
    }

    // Create extended demo content (50 products, 10 categories)
    console.log(`[Demo Store Seed] 📦 Starting to create extended demo content (50 products, 10 categories)...`);
    let categoryMap: Record<number, string> = {};
    let productIds: string[] = [];
    
    try {
      const result = await createExtendedDemoContent(tenantId, businessType);
      categoryMap = result.categoryMap;
      productIds = result.productIds;
      console.log(`[Demo Store Seed] ✅ Created ${Object.keys(categoryMap).length} categories and ${productIds.length} products`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ❌ Error creating extended demo content:`, error.message);
      console.error(`[Demo Store Seed] Error stack:`, error?.stack);
      throw error; // Re-throw to stop execution if products/categories fail
    }

    // Create additional demo content (pages, sales, blogs, etc.)
    const tenantName = tenant.name;
    
    console.log(`[Demo Store Seed] 📄 Creating additional demo content (pages, sales, blogs, attributes, forms)...`);
    
    // Create pages, sales, blogs, blog categories, and forms
    let pagesCreated = 0;
    let salesCreated = 0;
    let blogCategoriesMap: Record<string, string> = {};
    let blogsCreated = 0;
    let formsCreated = 0;
    let attributesCreated = 0;
    
    try {
      pagesCreated = await createDemoPages(prisma, tenantId, tenantName);
      console.log(`[Demo Store Seed] ✅ Created ${pagesCreated} pages`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error creating pages:`, error.message);
    }
    
    try {
      // Pass productIds to link products to sales
      salesCreated = await createDemoSales(prisma, tenantId, productIds);
      console.log(`[Demo Store Seed] ✅ Created ${salesCreated} sales`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error creating sales:`, error.message);
    }
    
    try {
      blogCategoriesMap = await createDemoBlogCategories(prisma, tenantId);
      console.log(`[Demo Store Seed] ✅ Created ${Object.keys(blogCategoriesMap).length} blog categories`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error creating blog categories:`, error.message);
    }
    
    try {
      blogsCreated = await createDemoBlogs(prisma, tenantId, blogCategoriesMap);
      console.log(`[Demo Store Seed] ✅ Created ${blogsCreated} blogs`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error creating blogs:`, error.message);
    }
    
    try {
      formsCreated = await createDemoForm(prisma, tenantId);
      console.log(`[Demo Store Seed] ✅ Created ${formsCreated} forms`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error creating forms:`, error.message);
    }
    
    try {
      // Create attributes
      attributesCreated = await createDemoAttributes(prisma, tenantId, businessType);
      console.log(`[Demo Store Seed] ✅ Created ${attributesCreated} attributes`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ⚠️  Error creating attributes:`, error.message);
    }

    console.log(`[Demo Store Seed] ✅ Created additional content:`, {
      pages: pagesCreated,
      sales: salesCreated,
      blogs: blogsCreated,
      blogCategories: Object.keys(blogCategoriesMap).length,
      forms: formsCreated,
      attributes: attributesCreated,
    });

    // Create customers
    console.log(`[Demo Store Seed] 👥 Creating 5 customers...`);
    let customerIds: string[] = [];
    try {
      customerIds = await createDemoCustomers(tenantId);
      console.log(`[Demo Store Seed] ✅ Created ${customerIds.length} customers`);
    } catch (error: any) {
      console.error(`[Demo Store Seed] ❌ Error creating customers:`, error.message);
      console.error(`[Demo Store Seed] Error stack:`, error?.stack);
      // Continue even if customers fail, but orders will fail
    }

    // Create orders (only if we have customers and products)
    if (customerIds.length > 0 && productIds.length > 0) {
      console.log(`[Demo Store Seed] 🛒 Creating 10 orders...`);
      try {
        await createDemoOrders(tenantId, customerIds, productIds);
        console.log(`[Demo Store Seed] ✅ Created 10 orders`);
      } catch (error: any) {
        console.error(`[Demo Store Seed] ❌ Error creating orders:`, error.message);
        console.error(`[Demo Store Seed] Error stack:`, error?.stack);
      }
    } else {
      console.warn(`[Demo Store Seed] ⚠️  Skipping order creation: customers=${customerIds.length}, products=${productIds.length}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Demo Store Seed] ✅ Completed seeding tenant ${tenantId} in ${duration}s`);
  } catch (error: any) {
    console.error(`[Demo Store Seed] ❌ Error seeding tenant ${tenantId}:`, error.message);
    throw error;
  }
}

/**
 * Create a demo store for a business type
 */
export async function createDemoStore(businessType: string): Promise<void> {
  // Create subdomain: "demo" + business type (no hyphens, no special characters)
  // Example: "Grocery Store / Supermarket" -> "demogrocerystoresupermarket"
  const businessTypeSlug = businessType.toLowerCase()
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^a-z0-9]/g, ''); // Remove all special characters, keep only alphanumeric
  
  const subdomain = `demo${businessTypeSlug}`.substring(0, 63); // Max 63 chars for subdomain

  const startTime = Date.now();
  console.log(`[Demo Store] 🚀 Starting creation for: ${businessType} (${subdomain})`);

  // Check if tenant already exists
  const existingTenant = await prisma.tenants.findFirst({
    where: { subdomain },
  });

  if (existingTenant) {
    console.log(`[Demo Store] ⏭️  Tenant ${subdomain} already exists, skipping...`);
    return;
  }

  // Create tenant
  const tenant = await prisma.tenants.create({
    data: {
      name: `${businessType} Demo Store`,
      subdomain,
      contact_email: 'demo@dukanest.com',
      status: 'active',
      // Store demo flag and business type in data JSON field
      data: { 
        is_demo: true,
        business_type: businessType,
      },
    },
  });

  console.log(`[Demo Store] ✅ Created tenant: ${tenant.id} (${tenant.name})`);

  // Add subdomain to Vercel (if configured)
  const projectId = process.env.VERCEL_PROJECT_ID;
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com';
  const fullDomain = `${subdomain}.${baseDomain}`;
  
  if (projectId) {
    try {
      console.log(`[Demo Store] 🌐 Adding domain to Vercel: ${fullDomain}...`);
      await addTenantDomain(fullDomain, projectId);
      console.log(`[Demo Store] ✅ Successfully added domain ${fullDomain} to Vercel`);
    } catch (error: any) {
      // Log error but don't fail tenant creation
      console.error(`[Demo Store] ⚠️  Failed to add domain ${fullDomain} to Vercel:`, error?.message || error);
      console.error(`[Demo Store] ⚠️  Domain can be added manually later if needed`);
    }
  } else {
    console.log(`[Demo Store] ⚠️  VERCEL_PROJECT_ID not set. Domain ${fullDomain} will not be added to Vercel automatically.`);
  }

  // Get Grocery theme
  const theme = await prisma.themes.findFirst({
    where: { slug: 'grocery' },
  });

  if (!theme) {
    throw new Error('Grocery theme not found');
  }

  // Install theme with business type colors
  const themeDefaults = getThemeDefaults(theme.slug);
  const businessColors = getBusinessTypeColorScheme(businessType);
  const finalColors = businessColors ? { ...themeDefaults?.colors, ...businessColors } : themeDefaults?.colors;

  const tenantTheme = await prisma.tenant_themes.create({
    data: {
      tenant_id: tenant.id,
      theme_id: theme.id,
      is_active: true,
      custom_colors: finalColors || {},
      custom_fonts: themeDefaults?.fonts || {},
    },
  });

  console.log(`[Demo Store] Installed theme: ${theme.slug}`);

  // Create homepage with complete sections
  try {
    const pageTitle = 'Home';
    const pageSlug = generatePageSlug('home');

    // Check if homepage already exists (by slug or by checking for home page)
    const existingHomepage = await prisma.pages.findFirst({
      where: { 
        tenant_id: tenant.id, 
        OR: [
          { slug: pageSlug },
          { slug: 'home' },
        ]
      },
    });

    if (!existingHomepage) {
      // Use the complete grocery homepage template with all sections, customized for business type
      const pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name, businessType);

      await prisma.pages.create({
        data: {
          tenant_id: tenant.id,
          title: pageTitle,
          slug: pageSlug,
          content: JSON.stringify(pageBuilderData),
          status: 'published',
          meta_title: `${tenant.name} - Home`,
          meta_description: `Welcome to ${tenant.name}. Shop our amazing products and discover great deals.`,
        },
      });
      console.log(`[Demo Store] ✅ Created complete homepage with ${pageBuilderData.sections?.length || 0} sections`);
    } else {
      console.log(`[Demo Store] ⏭️  Homepage already exists, skipping creation`);
    }
  } catch (error: any) {
    // If unique constraint error, homepage might already exist - that's okay
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      console.log(`[Demo Store] ⏭️  Homepage already exists (unique constraint), skipping`);
    } else {
      console.error(`[Demo Store] ⚠️  Error creating homepage:`, error.message);
      // Don't throw - continue with other content creation
    }
  }

  // Create extended demo content (50 products, 10 categories)
  const { categoryMap, productIds } = await createExtendedDemoContent(
    tenant.id,
    businessType
  );

  console.log(`[Demo Store] Created ${Object.keys(categoryMap).length} categories and ${productIds.length} products`);

  // Create additional demo content (pages, sales, blogs, etc.)
  // Get tenant name for pages
  const tenantName = tenant.name;
  
  // Create pages, sales, blogs, blog categories, and forms
  const pagesCreated = await createDemoPages(prisma, tenant.id, tenantName);
  const salesCreated = await createDemoSales(prisma, tenant.id);
  const blogCategoriesMap = await createDemoBlogCategories(prisma, tenant.id);
  const blogsCreated = await createDemoBlogs(prisma, tenant.id, blogCategoriesMap);
  const formsCreated = await createDemoForm(prisma, tenant.id);
  
  // Create attributes
  const attributesCreated = await createDemoAttributes(prisma, tenant.id, businessType);

  console.log(`[Demo Store] Created additional content:`, {
    pages: pagesCreated,
    sales: salesCreated,
    blogs: blogsCreated,
    blogCategories: Object.keys(blogCategoriesMap).length,
    forms: formsCreated,
    attributes: attributesCreated,
  });

  // Create customers
  const customerIds = await createDemoCustomers(tenant.id);
  console.log(`[Demo Store] Created ${customerIds.length} customers`);

  // Create orders
  await createDemoOrders(tenant.id, customerIds, productIds);
  console.log(`[Demo Store] Created 10 orders`);

  // Create admin user (shared across all demo stores)
  const adminUserId = await createAdminUser(tenant.id);
  await prisma.tenants.update({
    where: { id: tenant.id },
    data: { user_id: adminUserId },
  });
  console.log(`[Demo Store] Linked admin user: storeadmin@dukanest.com (password: Avatar.12)`);

  // Create staff user (shared across all demo stores)
  await createStaffUser(tenant.id);
  console.log(`[Demo Store] Linked staff user: tester@dukanest.com (password: Avatar.12)`);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Demo Store] ✅ Completed: ${businessType} in ${duration}s`);
}

/**
 * Seed all demo stores
 */
export async function seedAllDemoStores(): Promise<void> {
  const startTime = Date.now();
  console.log('[Demo Store Seed] 🚀 Starting seed process for all business types...');
  console.log(`[Demo Store Seed] Total stores to create: ${BUSINESS_TYPES.length}`);

  const results = {
    success: [] as string[],
    failed: [] as { type: string; error: string }[],
    skipped: [] as string[],
  };

  for (let i = 0; i < BUSINESS_TYPES.length; i++) {
    const businessType = BUSINESS_TYPES[i];
    const progress = `[${i + 1}/${BUSINESS_TYPES.length}]`;
    
    try {
      console.log(`[Demo Store Seed] ${progress} Processing: ${businessType}...`);
      await createDemoStore(businessType);
      results.success.push(businessType);
      console.log(`[Demo Store Seed] ${progress} ✅ Success: ${businessType}`);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error(`[Demo Store Seed] ${progress} ❌ Error creating ${businessType}:`, errorMessage);
      console.error(`[Demo Store Seed] ${progress} Stack:`, error?.stack);
      results.failed.push({ type: businessType, error: errorMessage });
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n[Demo Store Seed] ============================================');
  console.log(`[Demo Store Seed] ✅ Seed process completed in ${duration}s`);
  console.log(`[Demo Store Seed] 📊 Results:`);
  console.log(`[Demo Store Seed]   - Success: ${results.success.length}`);
  console.log(`[Demo Store Seed]   - Failed: ${results.failed.length}`);
  console.log(`[Demo Store Seed]   - Skipped: ${results.skipped.length}`);
  
  if (results.success.length > 0) {
    console.log(`[Demo Store Seed] ✅ Successful stores:`, results.success.join(', '));
  }
  
  if (results.failed.length > 0) {
    console.log(`[Demo Store Seed] ❌ Failed stores:`);
    results.failed.forEach(({ type, error }) => {
      console.log(`[Demo Store Seed]   - ${type}: ${error}`);
    });
  }
  
  console.log('[Demo Store Seed] ============================================\n');
}
