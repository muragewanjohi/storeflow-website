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
 * Get demo content configuration based on business type
 */
export function getDemoContentConfig(businessType: string): DemoContentConfig {
  if (!businessType) {
    // Default/Generic content if no business type
    return getDefaultDemoContent();
  }

  const type = businessType.toLowerCase();

  // Grocery Store / Supermarket
  if (type.includes('grocery') || type.includes('supermarket')) {
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

  // Pharmacy / Health & Wellness
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    return {
      categories: [
        { name: 'Prescription Medications', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop' },
        { name: 'Over-the-Counter', image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=300&fit=crop' },
        { name: 'Vitamins & Supplements', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop' },
        { name: 'Personal Care', image: 'https://images.unsplash.com/photo-1522338249292-0c8e97e0beb7?w=400&h=300&fit=crop' },
        { name: 'Baby Care', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Multivitamin Tablets',
          description: 'Complete daily multivitamin with essential nutrients for overall health and wellness.',
          short_description: 'Daily multivitamin tablets',
          price: 12.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop',
          sku: 'PHA-VIT-001',
        },
        {
          name: 'Pain Relief Tablets',
          description: 'Fast-acting pain relief for headaches, muscle aches, and minor pains.',
          short_description: 'Fast-acting pain relief',
          price: 8.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=400&fit=crop',
          sku: 'PHA-PAI-001',
        },
        {
          name: 'Hand Sanitizer',
          description: 'Alcohol-based hand sanitizer, 70% alcohol content. Kills 99.9% of germs.',
          short_description: 'Alcohol-based hand sanitizer',
          price: 4.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1522338249292-0c8e97e0beb7?w=400&h=400&fit=crop',
          sku: 'PHA-SAN-001',
        },
        {
          name: 'Vitamin C Supplements',
          description: 'High-strength vitamin C tablets to boost your immune system.',
          short_description: 'High-strength vitamin C',
          price: 9.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop',
          sku: 'PHA-VC-001',
        },
        {
          name: 'Baby Diapers',
          description: 'Ultra-absorbent baby diapers, size 3. Gentle on baby\'s skin.',
          short_description: 'Ultra-absorbent baby diapers',
          price: 15.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
          sku: 'PHA-DIA-001',
        },
      ],
    };
  }

  // Fashion / Clothing
  if (type.includes('fashion') || type.includes('clothing')) {
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

  // Electronics & Mobile Phones
  if (type.includes('electronics') || type.includes('mobile') || type.includes('phones')) {
    return {
      categories: [
        { name: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop' },
        { name: 'Laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop' },
        { name: 'Headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop' },
        { name: 'Smart Watches', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop' },
        { name: 'Accessories', image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=300&fit=crop' },
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
        {
          name: 'Phone Case',
          description: 'Durable protective phone case with shock absorption. Available in multiple colors.',
          short_description: 'Durable protective phone case',
          price: 24.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop',
          sku: 'ELC-CAS-001',
        },
      ],
    };
  }

  // Beauty & Personal Care
  if (type.includes('beauty') || type.includes('personal care')) {
    return {
      categories: [
        { name: 'Skincare', image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=300&fit=crop' },
        { name: 'Makeup', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop' },
        { name: 'Hair Care', image: 'https://images.unsplash.com/photo-1522338249292-0c8e97e0beb7?w=400&h=300&fit=crop' },
        { name: 'Fragrances', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Moisturizing Face Cream',
          description: 'Hydrating face cream with natural ingredients. Perfect for all skin types.',
          short_description: 'Hydrating face cream',
          price: 29.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
          sku: 'BEA-CRM-001',
        },
        {
          name: 'Lipstick Set',
          description: 'Premium lipstick set with 6 vibrant colors. Long-lasting and moisturizing.',
          short_description: 'Premium lipstick set',
          price: 39.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop',
          sku: 'BEA-LIP-001',
        },
        {
          name: 'Shampoo & Conditioner',
          description: 'Nourishing shampoo and conditioner set for healthy, shiny hair.',
          short_description: 'Nourishing hair care set',
          price: 19.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1522338249292-0c8e97e0beb7?w=400&h=400&fit=crop',
          sku: 'BEA-HAI-001',
        },
        {
          name: 'Perfume',
          description: 'Elegant floral perfume with long-lasting fragrance. Perfect for everyday wear.',
          short_description: 'Elegant floral perfume',
          price: 49.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
          sku: 'BEA-PER-001',
        },
      ],
    };
  }

  // Home & Kitchen
  if (type.includes('home') || type.includes('kitchen')) {
    return {
      categories: [
        { name: 'Cookware', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop' },
        { name: 'Kitchen Appliances', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=300&fit=crop' },
        { name: 'Dining & Serving', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop' },
        { name: 'Storage & Organization', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Non-Stick Cookware Set',
          description: 'Complete 10-piece non-stick cookware set. Perfect for everyday cooking.',
          short_description: 'Complete cookware set',
          price: 89.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
          sku: 'HOM-COK-001',
        },
        {
          name: 'Blender',
          description: 'Powerful blender for smoothies, soups, and more. Easy to clean and use.',
          short_description: 'Powerful kitchen blender',
          price: 59.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&h=400&fit=crop',
          sku: 'HOM-BLE-001',
        },
        {
          name: 'Dinnerware Set',
          description: 'Elegant 16-piece dinnerware set. Dishwasher safe and durable.',
          short_description: 'Elegant dinnerware set',
          price: 49.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
          sku: 'HOM-DIN-001',
        },
        {
          name: 'Storage Containers',
          description: 'Airtight storage containers set. Keep your food fresh and organized.',
          short_description: 'Airtight storage containers',
          price: 24.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          sku: 'HOM-STR-001',
        },
      ],
    };
  }

  // Baby & Kids Products
  if (type.includes('baby') || type.includes('kids')) {
    return {
      categories: [
        { name: 'Baby Clothing', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop' },
        { name: 'Toys', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
        { name: 'Feeding', image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop' },
        { name: 'Nursery', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Baby Onesie Set',
          description: 'Soft and comfortable baby onesie set. Made from organic cotton.',
          short_description: 'Soft baby onesie set',
          price: 19.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
          sku: 'BAB-ONS-001',
        },
        {
          name: 'Educational Toy Set',
          description: 'Colorful educational toys to help your child learn and develop.',
          short_description: 'Educational toy set',
          price: 29.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
          sku: 'BAB-TOY-001',
        },
        {
          name: 'Baby Bottle Set',
          description: 'BPA-free baby bottle set with different sizes. Easy to clean.',
          short_description: 'BPA-free baby bottles',
          price: 14.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop',
          sku: 'BAB-BOT-001',
        },
        {
          name: 'Baby Crib Mobile',
          description: 'Musical crib mobile with soft toys. Helps soothe your baby to sleep.',
          short_description: 'Musical crib mobile',
          price: 34.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=400&fit=crop',
          sku: 'BAB-MOB-001',
        },
      ],
    };
  }

  // Food & Beverages / Restaurant
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    return {
      categories: [
        { name: 'Main Dishes', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop' },
        { name: 'Appetizers', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop' },
        { name: 'Desserts', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop' },
        { name: 'Beverages', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Grilled Chicken',
          description: 'Tender grilled chicken with herbs and spices. Served with sides.',
          short_description: 'Tender grilled chicken',
          price: 12.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
          sku: 'FOD-CHI-001',
        },
        {
          name: 'Caesar Salad',
          description: 'Fresh Caesar salad with crispy croutons and parmesan cheese.',
          short_description: 'Fresh Caesar salad',
          price: 8.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop',
          sku: 'FOD-SAL-001',
        },
        {
          name: 'Chocolate Cake',
          description: 'Rich and moist chocolate cake. Perfect for dessert.',
          short_description: 'Rich chocolate cake',
          price: 6.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
          sku: 'FOD-CAK-001',
        },
        {
          name: 'Fresh Juice',
          description: 'Freshly squeezed fruit juice. Available in multiple flavors.',
          short_description: 'Fresh fruit juice',
          price: 3.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
          sku: 'FOD-JUI-001',
        },
      ],
    };
  }

  // Convenience Store / Duka
  if (type.includes('convenience') || type.includes('duka')) {
    return {
      categories: [
        { name: 'Snacks', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=300&fit=crop' },
        { name: 'Beverages', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop' },
        { name: 'Personal Care', image: 'https://images.unsplash.com/photo-1522338249292-0c8e97e0beb7?w=400&h=300&fit=crop' },
        { name: 'Household Items', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Potato Chips',
          description: 'Crispy potato chips in various flavors. Perfect snack.',
          short_description: 'Crispy potato chips',
          price: 1.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
          sku: 'DUK-CHI-001',
        },
        {
          name: 'Soft Drinks',
          description: 'Refreshing soft drinks. Available in multiple flavors.',
          short_description: 'Refreshing soft drinks',
          price: 1.49,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
          sku: 'DUK-DRI-001',
        },
        {
          name: 'Soap',
          description: 'Gentle cleansing soap. Suitable for all skin types.',
          short_description: 'Gentle cleansing soap',
          price: 2.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1522338249292-0c8e97e0beb7?w=400&h=400&fit=crop',
          sku: 'DUK-SOA-001',
        },
        {
          name: 'Cleaning Supplies',
          description: 'Essential cleaning supplies for your home.',
          short_description: 'Essential cleaning supplies',
          price: 4.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=400&fit=crop',
          sku: 'DUK-CLE-001',
        },
      ],
    };
  }

  // Furniture & Home Decor
  if (type.includes('furniture') || type.includes('home decor')) {
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

  // Pets
  if (type.includes('pet')) {
    return {
      categories: [
        { name: 'Pet Food', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=300&fit=crop' },
        { name: 'Toys & Accessories', image: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=300&fit=crop' },
        { name: 'Grooming', image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop' },
        { name: 'Health & Wellness', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Premium Dog Food',
          description: 'Nutritious premium dog food with real meat. Complete and balanced nutrition.',
          short_description: 'Premium dog food',
          price: 24.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
          sku: 'PET-FOD-001',
        },
        {
          name: 'Interactive Dog Toy',
          description: 'Engaging interactive toy to keep your dog entertained and active.',
          short_description: 'Interactive dog toy',
          price: 12.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=400&fit=crop',
          sku: 'PET-TOY-001',
        },
        {
          name: 'Pet Grooming Brush',
          description: 'Gentle grooming brush for dogs and cats. Removes loose fur and keeps coat healthy.',
          short_description: 'Pet grooming brush',
          price: 8.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop',
          sku: 'PET-BRU-001',
        },
        {
          name: 'Pet Vitamins',
          description: 'Essential vitamins and supplements for your pet\'s health and wellbeing.',
          short_description: 'Pet vitamins',
          price: 15.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop',
          sku: 'PET-VIT-001',
        },
      ],
    };
  }

  // Hardware
  if (type.includes('hardware')) {
    return {
      categories: [
        { name: 'Tools', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop' },
        { name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop' },
        { name: 'Plumbing', image: 'https://images.unsplash.com/photo-1621905252472-6af57f4c5f5c?w=400&h=300&fit=crop' },
        { name: 'Paint & Supplies', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Tool Set',
          description: 'Complete 50-piece tool set for home repairs and DIY projects.',
          short_description: 'Complete tool set',
          price: 79.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=400&fit=crop',
          sku: 'HAR-TOO-001',
        },
        {
          name: 'Extension Cord',
          description: 'Heavy-duty extension cord, 15 feet. Safe for indoor and outdoor use.',
          short_description: 'Heavy-duty extension cord',
          price: 12.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=400&fit=crop',
          sku: 'HAR-COR-001',
        },
        {
          name: 'Pipe Wrench',
          description: 'Professional-grade pipe wrench. Durable and reliable for plumbing work.',
          short_description: 'Professional pipe wrench',
          price: 24.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1621905252472-6af57f4c5f5c?w=400&h=400&fit=crop',
          sku: 'HAR-WRE-001',
        },
        {
          name: 'Paint Brush Set',
          description: 'Professional paint brush set with various sizes. Perfect for any painting project.',
          short_description: 'Professional paint brushes',
          price: 14.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
          sku: 'HAR-PAI-001',
        },
      ],
    };
  }

  // Default/Generic - fallback
  return getDefaultDemoContent();
}

/**
 * Get default demo content configuration
 */
function getDefaultDemoContent(): DemoContentConfig {
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
  businessType: string
): Promise<Record<number, string>> {
  const config = getDemoContentConfig(businessType);
  const categoryMap: Record<number, string> = {};

  console.log(`[Demo Content] Creating ${config.categories.length} categories for business type: ${businessType}`);

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
  businessType: string,
  categoryMap: Record<number, string>
): Promise<number> {
  const config = getDemoContentConfig(businessType);
  let productsCreated = 0;

  console.log(`[Demo Content] Creating ${config.products.length} products for business type: ${businessType}`);
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

      // Create product - matching API route structure exactly
      // Ensure all required fields are included to match Prisma schema
      const productCreateData: {
        tenant_id: string;
        name: string;
        slug: string;
        description: string | null;
        short_description: string | null;
        price: number;
        sale_price: number | null;
        sku: string;
        stock_quantity: number;
        status: string;
        image: string | null;
        gallery: string[];
        category_id: string | null;
        brand_id: string | null;
        created_by: string | null;
        metadata: any;
      } = {
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
        gallery: [], // Empty gallery array for demo products
        category_id: categoryId,
        brand_id: null, // No brand for demo products
        created_by: null, // Demo products don't have a specific creator
        metadata: {}, // Empty metadata object
      };
      
      const createdProduct = await prisma.products.create({
        data: productCreateData,
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
  businessType: string
): Promise<number> {
  let attributesCreated = 0;

  // Define common attributes based on business type
  const attributeConfigs: Array<{
    name: string;
    type: 'color' | 'size' | 'text' | null;
    values: Array<{ value: string; color_code?: string }>;
  }> = [];

  const type = businessType?.toLowerCase() || '';
  
  // Grocery / Supermarket - weight/size attributes
  if (type.includes('grocery') || type.includes('supermarket')) {
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
  
  // Pharmacy / Health & Wellness - dosage/quantity attributes (exactly 2 attributes)
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    attributeConfigs.push(
      {
        name: 'Dosage',
        type: 'text',
        values: [
          { value: '500mg' },
          { value: '1000mg' },
          { value: '250mg' },
        ],
      },
      {
        name: 'Quantity',
        type: 'text',
        values: [
          { value: '10 tablets' },
          { value: '20 tablets' },
          { value: '30 tablets' },
          { value: '50 tablets' },
        ],
      }
    );
  }
  
  // Fashion / Clothing - size and color
  if (type.includes('fashion') || type.includes('clothing')) {
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
  
  // Pharmacy / Health & Wellness - dosage/quantity attributes (exactly 2 attributes)
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    attributeConfigs.push(
      {
        name: 'Dosage',
        type: 'text',
        values: [
          { value: '500mg' },
          { value: '1000mg' },
          { value: '250mg' },
        ],
      },
      {
        name: 'Quantity',
        type: 'text',
        values: [
          { value: '10 tablets' },
          { value: '20 tablets' },
          { value: '30 tablets' },
          { value: '50 tablets' },
        ],
      }
    );
  }
  
  // Furniture & Home Decor - dimensions
  if (type.includes('furniture') || type.includes('home decor')) {
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
  
  // Electronics & Mobile Phones - storage/capacity
  if (type.includes('electronics') || type.includes('mobile') || type.includes('phones')) {
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
  
  // Beauty & Personal Care
  if (type.includes('beauty') || type.includes('personal care')) {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'text',
        values: [
          { value: '50ml' },
          { value: '100ml' },
          { value: '200ml' },
          { value: '500ml' },
        ],
      },
      {
        name: 'Type',
        type: 'text',
        values: [
          { value: 'Normal' },
          { value: 'Sensitive' },
          { value: 'Oily' },
          { value: 'Dry' },
        ],
      }
    );
  }
  
  // Home & Kitchen
  if (type.includes('home') && type.includes('kitchen')) {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'text',
        values: [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' },
        ],
      },
      {
        name: 'Material',
        type: 'text',
        values: [
          { value: 'Stainless Steel' },
          { value: 'Plastic' },
          { value: 'Ceramic' },
        ],
      }
    );
  }
  
  // Baby & Kids Products
  if (type.includes('baby') || type.includes('kids')) {
    attributeConfigs.push(
      {
        name: 'Age Range',
        type: 'text',
        values: [
          { value: '0-6 months' },
          { value: '6-12 months' },
          { value: '1-2 years' },
          { value: '2-4 years' },
        ],
      },
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
  
  // Food & Beverages / Restaurant
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    attributeConfigs.push(
      {
        name: 'Serving Size',
        type: 'text',
        values: [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' },
        ],
      },
      {
        name: 'Spice Level',
        type: 'text',
        values: [
          { value: 'Mild' },
          { value: 'Medium' },
          { value: 'Hot' },
        ],
      }
    );
  }
  
  // Convenience Store / Duka
  if (type.includes('convenience') || type.includes('duka')) {
    attributeConfigs.push(
      {
        name: 'Pack Size',
        type: 'text',
        values: [
          { value: 'Single' },
          { value: 'Pack of 2' },
          { value: 'Pack of 4' },
        ],
      },
      {
        name: 'Weight',
        type: 'text',
        values: [
          { value: '100g' },
          { value: '250g' },
          { value: '500g' },
        ],
      }
    );
  }
  
  // Pets
  if (type.includes('pets')) {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'text',
        values: [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' },
        ],
      },
      {
        name: 'Age Range',
        type: 'text',
        values: [
          { value: 'Puppy/Kitten' },
          { value: 'Adult' },
          { value: 'Senior' },
        ],
      }
    );
  }
  
  // Hardware
  if (type.includes('hardware')) {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'text',
        values: [
          { value: 'Small' },
          { value: 'Medium' },
          { value: 'Large' },
        ],
      },
      {
        name: 'Material',
        type: 'text',
        values: [
          { value: 'Steel' },
          { value: 'Aluminum' },
          { value: 'Plastic' },
        ],
      }
    );
  }
  
  // Default attributes for any theme (ensure we have at least 2)
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
      },
      {
        name: 'Color',
        type: 'color',
        values: [
          { value: 'Black', color_code: '#000000' },
          { value: 'White', color_code: '#FFFFFF' },
          { value: 'Red', color_code: '#FF0000' },
        ],
      }
    );
  }

  // Limit to exactly 2 attributes
  const finalAttributeConfigs = attributeConfigs.slice(0, 2);
  
  console.log(`[Demo Content] Creating ${finalAttributeConfigs.length} attributes for business type: ${businessType}`);

  for (const attrConfig of finalAttributeConfigs) {
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
 * Create demo pages for a tenant
 */
export async function createDemoPages(
  prisma: PrismaClient,
  tenantId: string,
  tenantName: string
): Promise<number> {
  let pagesCreated = 0;
  
  // Use correct slugs: 'about' and 'contact' (not 'about-us' or 'contact-us')
  // These pages may already exist from theme installation, so we check before creating
  const demoPages = [
    {
      title: 'About Us',
      slug: 'about',
      content: `<h1>About ${tenantName}</h1><p>Welcome to ${tenantName}! We are committed to providing you with the best products and services.</p><p>Our mission is to deliver quality and value to our customers every day.</p>`,
      meta_title: `About Us - ${tenantName}`,
      meta_description: `Learn more about ${tenantName} and our commitment to excellence.`,
    },
    {
      title: 'Contact',
      slug: 'contact',
      content: `<h1>Contact Us</h1><p>We'd love to hear from you! Get in touch with ${tenantName} today.</p><p><strong>Email:</strong> info@example.com</p><p><strong>Phone:</strong> +254 700 000 000</p><p><strong>Address:</strong> Nairobi, Kenya</p>`,
      meta_title: `Contact ${tenantName} - Get in Touch`,
      meta_description: `Get in touch with ${tenantName}. We're here to help!`,
    },
  ];

  for (const pageData of demoPages) {
    try {
      // Check if page already exists
      const existingPage = await prisma.pages.findFirst({
        where: {
          tenant_id: tenantId,
          slug: pageData.slug,
        },
      });

      if (!existingPage) {
        await prisma.pages.create({
          data: {
            tenant_id: tenantId,
            title: pageData.title,
            slug: pageData.slug,
            content: pageData.content,
            status: 'published',
            meta_title: pageData.meta_title,
            meta_description: pageData.meta_description,
          },
        });
        pagesCreated++;
        console.log(`[Demo Content] Created page: ${pageData.title}`);
      }
    } catch (error: any) {
      console.error(`[Demo Content] Error creating page ${pageData.title}:`, error.message);
    }
  }

  return pagesCreated;
}

/**
 * Create demo sales/promotions for a tenant
 * Links products to sales via product_sales junction table
 */
export async function createDemoSales(
  prisma: PrismaClient,
  tenantId: string,
  productIds?: string[]
): Promise<number> {
  let salesCreated = 0;
  
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get products if not provided
  let availableProductIds = productIds;
  if (!availableProductIds || availableProductIds.length === 0) {
    const products = await prisma.products.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { id: true },
      take: 20, // Get up to 20 products to link to sales
    });
    availableProductIds = products.map(p => p.id);
  }

  const demoSales = [
    {
      name: 'Summer Sale',
      slug: 'summer-sale',
      description: 'Get amazing discounts on all summer products!',
      badge_text: 'SALE',
      badge_color: '#EF4444',
      start_date: now,
      end_date: nextWeek,
      status: 'active',
      is_featured: true,
    },
    {
      name: 'New Arrivals Promotion',
      slug: 'new-arrivals-promotion',
      description: 'Check out our latest products with special introductory prices.',
      badge_text: 'NEW',
      badge_color: '#10B981',
      start_date: now,
      end_date: nextMonth,
      status: 'active',
      is_featured: false,
    },
  ];

  for (const saleData of demoSales) {
    try {
      // Check if sale already exists
      const existingSale = await prisma.sales.findFirst({
        where: {
          tenant_id: tenantId,
          slug: saleData.slug,
        },
      });

      let sale;
      if (existingSale) {
        sale = existingSale;
        console.log(`[Demo Content] Sale already exists: ${saleData.name}`);
      } else {
        sale = await prisma.sales.create({
          data: {
            tenant_id: tenantId,
            name: saleData.name,
            slug: saleData.slug,
            description: saleData.description,
            badge_text: saleData.badge_text,
            badge_color: saleData.badge_color,
            start_date: saleData.start_date,
            end_date: saleData.end_date,
            status: saleData.status,
            is_featured: saleData.is_featured,
          },
        });
        salesCreated++;
        console.log(`[Demo Content] Created sale: ${saleData.name}`);
      }

      // Link products to this sale (if products are available)
      if (availableProductIds && availableProductIds.length > 0) {
        // Link 5-10 products to each sale
        const numProducts = Math.min(10, availableProductIds.length);
        const productsToLink = availableProductIds
          .sort(() => Math.random() - 0.5)
          .slice(0, numProducts);

        let productsLinked = 0;
        for (let i = 0; i < productsToLink.length; i++) {
          const productId = productsToLink[i];
          try {
            // Check if product-sale link already exists
            const existingLink = await prisma.product_sales.findFirst({
              where: {
                tenant_id: tenantId,
                product_id: productId,
                sale_id: sale.id,
              },
            });

            if (!existingLink) {
              // Get product to calculate discount
              const product = await prisma.products.findUnique({
                where: { id: productId },
                select: { price: true },
              });

              if (product) {
                const discountPercent = 10 + (i % 20); // 10-30% discount
                const salePrice = Number(product.price) * (1 - discountPercent / 100);

                await prisma.product_sales.create({
                  data: {
                    tenant_id: tenantId,
                    product_id: productId,
                    sale_id: sale.id,
                    discount_percent: discountPercent,
                    sale_price: Number(salePrice.toFixed(2)),
                    order_index: i,
                  },
                });
                productsLinked++;
              }
            }
          } catch (linkError: any) {
            console.error(`[Demo Content] Error linking product to sale:`, linkError.message);
          }
        }
        console.log(`[Demo Content] Linked ${productsLinked} products to sale: ${saleData.name}`);
      }
    } catch (error: any) {
      console.error(`[Demo Content] Error creating sale ${saleData.name}:`, error.message);
    }
  }

  return salesCreated;
}

/**
 * Create demo blog categories for a tenant
 */
export async function createDemoBlogCategories(
  prisma: PrismaClient,
  tenantId: string
): Promise<Record<string, string>> {
  const categoryMap: Record<string, string> = {};
  
  const demoCategories = [
    { name: 'News', slug: 'news' },
    { name: 'Tips & Guides', slug: 'tips-guides' },
  ];

  for (const categoryData of demoCategories) {
    try {
      // Check if category already exists
      const existingCategory = await prisma.blog_categories.findFirst({
        where: {
          tenant_id: tenantId,
          slug: categoryData.slug,
        },
      });

      if (existingCategory) {
        categoryMap[categoryData.slug] = existingCategory.id;
      } else {
        const category = await prisma.blog_categories.create({
          data: {
            tenant_id: tenantId,
            name: categoryData.name,
            slug: categoryData.slug,
          },
        });
        categoryMap[categoryData.slug] = category.id;
        console.log(`[Demo Content] Created blog category: ${categoryData.name}`);
      }
    } catch (error: any) {
      console.error(`[Demo Content] Error creating blog category ${categoryData.name}:`, error.message);
    }
  }

  return categoryMap;
}

/**
 * Create demo blog posts for a tenant
 */
export async function createDemoBlogs(
  prisma: PrismaClient,
  tenantId: string,
  categoryMap: Record<string, string>
): Promise<number> {
  let blogsCreated = 0;
  
  const demoBlogs = [
    {
      title: 'Welcome to Our Store!',
      slug: 'welcome-to-our-store',
      excerpt: 'We are excited to announce the launch of our new online store.',
      content: '<h1>Welcome to Our Store!</h1><p>We are excited to announce the launch of our new online store. We have been working hard to bring you the best products and shopping experience.</p><p>Stay tuned for more updates and special offers!</p>',
      category_slug: 'news',
      status: 'published',
    },
    {
      title: 'Shopping Tips for Beginners',
      slug: 'shopping-tips-for-beginners',
      excerpt: 'Learn how to make the most of your online shopping experience with these helpful tips.',
      content: '<h1>Shopping Tips for Beginners</h1><p>Online shopping can be overwhelming, but with these tips, you\'ll be a pro in no time!</p><ul><li>Compare prices across different products</li><li>Read customer reviews</li><li>Check shipping and return policies</li><li>Look for special offers and discounts</li></ul>',
      category_slug: 'tips-guides',
      status: 'published',
    },
  ];

  for (const blogData of demoBlogs) {
    try {
      // Check if blog already exists
      const existingBlog = await prisma.blogs.findFirst({
        where: {
          tenant_id: tenantId,
          slug: blogData.slug,
        },
      });

      if (!existingBlog) {
        const categoryId = categoryMap[blogData.category_slug] || null;
        
        await prisma.blogs.create({
          data: {
            tenant_id: tenantId,
            title: blogData.title,
            slug: blogData.slug,
            excerpt: blogData.excerpt,
            content: blogData.content,
            category_id: categoryId,
            status: blogData.status,
          },
        });
        blogsCreated++;
        console.log(`[Demo Content] Created blog: ${blogData.title}`);
      }
    } catch (error: any) {
      console.error(`[Demo Content] Error creating blog ${blogData.title}:`, error.message);
    }
  }

  return blogsCreated;
}

/**
 * Create demo form for a tenant
 */
export async function createDemoForm(
  prisma: PrismaClient,
  tenantId: string
): Promise<number> {
  try {
    // Check if contact form already exists
    const existingForm = await prisma.form_builders.findFirst({
      where: {
        tenant_id: tenantId,
        slug: 'contact-form',
      },
    });

    if (!existingForm) {
      await prisma.form_builders.create({
        data: {
          tenant_id: tenantId,
          title: 'Contact Form',
          slug: 'contact-form',
          description: 'Get in touch with us using this form',
          email: null,
          button_text: 'Send Message',
          fields: [
            {
              id: `field-${Date.now()}-1`,
              type: 'text',
              label: 'Name',
              name: 'name',
              required: true,
              placeholder: 'Your full name',
            },
            {
              id: `field-${Date.now()}-2`,
              type: 'email',
              label: 'Email',
              name: 'email',
              required: true,
              placeholder: 'your.email@example.com',
            },
            {
              id: `field-${Date.now()}-3`,
              type: 'text',
              label: 'Subject',
              name: 'subject',
              required: true,
              placeholder: 'What is this regarding?',
            },
            {
              id: `field-${Date.now()}-4`,
              type: 'textarea',
              label: 'Message',
              name: 'message',
              required: true,
              placeholder: 'Tell us how we can help you...',
            },
          ],
          success_message: 'Thank you for your message! We will get back to you soon.',
          status: 'active',
        },
      });
      console.log(`[Demo Content] Created form: Contact Form`);
      return 1;
    }
    return 0;
  } catch (error: any) {
    console.error(`[Demo Content] Error creating form:`, error.message);
    return 0;
  }
}

/**
 * Create all demo content for a tenant
 */
export async function createDemoContent(
  prisma: PrismaClient,
  tenantId: string,
  businessType: string,
  includeAttributes: boolean = false
): Promise<{ categoriesCreated: number; productsCreated: number; attributesCreated: number; pagesCreated: number; salesCreated: number; blogsCreated: number; blogCategoriesCreated: number; formsCreated: number }> {
  try {
    // First create categories
    const categoryMap = await createDemoCategories(prisma, tenantId, businessType);
    
    console.log(`[Demo Content] Category map created:`, categoryMap);
    console.log(`[Demo Content] Category map keys:`, Object.keys(categoryMap));
    console.log(`[Demo Content] Category map entries:`, Object.entries(categoryMap));
    
    // Then create products (which reference categories)
    const productsCreated = await createDemoProducts(prisma, tenantId, businessType, categoryMap);
    
    // Create attributes if requested
    let attributesCreated = 0;
    if (includeAttributes) {
      attributesCreated = await createDemoAttributes(prisma, tenantId, businessType);
    }

    // Get tenant name for demo pages
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const tenantName = tenant?.name || 'Store';

    // Create additional demo content: pages, sales, blogs, blog categories, and forms
    const pagesCreated = await createDemoPages(prisma, tenantId, tenantName);
    const salesCreated = await createDemoSales(prisma, tenantId);
    const blogCategoriesMap = await createDemoBlogCategories(prisma, tenantId);
    const blogsCreated = await createDemoBlogs(prisma, tenantId, blogCategoriesMap);
    const formsCreated = await createDemoForm(prisma, tenantId);

    return {
      categoriesCreated: Object.keys(categoryMap).length,
      productsCreated,
      attributesCreated,
      pagesCreated,
      salesCreated,
      blogsCreated,
      blogCategoriesCreated: Object.keys(blogCategoriesMap).length,
      formsCreated,
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
  businessType: ThemeIndustry | string,
  countOrProducts?: number | DemoProduct[]
): DemoProduct[] {
  // If products array is provided, return it
  if (Array.isArray(countOrProducts)) {
    return countOrProducts;
  }

  const count = countOrProducts || 8;
  
  const businessTypeStr = typeof businessType === 'string' ? businessType : '';
  const config = getDemoContentConfig(businessTypeStr);

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
export function getDemoCategories(businessType: ThemeIndustry | string): Array<{
  name: string;
  slug: string;
  description: string;
  image?: string;
}> {
  const businessTypeStr = typeof businessType === 'string' ? businessType : '';
  const config = getDemoContentConfig(businessTypeStr);

  return config.categories.map((category) => ({
    name: category.name,
    slug: generateSlug(category.name),
    description: category.description || `${category.name} products`,
    image: category.image,
  }));
}
