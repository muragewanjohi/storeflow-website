/**
 * Demo Content Generator
 * 
 * Creates industry-specific demo products and categories when a theme is installed
 * with the "Install with demo content" option enabled.
 * 
 * Also provides preview/demo data for theme previews.
 */

import { PrismaClient } from '@prisma/client';
import type { ThemeIndustry } from './theme-registry';
import { generateSlug, generateSKU } from '@/lib/products/validation';

/**
 * Demo Product type for preview/demo purposes
 */
export interface DemoProduct {
  id: string;
  name: string;
  description: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  compareAtPrice?: number; // Alias for sale_price for compatibility
  sku: string;
  image?: string;
  category?: string;
  stock_quantity?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Industry-specific demo content configurations
 */
interface DemoContentConfig {
  categories: Array<{
    name: string;
    description?: string;
    image?: string;
  }>;
  products: Array<{
    name: string;
    description: string;
    short_description: string;
    price: number;
    sale_price?: number;
    category_index: number; // Index in categories array
    image?: string;
    sku?: string;
  }>;
}

/**
 * Get demo content configuration based on theme industry
 */
function getDemoContentConfig(themeSlug: string): DemoContentConfig {
  const slug = themeSlug.toLowerCase();

  // Grocery Theme
  if (slug === 'grocery') {
    return {
      categories: [
        { name: 'Fresh Produce', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop' },
        { name: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop' },
        { name: 'Meat & Seafood', image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=300&fit=crop' },
        { name: 'Bakery', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
        { name: 'Beverages', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop' },
        { name: 'Snacks', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Organic Bananas',
          description: 'Fresh, organic bananas sourced from local farms. Perfect for a healthy snack or smoothie ingredient.',
          short_description: 'Fresh organic bananas',
          price: 2.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
          sku: 'GRC-BAN-001',
        },
        {
          name: 'Fresh Strawberries',
          description: 'Sweet and juicy strawberries, picked at peak ripeness. Great for desserts or as a healthy snack.',
          short_description: 'Fresh sweet strawberries',
          price: 4.99,
          sale_price: 3.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=400&fit=crop',
          sku: 'GRC-STR-001',
        },
        {
          name: 'Organic Milk',
          description: 'Fresh organic whole milk from grass-fed cows. Rich in calcium and protein.',
          short_description: 'Fresh organic whole milk',
          price: 5.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
          sku: 'GRC-MIL-001',
        },
        {
          name: 'Free Range Eggs',
          description: 'Large free-range eggs from happy, healthy hens. Perfect for breakfast or baking.',
          short_description: 'Large free-range eggs',
          price: 4.49,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
          sku: 'GRC-EGG-001',
        },
        {
          name: 'Grass-Fed Beef',
          description: 'Premium grass-fed beef, tender and flavorful. Perfect for grilling or roasting.',
          short_description: 'Premium grass-fed beef',
          price: 12.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=400&fit=crop',
          sku: 'GRC-BEE-001',
        },
        {
          name: 'Fresh Salmon Fillet',
          description: 'Wild-caught salmon fillet, rich in omega-3 fatty acids. Great for a healthy dinner.',
          short_description: 'Wild-caught salmon fillet',
          price: 15.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=400&fit=crop',
          sku: 'GRC-SAL-001',
        },
        {
          name: 'Artisan Bread',
          description: 'Freshly baked artisan bread with a crispy crust and soft interior. Made daily.',
          short_description: 'Freshly baked artisan bread',
          price: 3.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
          sku: 'GRC-BRD-001',
        },
        {
          name: 'Fresh Orange Juice',
          description: '100% pure orange juice, freshly squeezed. Rich in vitamin C.',
          short_description: 'Fresh pure orange juice',
          price: 3.49,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=400&fit=crop',
          sku: 'GRC-OJ-001',
        },
        {
          name: 'Organic Potato Chips',
          description: 'Crispy organic potato chips, lightly salted. A delicious snack option.',
          short_description: 'Crispy organic potato chips',
          price: 2.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
          sku: 'GRC-CHP-001',
        },
      ],
    };
  }

  // Fashion Theme (HexFashion)
  if (slug === 'hexfashion' || slug === 'casual') {
    return {
      categories: [
        { name: 'Women\'s Clothing', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=300&fit=crop' },
        { name: 'Men\'s Clothing', image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=300&fit=crop' },
        { name: 'Accessories', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop' },
        { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop' },
        { name: 'Bags', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Classic White T-Shirt',
          description: 'Comfortable and versatile white cotton t-shirt. Perfect for everyday wear.',
          short_description: 'Classic white cotton t-shirt',
          price: 24.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
          sku: 'FAS-TSH-001',
        },
        {
          name: 'Denim Jeans',
          description: 'Classic blue denim jeans with a perfect fit. Durable and stylish.',
          short_description: 'Classic blue denim jeans',
          price: 59.99,
          sale_price: 49.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
          sku: 'FAS-JNS-001',
        },
        {
          name: 'Leather Jacket',
          description: 'Premium leather jacket with a modern design. Perfect for any season.',
          short_description: 'Premium leather jacket',
          price: 199.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
          sku: 'FAS-JKT-001',
        },
        {
          name: 'Designer Sunglasses',
          description: 'Stylish designer sunglasses with UV protection. Available in multiple colors.',
          short_description: 'Stylish designer sunglasses',
          price: 79.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
          sku: 'FAS-SUN-001',
        },
        {
          name: 'Running Shoes',
          description: 'Comfortable running shoes with excellent support and cushioning.',
          short_description: 'Comfortable running shoes',
          price: 89.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
          sku: 'FAS-SHO-001',
        },
        {
          name: 'Leather Handbag',
          description: 'Elegant leather handbag with multiple compartments. Perfect for daily use.',
          short_description: 'Elegant leather handbag',
          price: 129.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
          sku: 'FAS-BAG-001',
        },
      ],
    };
  }

  // Furniture Theme (Furnito)
  if (slug === 'furnito') {
    return {
      categories: [
        { name: 'Living Room', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop' },
        { name: 'Bedroom', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop' },
        { name: 'Dining Room', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop' },
        { name: 'Office', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Modern Sofa',
          description: 'Comfortable modern sofa with soft cushions. Perfect for your living room.',
          short_description: 'Comfortable modern sofa',
          price: 599.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          sku: 'FUR-SOF-001',
        },
        {
          name: 'Coffee Table',
          description: 'Stylish wooden coffee table with storage. Great addition to any living room.',
          short_description: 'Stylish wooden coffee table',
          price: 199.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400&h=400&fit=crop',
          sku: 'FUR-TBL-001',
        },
        {
          name: 'Queen Size Bed',
          description: 'Elegant queen size bed frame with headboard. Made from premium materials.',
          short_description: 'Elegant queen size bed',
          price: 799.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=400&fit=crop',
          sku: 'FUR-BED-001',
        },
        {
          name: 'Dining Table Set',
          description: 'Beautiful dining table set for 6 people. Includes matching chairs.',
          short_description: 'Dining table set for 6',
          price: 899.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
          sku: 'FUR-DIN-001',
        },
        {
          name: 'Office Desk',
          description: 'Spacious office desk with drawers. Perfect for your home office.',
          short_description: 'Spacious office desk',
          price: 349.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=400&fit=crop',
          sku: 'FUR-DSK-001',
        },
      ],
    };
  }

  // Electronics Theme (Electro)
  if (slug === 'electro') {
    return {
      categories: [
        { name: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop' },
        { name: 'Laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop' },
        { name: 'Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop' },
        { name: 'Smart Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Smartphone Pro',
          description: 'Latest smartphone with advanced features, high-resolution camera, and long battery life.',
          short_description: 'Latest smartphone with advanced features',
          price: 699.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
          sku: 'ELC-PHN-001',
        },
        {
          name: 'Laptop Ultra',
          description: 'High-performance laptop with fast processor and large storage. Perfect for work and gaming.',
          short_description: 'High-performance laptop',
          price: 999.99,
          sale_price: 899.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
          sku: 'ELC-LAP-001',
        },
        {
          name: 'Wireless Headphones',
          description: 'Premium wireless headphones with noise cancellation and excellent sound quality.',
          short_description: 'Premium wireless headphones',
          price: 199.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
          sku: 'ELC-HED-001',
        },
        {
          name: 'Smart Watch',
          description: 'Feature-rich smartwatch with fitness tracking, notifications, and long battery life.',
          short_description: 'Feature-rich smartwatch',
          price: 299.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
          sku: 'ELC-WCH-001',
        },
      ],
    };
  }

  // Default/Generic Theme
  return {
    categories: [
      { name: 'Featured', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop' },
      { name: 'New Arrivals', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop' },
      { name: 'Best Sellers', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop' },
    ],
    products: [
      {
        name: 'Sample Product 1',
        description: 'This is a sample product description. You can customize this product or add your own.',
        short_description: 'Sample product',
        price: 29.99,
        category_index: 0,
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-001',
      },
      {
        name: 'Sample Product 2',
        description: 'This is another sample product. Feel free to edit or delete it.',
        short_description: 'Another sample product',
        price: 39.99,
        category_index: 1,
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-002',
      },
    ],
  };
}

/**
 * Create demo categories for a tenant
 */
export async function createDemoCategories(
  prisma: PrismaClient,
  tenantId: string,
  themeSlug: string
): Promise<Record<number, string>> {
  const config = getDemoContentConfig(themeSlug);
  const categoryMap: Record<number, string> = {};

  console.log(`[Demo Content] Creating ${config.categories.length} categories for theme: ${themeSlug}`);

  for (let i = 0; i < config.categories.length; i++) {
    const categoryData = config.categories[i];
    
    try {
      // Generate slug using same method as API route
      const slug = generateSlug(categoryData.name);

      // Check if category already exists for this tenant (matching API route check)
      const existingCategory = await prisma.categories.findFirst({
        where: {
          tenant_id: tenantId,
          slug,
        },
      });

      if (existingCategory) {
        console.log(`[Demo Content] Category already exists with slug: ${slug}, using existing category`);
        categoryMap[i] = existingCategory.id;
        // Don't continue - we still want to log success, just use existing category
      } else {

        // Create category - matching API route structure
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
        console.log(`[Demo Content] Created category: ${categoryData.name} (${category.id})`);
      }
    } catch (error: any) {
      console.error(`[Demo Content] Error creating category ${categoryData.name}:`, {
        error: error.message,
        code: error.code,
        meta: error.meta,
        tenantId,
      });
      // Continue with other categories even if one fails
    }
  }

  const successfulCategories = Object.keys(categoryMap).length;
  console.log(`[Demo Content] Category map final state:`, {
    totalCategories: config.categories.length,
    successfulCategories,
    categoryMap: categoryMap,
    categoryMapKeys: Object.keys(categoryMap).map(k => parseInt(k)).sort((a, b) => a - b),
  });
  return categoryMap;
}

/**
 * Create demo products for a tenant
 */
export async function createDemoProducts(
  prisma: PrismaClient,
  tenantId: string,
  themeSlug: string,
  categoryMap: Record<number, string>
): Promise<number> {
  const config = getDemoContentConfig(themeSlug);
  let productsCreated = 0;

  console.log(`[Demo Content] Creating ${config.products.length} products for theme: ${themeSlug}`);
  console.log(`[Demo Content] Category map received:`, JSON.stringify(categoryMap, null, 2));
  console.log(`[Demo Content] Category map keys (indices):`, Object.keys(categoryMap).map(k => parseInt(k)).sort((a, b) => a - b));
  console.log(`[Demo Content] Category map size:`, Object.keys(categoryMap).length);
  console.log(`[Demo Content] Products to create:`, config.products.length);

  for (let i = 0; i < config.products.length; i++) {
    const productData = config.products[i];
    try {
      const categoryId = categoryMap[productData.category_index];
      
      console.log(`[Demo Content] Product ${i + 1}/${config.products.length}: ${productData.name}`, {
        category_index: productData.category_index,
        categoryId: categoryId || 'NOT FOUND',
        categoryMapKeys: Object.keys(categoryMap),
      });
      
      if (!categoryId) {
        console.error(`[Demo Content] Category index ${productData.category_index} not found in categoryMap!`, {
          productName: productData.name,
          categoryIndex: productData.category_index,
          availableIndices: Object.keys(categoryMap).map(k => parseInt(k)),
          categoryMap: categoryMap,
        });
        continue;
      }

      // Ensure category_id is valid UUID
      if (!categoryId || typeof categoryId !== 'string' || categoryId.length === 0) {
        console.error(`[Demo Content] Invalid categoryId for product ${productData.name}:`, categoryId);
        continue;
      }

      // Generate slug using same method as API route
      const slug = generateSlug(productData.name);

      // Check if product already exists for this tenant (matching API route check)
      const existingProduct = await prisma.products.findFirst({
        where: {
          tenant_id: tenantId,
          slug,
        },
      });

      if (existingProduct) {
        console.log(`[Demo Content] Product already exists with slug: ${slug}, skipping`);
        continue;
      }

      // Generate SKU using same method as API route
      let finalSKU: string;
      if (productData.sku && productData.sku.trim() !== '') {
        finalSKU = productData.sku.trim();
      } else {
        finalSKU = generateSKU(productData.name, tenantId);
      }

      // Check if SKU already exists for this tenant (matching API route check)
      const existingSKU = await prisma.products.findFirst({
        where: {
          tenant_id: tenantId,
          sku: finalSKU,
        },
      });

      // If SKU collision, regenerate until we find a unique one (matching API route logic)
      if (existingSKU) {
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
          finalSKU = generateSKU(productData.name, tenantId);
          const collision = await prisma.products.findFirst({
            where: {
              tenant_id: tenantId,
              sku: finalSKU,
            },
          });
          if (!collision) {
            break; // Found unique SKU
          }
          attempts++;
        }
        if (attempts >= maxAttempts) {
          // Fallback: use timestamp-based SKU
          finalSKU = `${tenantId.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        }
      }

      // Create product - matching API route structure
      const createdProduct = await prisma.products.create({
        data: {
          tenant_id: tenantId,
          name: productData.name,
          slug,
          description: productData.description || null,
          short_description: productData.short_description || null,
          price: productData.price,
          sale_price: productData.sale_price || null,
          sku: finalSKU, // Use generated SKU matching API route
          stock_quantity: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
          status: 'active',
          image: productData.image || null,
          category_id: categoryId,
        },
      });

      productsCreated++;
      console.log(`[Demo Content] Created product: ${productData.name} (${createdProduct.id})`);
    } catch (error: any) {
      console.error(`[Demo Content] Error creating product ${productData.name}:`, {
        error: error.message,
        code: error.code,
        meta: error.meta,
        tenantId,
        categoryId: categoryMap[productData.category_index],
      });
      // Continue with other products even if one fails
    }
  }

  console.log(`[Demo Content] Created ${productsCreated} products`);
  return productsCreated;
}

/**
 * Create demo attributes for a tenant
 */
export async function createDemoAttributes(
  prisma: PrismaClient,
  tenantId: string,
  themeSlug: string
): Promise<number> {
  const config = getDemoContentConfig(themeSlug);
  let attributesCreated = 0;

  // Define common attributes based on theme industry
  const attributeConfigs: Array<{
    name: string;
    type: 'color' | 'size' | 'text' | null;
    values: Array<{ value: string; color_code?: string }>;
  }> = [];

  const slug = themeSlug.toLowerCase();
  
  // Grocery theme - weight/size attributes
  if (slug === 'grocery') {
    attributeConfigs.push(
      {
        name: 'Weight',
        type: 'text',
        values: [
          { value: '500g' },
          { value: '1kg' },
          { value: '2kg' },
          { value: '5kg' },
        ],
      },
      {
        name: 'Pack Size',
        type: 'text',
        values: [
          { value: 'Single' },
          { value: 'Pack of 2' },
          { value: 'Pack of 4' },
          { value: 'Pack of 6' },
        ],
      }
    );
  }
  
  // Fashion themes - size and color
  if (slug === 'hexfashion' || slug === 'casual') {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'size',
        values: [
          { value: 'XS' },
          { value: 'S' },
          { value: 'M' },
          { value: 'L' },
          { value: 'XL' },
          { value: 'XXL' },
        ],
      },
      {
        name: 'Color',
        type: 'color',
        values: [
          { value: 'Black', color_code: '#000000' },
          { value: 'White', color_code: '#FFFFFF' },
          { value: 'Red', color_code: '#FF0000' },
          { value: 'Blue', color_code: '#0000FF' },
          { value: 'Green', color_code: '#008000' },
        ],
      }
    );
  }
  
  // Furniture theme - dimensions
  if (slug === 'furnito') {
    attributeConfigs.push(
      {
        name: 'Dimensions',
        type: 'text',
        values: [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' },
          { value: 'Extra Large' },
        ],
      },
      {
        name: 'Material',
        type: 'text',
        values: [
          { value: 'Wood' },
          { value: 'Metal' },
          { value: 'Fabric' },
          { value: 'Leather' },
        ],
      }
    );
  }
  
  // Electronics theme - storage/capacity
  if (slug === 'electro') {
    attributeConfigs.push(
      {
        name: 'Storage',
        type: 'text',
        values: [
          { value: '64GB' },
          { value: '128GB' },
          { value: '256GB' },
          { value: '512GB' },
        ],
      },
      {
        name: 'Color',
        type: 'color',
        values: [
          { value: 'Black', color_code: '#000000' },
          { value: 'Silver', color_code: '#C0C0C0' },
          { value: 'Gold', color_code: '#FFD700' },
          { value: 'Space Gray', color_code: '#717378' },
        ],
      }
    );
  }
  
  // Default attributes for any theme
  if (attributeConfigs.length === 0) {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'size',
        values: [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' },
        ],
      }
    );
  }

  console.log(`[Demo Content] Creating ${attributeConfigs.length} attributes for theme: ${themeSlug}`);

  for (const attrConfig of attributeConfigs) {
    try {
      // Generate slug using same method as API route
      const slug = attrConfig.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      // Check if attribute already exists for this tenant (matching API route check)
      const existingAttribute = await prisma.attributes.findFirst({
        where: {
          tenant_id: tenantId,
          slug,
        },
      });

      let attribute;
      if (existingAttribute) {
        console.log(`[Demo Content] Attribute already exists with slug: ${slug}, using existing attribute`);
        attribute = existingAttribute;
      } else {
        // Create attribute - matching API route structure
        attribute = await prisma.attributes.create({
          data: {
            tenant_id: tenantId,
            name: attrConfig.name,
            slug,
            type: attrConfig.type || null,
          },
        });
        attributesCreated++;
      }

      // Create attribute values (only if attribute was newly created, or check if values exist)
      let valuesCreated = 0;
      for (const valueData of attrConfig.values) {
        try {
          // Check if attribute value already exists
          const existingValue = await prisma.attribute_values.findFirst({
            where: {
              tenant_id: tenantId,
              attribute_id: attribute.id,
              value: valueData.value,
            },
          });

          if (!existingValue) {
            await prisma.attribute_values.create({
              data: {
                tenant_id: tenantId,
                attribute_id: attribute.id,
                value: valueData.value,
                color_code: valueData.color_code || null,
              },
            });
            valuesCreated++;
          }
        } catch (valueError: any) {
          console.error(`[Demo Content] Error creating attribute value ${valueData.value}:`, {
            error: valueError.message,
            code: valueError.code,
          });
        }
      }

      console.log(`[Demo Content] ${existingAttribute ? 'Using existing' : 'Created'} attribute: ${attrConfig.name} (${attribute.id}) with ${valuesCreated} new values`);
    } catch (error: any) {
      console.error(`[Demo Content] Error creating attribute ${attrConfig.name}:`, {
        error: error.message,
        code: error.code,
        meta: error.meta,
        tenantId,
      });
      // Continue with other attributes even if one fails
    }
  }

  console.log(`[Demo Content] Created ${attributesCreated} attributes`);
  return attributesCreated;
}

/**
 * Create all demo content for a tenant
 */
export async function createDemoContent(
  prisma: PrismaClient,
  tenantId: string,
  themeSlug: string,
  includeAttributes: boolean = false
): Promise<{ categoriesCreated: number; productsCreated: number; attributesCreated: number }> {
  try {
    // First create categories
    const categoryMap = await createDemoCategories(prisma, tenantId, themeSlug);
    
    console.log(`[Demo Content] Category map created:`, categoryMap);
    console.log(`[Demo Content] Category map keys:`, Object.keys(categoryMap));
    console.log(`[Demo Content] Category map entries:`, Object.entries(categoryMap));
    
    // Then create products (which reference categories)
    const productsCreated = await createDemoProducts(prisma, tenantId, themeSlug, categoryMap);
    
    // Create attributes if requested
    let attributesCreated = 0;
    if (includeAttributes) {
      attributesCreated = await createDemoAttributes(prisma, tenantId, themeSlug);
    }

    return {
      categoriesCreated: Object.keys(categoryMap).length,
      productsCreated,
      attributesCreated,
    };
  } catch (error) {
    console.error('[Demo Content] Error creating demo content:', error);
    throw error;
  }
}

/**
 * Get demo products for preview/demo purposes (does not create in database)
 */
export function getDemoProducts(
  industry: ThemeIndustry | string,
  countOrProducts?: number | DemoProduct[]
): DemoProduct[] {
  // If products array is provided, return it
  if (Array.isArray(countOrProducts)) {
    return countOrProducts;
  }

  const count = countOrProducts || 8;
  
  // Map industry to theme slug
  let themeSlug = 'default';
  if (typeof industry === 'string') {
    const industryLower = industry.toLowerCase();
    if (industryLower === 'grocery') themeSlug = 'grocery';
    else if (industryLower === 'fashion') themeSlug = 'hexfashion';
    else if (industryLower === 'furniture') themeSlug = 'furnito';
    else if (industryLower === 'electronics') themeSlug = 'electro';
  }
  
  const config = getDemoContentConfig(themeSlug);

  // Convert config products to DemoProduct format
  return config.products.slice(0, count).map((product, index) => ({
    id: product.sku || `demo-${index}`,
    name: product.name,
    description: product.description,
    short_description: product.short_description,
    price: product.price,
    sale_price: product.sale_price,
    compareAtPrice: product.sale_price, // Alias for compatibility
    sku: product.sku || `DEM-${index}`,
    image: product.image,
    category: config.categories[product.category_index]?.name,
    stock_quantity: Math.floor(Math.random() * 50) + 10,
    metadata: {},
  }));
}

/**
 * Get demo categories for preview/demo purposes (does not create in database)
 */
export function getDemoCategories(industry: ThemeIndustry | string): Array<{
  name: string;
  slug: string;
  description: string;
  image?: string;
}> {
  // Map industry to theme slug
  let themeSlug = 'default';
  if (typeof industry === 'string') {
    const industryLower = industry.toLowerCase();
    if (industryLower === 'grocery') themeSlug = 'grocery';
    else if (industryLower === 'fashion') themeSlug = 'hexfashion';
    else if (industryLower === 'furniture') themeSlug = 'furnito';
    else if (industryLower === 'electronics') themeSlug = 'electro';
  }
  
  const config = getDemoContentConfig(themeSlug);

  return config.categories.map((category) => ({
    name: category.name,
    slug: generateSlug(category.name),
    description: category.description || `${category.name} products`,
    image: category.image,
  }));
}
