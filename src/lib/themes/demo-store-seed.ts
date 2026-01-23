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
      image: baseProduct.image,
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
async function createDemoCustomers(
  tenantId: string
): Promise<string[]> {
  const customerData = [
    { name: 'John Mwangi', email: 'john.mwangi@example.com', mobile: '+254700000001' },
    { name: 'Sarah Wanjiku', email: 'sarah.wanjiku@example.com', mobile: '+254700000002' },
    { name: 'David Ochieng', email: 'david.ochieng@example.com', mobile: '+254700000003' },
    { name: 'Grace Akinyi', email: 'grace.akinyi@example.com', mobile: '+254700000004' },
    { name: 'Peter Kamau', email: 'peter.kamau@example.com', mobile: '+254700000005' },
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
async function createDemoOrders(
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
 * Create a demo store for a business type
 */
export async function createDemoStore(businessType: string): Promise<void> {
  const subdomain = businessType.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 63) + '-demo';

  console.log(`[Demo Store] Creating demo store for: ${businessType} (${subdomain})`);

  // Check if tenant already exists
  const existingTenant = await prisma.tenants.findFirst({
    where: { subdomain },
  });

  if (existingTenant) {
    console.log(`[Demo Store] Tenant ${subdomain} already exists, skipping...`);
    return;
  }

  // Create tenant
  const tenant = await prisma.tenants.create({
    data: {
      name: `${businessType} Demo Store`,
      subdomain,
      contact_email: 'demo@dukanest.com',
      status: 'active',
      // Store demo flag in data JSON field
      data: { is_demo: true },
    },
  });

  console.log(`[Demo Store] Created tenant: ${tenant.id}`);

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

  // Create homepage
  try {
    const templateData = getHomepageTemplateData(theme.slug);
    const pageTitle = templateData?.title || `Home - ${tenant.name}`;
    const pageSlug = generatePageSlug('home');

    const existingHomepage = await prisma.pages.findFirst({
      where: { tenant_id: tenant.id, slug: pageSlug },
    });

    if (!existingHomepage) {
      const layoutData = getHomepageLayout(theme.slug);
      let pageBuilderData;
      if (layoutData && layoutData.length > 0) {
        pageBuilderData = convertLegacyLayoutToPageBuilder(layoutData);
      } else {
        pageBuilderData = createDefaultHomepageTemplate(theme.slug, tenant.name);
      }

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
      console.log(`[Demo Store] Created homepage`);
    }
  } catch (error: any) {
    console.error(`[Demo Store] Error creating homepage:`, error.message);
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

  console.log(`[Demo Store] ✅ Completed: ${businessType}`);
}

/**
 * Seed all demo stores
 */
export async function seedAllDemoStores(): Promise<void> {
  console.log('[Demo Store Seed] Starting seed process...');

  for (const businessType of BUSINESS_TYPES) {
    try {
      await createDemoStore(businessType);
    } catch (error: any) {
      console.error(`[Demo Store Seed] Error creating ${businessType}:`, error.message);
    }
  }

  console.log('[Demo Store Seed] ✅ Seed process completed!');
}
