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
import { createContactPageTemplate } from './additional-pages';
import { buildDemoProductMetadata } from '@/lib/products/demo-products';

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
        { name: 'Frozen Foods', image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop' },
        { name: 'Spices & Condiments', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop' },
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
          image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&h=400&fit=crop',
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
          image: 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=400&h=400&fit=crop',
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
          image: 'https://images.unsplash.com/photo-1553546895-531931aa1aa8?w=400&h=400&fit=crop',
          sku: 'GRC-CHP-001',
        },
        {
          name: 'Mixed Spice Collection',
          description: 'Premium collection of essential cooking spices. Includes cumin, turmeric, paprika, and more.',
          short_description: 'Premium cooking spices',
          price: 8.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=400&fit=crop',
          sku: 'GRC-SPC-001',
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
        { name: 'Personal Care', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop' },
        { name: 'Baby Care', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop' },
        { name: 'First Aid', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400&h=300&fit=crop' },
        { name: 'Medical Devices', image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop' },
        { name: 'Skin Care', image: 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Multivitamin Tablets',
          description: 'Complete daily multivitamin with essential nutrients for overall health and wellness. Contains 23 key vitamins and minerals.',
          short_description: 'Daily multivitamin tablets',
          price: 12.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400&h=400&fit=crop',
          sku: 'PHA-VIT-001',
        },
        {
          name: 'Pain Relief Tablets',
          description: 'Fast-acting pain relief for headaches, muscle aches, and minor pains. Non-drowsy formula.',
          short_description: 'Fast-acting pain relief',
          price: 8.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&h=400&fit=crop',
          sku: 'PHA-PAI-001',
        },
        {
          name: 'Hand Sanitizer',
          description: 'Alcohol-based hand sanitizer, 70% alcohol content. Kills 99.9% of germs. Moisturizing formula.',
          short_description: 'Alcohol-based hand sanitizer',
          price: 4.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=400&fit=crop',
          sku: 'PHA-SAN-001',
        },
        {
          name: 'Vitamin C Supplements',
          description: 'High-strength vitamin C 1000mg tablets to boost your immune system. 60 tablets per bottle.',
          short_description: 'High-strength vitamin C',
          price: 9.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=400&h=400&fit=crop',
          sku: 'PHA-VC-001',
        },
        {
          name: 'Baby Diapers',
          description: 'Ultra-absorbent baby diapers, size 3. Gentle on baby\'s skin with wetness indicator.',
          short_description: 'Ultra-absorbent baby diapers',
          price: 15.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=400&fit=crop',
          sku: 'PHA-DIA-001',
        },
        {
          name: 'First Aid Kit',
          description: 'Comprehensive first aid kit with bandages, antiseptic wipes, gauze, and essential medical supplies for emergencies.',
          short_description: 'Comprehensive first aid kit',
          price: 19.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=400&h=400&fit=crop',
          sku: 'PHA-FAK-001',
        },
        {
          name: 'Digital Thermometer',
          description: 'Accurate digital thermometer with fast reading. Suitable for oral, underarm, and rectal use.',
          short_description: 'Accurate digital thermometer',
          price: 14.99,
          sale_price: 11.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400&h=400&fit=crop',
          sku: 'PHA-THE-001',
        },
        {
          name: 'Omega-3 Fish Oil',
          description: 'Premium omega-3 fish oil capsules for heart and brain health. 1000mg EPA/DHA per serving.',
          short_description: 'Premium omega-3 fish oil',
          price: 16.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400&h=400&fit=crop',
          sku: 'PHA-OMG-001',
        },
        {
          name: 'Moisturizing Lotion',
          description: 'Gentle daily moisturizing lotion for sensitive skin. Fragrance-free, dermatologist tested.',
          short_description: 'Daily moisturizing lotion',
          price: 7.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=400&fit=crop',
          sku: 'PHA-LOT-001',
        },
        {
          name: 'Allergy Relief Tablets',
          description: 'Non-drowsy allergy relief tablets for seasonal allergies. 24-hour protection against pollen and dust.',
          short_description: 'Non-drowsy allergy relief',
          price: 11.99,
          sale_price: 9.49,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=400&fit=crop',
          sku: 'PHA-ALR-001',
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
        { name: 'Activewear', image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&h=300&fit=crop' },
        { name: 'Outerwear', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop' },
        { name: 'Jewellery', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Classic White T-Shirt',
          description: 'Comfortable and versatile white cotton t-shirt. Premium fabric with a relaxed fit for everyday wear.',
          short_description: 'Classic white cotton t-shirt',
          price: 24.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
          sku: 'FAS-TSH-001',
        },
        {
          name: 'Denim Jeans',
          description: 'Classic blue denim jeans with a perfect slim fit. Durable stretch fabric for all-day comfort.',
          short_description: 'Classic blue denim jeans',
          price: 59.99,
          sale_price: 49.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
          sku: 'FAS-JNS-001',
        },
        {
          name: 'Leather Jacket',
          description: 'Premium leather jacket with modern design. Crafted from genuine leather with satin lining.',
          short_description: 'Premium leather jacket',
          price: 199.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop',
          sku: 'FAS-JKT-001',
        },
        {
          name: 'Designer Sunglasses',
          description: 'Stylish designer sunglasses with UV400 protection. Lightweight acetate frame in multiple colours.',
          short_description: 'Stylish designer sunglasses',
          price: 79.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
          sku: 'FAS-SUN-001',
        },
        {
          name: 'Running Shoes',
          description: 'Comfortable running shoes with excellent support, cushioning, and breathable mesh upper.',
          short_description: 'Comfortable running shoes',
          price: 89.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop',
          sku: 'FAS-SHO-001',
        },
        {
          name: 'Leather Handbag',
          description: 'Elegant leather handbag with multiple compartments, adjustable strap, and gold-tone hardware.',
          short_description: 'Elegant leather handbag',
          price: 129.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&h=400&fit=crop',
          sku: 'FAS-BAG-001',
        },
        {
          name: 'Yoga Leggings',
          description: 'High-waisted yoga leggings with four-way stretch. Moisture-wicking fabric for ultimate comfort.',
          short_description: 'High-waisted yoga leggings',
          price: 44.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop',
          sku: 'FAS-YOG-001',
        },
        {
          name: 'Cashmere Scarf',
          description: 'Luxurious cashmere scarf in a timeless check pattern. Super soft and warm for winter styling.',
          short_description: 'Luxurious cashmere scarf',
          price: 69.99,
          sale_price: 54.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=400&h=400&fit=crop',
          sku: 'FAS-SCF-001',
        },
        {
          name: 'Slim Fit Polo Shirt',
          description: 'Classic slim fit polo shirt in premium pique cotton. Perfect for smart-casual occasions.',
          short_description: 'Classic slim fit polo shirt',
          price: 34.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=400&h=400&fit=crop',
          sku: 'FAS-POL-001',
        },
        {
          name: 'Gold Chain Necklace',
          description: 'Delicate gold-plated chain necklace with minimalist pendant. Tarnish-resistant and hypoallergenic.',
          short_description: 'Delicate gold chain necklace',
          price: 49.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=400&fit=crop',
          sku: 'FAS-NKL-001',
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
        { name: 'Tablets', image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop' },
        { name: 'Cameras', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop' },
        { name: 'Gaming', image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Smartphone Pro',
          description: 'Latest smartphone with advanced features, 108MP camera, 5G connectivity, and all-day battery life.',
          short_description: 'Latest smartphone with advanced features',
          price: 699.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=400&h=400&fit=crop',
          sku: 'ELC-PHN-001',
        },
        {
          name: 'Laptop Ultra',
          description: 'High-performance laptop with M-series chip, 16GB RAM, and 512GB SSD. Perfect for work and creative projects.',
          short_description: 'High-performance laptop',
          price: 999.99,
          sale_price: 899.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=400&h=400&fit=crop',
          sku: 'ELC-LAP-001',
        },
        {
          name: 'Wireless Headphones',
          description: 'Premium wireless headphones with active noise cancellation, 30-hour battery, and Hi-Res audio.',
          short_description: 'Premium wireless headphones',
          price: 199.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=400&fit=crop',
          sku: 'ELC-HED-001',
        },
        {
          name: 'Smart Watch',
          description: 'Feature-rich smartwatch with GPS, heart rate monitor, sleep tracking, and 7-day battery life.',
          short_description: 'Feature-rich smartwatch',
          price: 299.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&h=400&fit=crop',
          sku: 'ELC-WCH-001',
        },
        {
          name: 'Phone Case',
          description: 'Durable protective phone case with military-grade shock absorption. Available in multiple colours.',
          short_description: 'Durable protective phone case',
          price: 24.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1585298723682-7115561c51b7?w=400&h=400&fit=crop',
          sku: 'ELC-CAS-001',
        },
        {
          name: 'iPad Pro Tablet',
          description: '12.9-inch tablet with Liquid Retina display, powerful chip, and Apple Pencil support for creativity on the go.',
          short_description: 'Pro tablet with Retina display',
          price: 799.99,
          sale_price: 749.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
          sku: 'ELC-TAB-001',
        },
        {
          name: 'Mirrorless Camera',
          description: 'Professional mirrorless camera with 4K video, 24MP sensor, and interchangeable lens system.',
          short_description: 'Professional mirrorless camera',
          price: 1299.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1546027658-7aa750153465?w=400&h=400&fit=crop',
          sku: 'ELC-CAM-001',
        },
        {
          name: 'Wireless Earbuds',
          description: 'Compact wireless earbuds with transparency mode, spatial audio, and 24-hour total battery life.',
          short_description: 'Compact wireless earbuds',
          price: 149.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop',
          sku: 'ELC-EAR-001',
        },
        {
          name: 'Portable Charger',
          description: '20000mAh portable power bank with fast charging. Charges 3 devices simultaneously.',
          short_description: '20000mAh portable power bank',
          price: 39.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop',
          sku: 'ELC-CHG-001',
        },
        {
          name: 'Gaming Controller',
          description: 'Wireless gaming controller with haptic feedback, adaptive triggers, and 12-hour battery life.',
          short_description: 'Wireless gaming controller',
          price: 69.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=400&fit=crop',
          sku: 'ELC-CTR-001',
        },
      ],
    };
  }

  // Beauty & Personal Care
  if (type.includes('beauty') || type.includes('personal care')) {
    return {
      categories: [
        { name: 'Skincare', image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=300&fit=crop' },
        { name: 'Makeup', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop' },
        { name: 'Hair Care', image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=400&h=300&fit=crop' },
        { name: 'Fragrances', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop' },
        { name: 'Body Care', image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&h=300&fit=crop' },
        { name: 'Nail Care', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop' },
        { name: 'Men\'s Grooming', image: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=400&h=300&fit=crop' },
        { name: 'Tools & Accessories', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Moisturizing Face Cream',
          description: 'Hydrating face cream with natural ingredients and hyaluronic acid. Perfect for all skin types, keeps skin supple and nourished all day.',
          short_description: 'Hydrating face cream',
          price: 29.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop',
          sku: 'BEA-CRM-001',
        },
        {
          name: 'Matte Lipstick Set',
          description: 'Premium matte lipstick set with 6 vibrant shades. Long-lasting, moisturizing formula that glides on smoothly.',
          short_description: 'Premium matte lipstick set',
          price: 39.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop',
          sku: 'BEA-LIP-001',
        },
        {
          name: 'Keratin Shampoo & Conditioner',
          description: 'Nourishing keratin-infused shampoo and conditioner set for healthy, shiny hair. Repairs damage and prevents frizz.',
          short_description: 'Nourishing keratin hair care set',
          price: 24.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=400&fit=crop',
          sku: 'BEA-HAI-001',
        },
        {
          name: 'Floral Eau de Parfum',
          description: 'Elegant floral perfume with notes of rose, jasmine, and sandalwood. Long-lasting fragrance perfect for everyday wear.',
          short_description: 'Elegant floral perfume',
          price: 54.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop',
          sku: 'BEA-PER-001',
        },
        {
          name: 'Vitamin C Face Serum',
          description: 'Brightening vitamin C serum with antioxidants. Reduces dark spots, evens skin tone, and boosts radiance for a youthful glow.',
          short_description: 'Brightening vitamin C serum',
          price: 34.99,
          sale_price: 27.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop',
          sku: 'BEA-SER-001',
        },
        {
          name: 'Liquid Foundation',
          description: 'Flawless coverage liquid foundation with SPF 15. Buildable, lightweight formula that blends seamlessly for a natural finish.',
          short_description: 'Flawless liquid foundation',
          price: 32.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400&h=400&fit=crop',
          sku: 'BEA-FND-001',
        },
        {
          name: 'Shea Butter Body Lotion',
          description: 'Rich and creamy body lotion with shea butter and vitamin E. Deeply moisturizes and softens dry skin.',
          short_description: 'Rich shea butter body lotion',
          price: 18.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop',
          sku: 'BEA-LOT-001',
        },
        {
          name: 'Gel Nail Polish Collection',
          description: 'Professional gel nail polish set with 8 trendy colours. Chip-resistant, salon-quality finish that lasts up to 2 weeks.',
          short_description: 'Gel nail polish collection',
          price: 28.99,
          sale_price: 22.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=400&fit=crop',
          sku: 'BEA-NAI-001',
        },
        {
          name: 'Eye Shadow Palette',
          description: 'Luxurious 12-shade eye shadow palette with shimmer and matte finishes. Highly pigmented and blendable for endless looks.',
          short_description: 'Luxurious 12-shade eye shadow palette',
          price: 42.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?w=400&h=400&fit=crop',
          sku: 'BEA-EYE-001',
        },
        {
          name: 'Argan Hair Oil',
          description: 'Pure argan oil treatment for silky, frizz-free hair. Repairs split ends, adds shine, and protects against heat damage.',
          short_description: 'Pure argan hair oil treatment',
          price: 22.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&h=400&fit=crop',
          sku: 'BEA-OIL-001',
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
        { name: 'Dining & Serving', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
        { name: 'Storage & Organization', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop' },
        { name: 'Bakeware', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
        { name: 'Cutlery & Knives', image: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400&h=300&fit=crop' },
        { name: 'Cleaning', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&h=300&fit=crop' },
        { name: 'Table Linens', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Non-Stick Cookware Set',
          description: 'Complete 10-piece non-stick cookware set with tempered glass lids. Perfect for everyday cooking.',
          short_description: 'Complete cookware set',
          price: 89.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1583845112239-97ef1341b271?w=400&h=400&fit=crop',
          sku: 'HOM-COK-001',
        },
        {
          name: 'High-Speed Blender',
          description: 'Powerful 1200W blender for smoothies, soups, and nut butters. BPA-free jar with easy-pour spout.',
          short_description: 'Powerful kitchen blender',
          price: 59.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=400&fit=crop',
          sku: 'HOM-BLE-001',
        },
        {
          name: 'Porcelain Dinnerware Set',
          description: 'Elegant 16-piece porcelain dinnerware set in classic white. Dishwasher and microwave safe.',
          short_description: 'Elegant dinnerware set',
          price: 49.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=400&h=400&fit=crop',
          sku: 'HOM-DIN-001',
        },
        {
          name: 'Glass Storage Containers',
          description: 'Set of 8 airtight glass storage containers with snap-lock lids. Keep your food fresh and organized.',
          short_description: 'Airtight glass storage containers',
          price: 34.99,
          sale_price: 27.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?w=400&h=400&fit=crop',
          sku: 'HOM-STR-001',
        },
        {
          name: 'Silicone Baking Set',
          description: 'Complete silicone baking set with muffin tray, loaf pan, and baking mat. Non-stick and heat resistant.',
          short_description: 'Complete silicone baking set',
          price: 29.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=400&h=400&fit=crop',
          sku: 'HOM-BAK-001',
        },
        {
          name: 'Chef Knife Set',
          description: 'Professional 5-piece chef knife set in stainless steel with ergonomic handles and wooden block.',
          short_description: 'Professional chef knife set',
          price: 79.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=400&fit=crop',
          sku: 'HOM-KNF-001',
        },
        {
          name: 'Coffee Maker',
          description: 'Programmable drip coffee maker with thermal carafe. Brews up to 12 cups with auto-shutoff.',
          short_description: 'Programmable coffee maker',
          price: 69.99,
          sale_price: 59.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=400&h=400&fit=crop',
          sku: 'HOM-COF-001',
        },
        {
          name: 'Cast Iron Skillet',
          description: 'Pre-seasoned 12-inch cast iron skillet. Oven safe to 500°F, perfect for searing, frying, and baking.',
          short_description: 'Pre-seasoned cast iron skillet',
          price: 44.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&h=400&fit=crop',
          sku: 'HOM-SKI-001',
        },
        {
          name: 'Microfibre Cleaning Set',
          description: 'Premium microfibre cleaning set with 12 cloths in assorted colours. Machine washable and lint-free.',
          short_description: 'Premium microfibre cleaning set',
          price: 14.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=400&fit=crop',
          sku: 'HOM-CLN-001',
        },
        {
          name: 'Cotton Table Runner',
          description: 'Handwoven cotton table runner in natural tones. Adds elegance to any dining table.',
          short_description: 'Handwoven cotton table runner',
          price: 19.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=400&fit=crop',
          sku: 'HOM-TBR-001',
        },
      ],
    };
  }

  // Baby & Kids Products
  if (type.includes('baby') || type.includes('kids')) {
    return {
      categories: [
        { name: 'Baby Clothing', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop' },
        { name: 'Toys', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop' },
        { name: 'Feeding', image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop' },
        { name: 'Nursery', image: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=400&h=300&fit=crop' },
        { name: 'Bath & Skincare', image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&h=300&fit=crop' },
        { name: 'Strollers & Carriers', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=300&fit=crop' },
        { name: 'Books & Learning', image: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=400&h=300&fit=crop' },
        { name: 'Safety & Health', image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Organic Cotton Onesie Set',
          description: 'Soft and comfortable 5-pack baby onesie set. Made from 100% GOTS-certified organic cotton.',
          short_description: 'Soft organic baby onesie set',
          price: 24.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=400&h=400&fit=crop',
          sku: 'BAB-ONS-001',
        },
        {
          name: 'Educational Stacking Toy',
          description: 'Colourful wooden stacking toy to help your child learn shapes, colours, and hand-eye coordination.',
          short_description: 'Educational stacking toy',
          price: 19.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=400&h=400&fit=crop',
          sku: 'BAB-TOY-001',
        },
        {
          name: 'Anti-Colic Bottle Set',
          description: 'BPA-free anti-colic baby bottle set with slow-flow nipples. Includes 3 sizes for different stages.',
          short_description: 'Anti-colic baby bottles',
          price: 18.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?w=400&h=400&fit=crop',
          sku: 'BAB-BOT-001',
        },
        {
          name: 'Musical Crib Mobile',
          description: 'Musical crib mobile with rotating soft animals and soothing lullabies. Helps baby drift to sleep.',
          short_description: 'Musical crib mobile',
          price: 34.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?w=400&h=400&fit=crop',
          sku: 'BAB-MOB-001',
        },
        {
          name: 'Baby Shampoo & Wash',
          description: 'Gentle tear-free baby shampoo and body wash. Paediatrician tested, hypoallergenic formula.',
          short_description: 'Gentle tear-free baby wash',
          price: 8.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?w=400&h=400&fit=crop',
          sku: 'BAB-WSH-001',
        },
        {
          name: 'Lightweight Stroller',
          description: 'Compact foldable stroller with sun canopy, storage basket, and one-hand fold mechanism.',
          short_description: 'Compact foldable stroller',
          price: 149.99,
          sale_price: 119.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1602407294553-6ac9170b3ed0?w=400&h=400&fit=crop',
          sku: 'BAB-STR-001',
        },
        {
          name: 'Interactive Story Book Set',
          description: 'Set of 6 interactive picture books with touch-and-feel pages. Encourages early reading and sensory development.',
          short_description: 'Interactive story book set',
          price: 22.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1560343776-97e7d202ff0e?w=400&h=400&fit=crop',
          sku: 'BAB-BKS-001',
        },
        {
          name: 'Plush Teddy Bear',
          description: 'Ultra-soft plush teddy bear, 30cm tall. Machine washable and safe for newborns.',
          short_description: 'Ultra-soft plush teddy bear',
          price: 14.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&h=400&fit=crop',
          sku: 'BAB-TED-001',
        },
        {
          name: 'Baby Monitor',
          description: 'Wireless video baby monitor with night vision, two-way audio, and temperature sensor.',
          short_description: 'Wireless video baby monitor',
          price: 79.99,
          sale_price: 64.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1604869515882-4d10fa4b0492?w=400&h=400&fit=crop',
          sku: 'BAB-MON-001',
        },
        {
          name: 'Kids Winter Jacket',
          description: 'Warm padded winter jacket for toddlers with hood and reflective strips. Water-resistant and cosy.',
          short_description: 'Warm padded kids winter jacket',
          price: 39.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&h=400&fit=crop',
          sku: 'BAB-JKT-001',
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
        { name: 'Salads', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop' },
        { name: 'Pizza & Pasta', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop' },
        { name: 'Breakfast', image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=300&fit=crop' },
        { name: 'Coffee & Tea', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Grilled Chicken Platter',
          description: 'Tender herb-marinated grilled chicken served with roasted vegetables and garlic mashed potatoes.',
          short_description: 'Tender grilled chicken platter',
          price: 14.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=400&fit=crop',
          sku: 'FOD-CHI-001',
        },
        {
          name: 'Caesar Salad',
          description: 'Fresh romaine Caesar salad with crispy croutons, shaved parmesan, and house-made dressing.',
          short_description: 'Fresh Caesar salad',
          price: 8.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=400&fit=crop',
          sku: 'FOD-SAL-001',
        },
        {
          name: 'Chocolate Lava Cake',
          description: 'Rich molten chocolate lava cake served warm with vanilla ice cream and fresh berries.',
          short_description: 'Rich chocolate lava cake',
          price: 7.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=400&fit=crop',
          sku: 'FOD-CAK-001',
        },
        {
          name: 'Fresh Fruit Juice',
          description: 'Freshly squeezed fruit juice blend with orange, mango, and pineapple. No added sugar.',
          short_description: 'Freshly squeezed fruit juice',
          price: 4.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop',
          sku: 'FOD-JUI-001',
        },
        {
          name: 'Margherita Pizza',
          description: 'Classic wood-fired Margherita pizza with San Marzano tomato sauce, fresh mozzarella, and basil.',
          short_description: 'Classic Margherita pizza',
          price: 12.99,
          sale_price: 10.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=400&fit=crop',
          sku: 'FOD-PIZ-001',
        },
        {
          name: 'Bruschetta Appetizer',
          description: 'Crispy toasted bread topped with diced tomatoes, fresh basil, garlic, and extra virgin olive oil.',
          short_description: 'Classic bruschetta appetizer',
          price: 6.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=400&h=400&fit=crop',
          sku: 'FOD-BRU-001',
        },
        {
          name: 'Avocado Toast Brunch',
          description: 'Smashed avocado on artisan sourdough with poached eggs, cherry tomatoes, and microgreens.',
          short_description: 'Avocado toast with poached eggs',
          price: 11.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop',
          sku: 'FOD-AVT-001',
        },
        {
          name: 'Artisan Cappuccino',
          description: 'Rich double-shot cappuccino made with locally roasted single-origin beans and velvety steamed milk.',
          short_description: 'Rich artisan cappuccino',
          price: 4.49,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&h=400&fit=crop',
          sku: 'FOD-CAP-001',
        },
        {
          name: 'Grilled Salmon',
          description: 'Pan-seared Atlantic salmon fillet with lemon butter sauce, asparagus, and wild rice pilaf.',
          short_description: 'Pan-seared salmon fillet',
          price: 18.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
          sku: 'FOD-SAM-001',
        },
        {
          name: 'Tiramisu',
          description: 'Classic Italian tiramisu with layers of espresso-soaked ladyfingers and mascarpone cream.',
          short_description: 'Classic Italian tiramisu',
          price: 6.49,
          sale_price: 4.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1506354666786-959d6d497f1a?w=400&h=400&fit=crop',
          sku: 'FOD-TIR-001',
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
        { name: 'Personal Care', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop' },
        { name: 'Household Items', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop' },
        { name: 'Dairy & Bread', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop' },
        { name: 'Canned Goods', image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop' },
        { name: 'Stationery', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&h=300&fit=crop' },
        { name: 'Tobacco & Lighters', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Potato Chips',
          description: 'Crispy potato chips in various flavours. The perfect grab-and-go snack.',
          short_description: 'Crispy potato chips',
          price: 1.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400&h=400&fit=crop',
          sku: 'DUK-CHI-001',
        },
        {
          name: 'Soft Drinks Pack',
          description: 'Refreshing carbonated soft drinks in a 6-pack. Available in cola, lemon, and orange.',
          short_description: 'Refreshing soft drinks pack',
          price: 3.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=400&h=400&fit=crop',
          sku: 'DUK-DRI-001',
        },
        {
          name: 'Bar Soap 3-Pack',
          description: 'Gentle moisturizing bar soap in a 3-pack. Suitable for all skin types.',
          short_description: 'Gentle moisturizing soap',
          price: 3.49,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1612103198005-b238154f4590?w=400&h=400&fit=crop',
          sku: 'DUK-SOA-001',
        },
        {
          name: 'All-Purpose Cleaner',
          description: 'Effective all-purpose household cleaner. Works on kitchen, bathroom, and floor surfaces.',
          short_description: 'All-purpose household cleaner',
          price: 4.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1573821663912-569905455b1c?w=400&h=400&fit=crop',
          sku: 'DUK-CLE-001',
        },
        {
          name: 'Fresh Milk 1L',
          description: 'Fresh pasteurized whole milk, 1 litre. Rich in calcium and vitamin D.',
          short_description: 'Fresh pasteurized milk',
          price: 1.89,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&h=400&fit=crop',
          sku: 'DUK-MLK-001',
        },
        {
          name: 'Canned Baked Beans',
          description: 'Classic baked beans in rich tomato sauce. Quick and easy meal companion.',
          short_description: 'Canned baked beans',
          price: 1.49,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1601599561213-832382fd07ba?w=400&h=400&fit=crop',
          sku: 'DUK-BNS-001',
        },
        {
          name: 'Bottled Water 6-Pack',
          description: 'Pure mineral water in convenient 500ml bottles. 6-pack for the whole family.',
          short_description: 'Mineral water 6-pack',
          price: 2.49,
          sale_price: 1.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop',
          sku: 'DUK-WTR-001',
        },
        {
          name: 'Toothpaste',
          description: 'Whitening toothpaste with fluoride for strong, healthy teeth and fresh breath.',
          short_description: 'Whitening toothpaste',
          price: 2.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop',
          sku: 'DUK-TPT-001',
        },
        {
          name: 'Sliced White Bread',
          description: 'Soft sliced white bread, freshly baked. Perfect for sandwiches and toast.',
          short_description: 'Soft sliced white bread',
          price: 1.29,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
          sku: 'DUK-BRD-001',
        },
        {
          name: 'Chocolate Bars 3-Pack',
          description: 'Delicious milk chocolate bars in a 3-pack. Smooth, creamy, and irresistible.',
          short_description: 'Milk chocolate bars 3-pack',
          price: 2.99,
          sale_price: 2.49,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop',
          sku: 'DUK-CHO-001',
        },
      ],
    };
  }

  // Furniture & Home Decor
  if (type.includes('furniture') || type.includes('home decor')) {
    return {
      categories: [
        { name: 'Living Room', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop' },
        { name: 'Bedroom', image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=300&fit=crop' },
        { name: 'Dining Room', image: 'https://images.unsplash.com/photo-1617104678098-de229db51175?w=400&h=300&fit=crop' },
        { name: 'Office', image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop' },
        { name: 'Outdoor', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop' },
        { name: 'Lighting', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=300&fit=crop' },
        { name: 'Rugs & Carpets', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop' },
        { name: 'Wall Decor', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Modern 3-Seater Sofa',
          description: 'Comfortable modern sofa with soft foam cushions and solid wood frame. Upholstered in premium fabric.',
          short_description: 'Comfortable modern sofa',
          price: 599.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&h=400&fit=crop',
          sku: 'FUR-SOF-001',
        },
        {
          name: 'Walnut Coffee Table',
          description: 'Stylish walnut coffee table with lower shelf for storage. Mid-century modern design.',
          short_description: 'Stylish walnut coffee table',
          price: 199.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=400&h=400&fit=crop',
          sku: 'FUR-TBL-001',
        },
        {
          name: 'Queen Upholstered Bed',
          description: 'Elegant queen size upholstered bed frame with tufted headboard. Includes wooden slat support.',
          short_description: 'Elegant queen upholstered bed',
          price: 799.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=400&h=400&fit=crop',
          sku: 'FUR-BED-001',
        },
        {
          name: 'Dining Table Set',
          description: 'Beautiful solid oak dining table set for 6 people. Includes 6 matching upholstered chairs.',
          short_description: 'Dining table set for 6',
          price: 899.99,
          sale_price: 749.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=400&h=400&fit=crop',
          sku: 'FUR-DIN-001',
        },
        {
          name: 'Ergonomic Office Desk',
          description: 'Spacious height-adjustable office desk with cable management and two drawers. Ideal for home offices.',
          short_description: 'Height-adjustable office desk',
          price: 349.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=400&h=400&fit=crop',
          sku: 'FUR-DSK-001',
        },
        {
          name: 'Pendant Light Fixture',
          description: 'Elegant brushed brass pendant light with frosted glass shade. Creates warm ambient lighting.',
          short_description: 'Elegant brass pendant light',
          price: 89.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=400&h=400&fit=crop',
          sku: 'FUR-LGT-001',
        },
        {
          name: 'Velvet Accent Chair',
          description: 'Luxurious velvet accent chair with gold-finished metal legs. Statement piece for any room.',
          short_description: 'Luxurious velvet accent chair',
          price: 279.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&h=400&fit=crop',
          sku: 'FUR-ACH-001',
        },
        {
          name: 'Bedside Table Pair',
          description: 'Set of 2 matching bedside tables with a drawer and open shelf. Solid wood with walnut veneer.',
          short_description: 'Bedside table pair',
          price: 159.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=400&h=400&fit=crop',
          sku: 'FUR-BST-001',
        },
        {
          name: 'Bookshelf Unit',
          description: 'Tall 5-tier bookshelf unit in industrial design. Metal frame with solid wood shelves.',
          short_description: 'Tall industrial bookshelf',
          price: 189.99,
          sale_price: 159.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=400&fit=crop',
          sku: 'FUR-BKS-001',
        },
        {
          name: 'Woven Area Rug',
          description: 'Hand-woven area rug in neutral geometric pattern. 160x230cm, made from sustainable materials.',
          short_description: 'Hand-woven area rug',
          price: 129.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop',
          sku: 'FUR-RUG-001',
        },
      ],
    };
  }

  // Pets
  if (type.includes('pet')) {
    return {
      categories: [
        { name: 'Dog Food', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=300&fit=crop' },
        { name: 'Cat Food', image: 'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=400&h=300&fit=crop' },
        { name: 'Toys', image: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=300&fit=crop' },
        { name: 'Grooming', image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop' },
        { name: 'Health & Wellness', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop' },
        { name: 'Beds & Blankets', image: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=300&fit=crop' },
        { name: 'Collars & Leashes', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop' },
        { name: 'Treats & Chews', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Premium Dog Food',
          description: 'Nutritious premium dog food with real chicken. Complete and balanced nutrition for adult dogs.',
          short_description: 'Premium chicken dog food',
          price: 24.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=400&h=400&fit=crop',
          sku: 'PET-DFD-001',
        },
        {
          name: 'Grain-Free Cat Food',
          description: 'Premium grain-free cat food with salmon and sweet potato. Rich in omega-3 for a shiny coat.',
          short_description: 'Grain-free salmon cat food',
          price: 19.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop',
          sku: 'PET-CFD-001',
        },
        {
          name: 'Interactive Dog Toy',
          description: 'Engaging interactive puzzle toy to keep your dog entertained, active, and mentally stimulated.',
          short_description: 'Interactive dog puzzle toy',
          price: 14.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1522276498395-f4f68f7f8454?w=400&h=400&fit=crop',
          sku: 'PET-TOY-001',
        },
        {
          name: 'Pet Grooming Kit',
          description: 'Complete grooming kit with brush, comb, nail clipper, and shampoo. For dogs and cats.',
          short_description: 'Complete pet grooming kit',
          price: 22.99,
          sale_price: 18.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=400&h=400&fit=crop',
          sku: 'PET-GRM-001',
        },
        {
          name: 'Pet Joint Supplements',
          description: 'Glucosamine and chondroitin joint supplements for senior dogs. Supports mobility and comfort.',
          short_description: 'Joint support supplements',
          price: 18.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop',
          sku: 'PET-VIT-001',
        },
        {
          name: 'Orthopaedic Dog Bed',
          description: 'Memory foam orthopaedic dog bed for medium to large breeds. Removable, machine-washable cover.',
          short_description: 'Orthopaedic memory foam dog bed',
          price: 49.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400&h=400&fit=crop',
          sku: 'PET-BED-001',
        },
        {
          name: 'Adjustable Dog Harness',
          description: 'No-pull adjustable dog harness with reflective strips. Comfortable padded chest plate.',
          short_description: 'No-pull adjustable dog harness',
          price: 24.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&h=400&fit=crop',
          sku: 'PET-HRN-001',
        },
        {
          name: 'Natural Dog Treats',
          description: 'All-natural beef jerky dog treats with no artificial preservatives. High protein reward snack.',
          short_description: 'All-natural beef jerky treats',
          price: 9.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&h=400&fit=crop',
          sku: 'PET-TRT-001',
        },
        {
          name: 'Cat Scratching Post',
          description: 'Sisal-wrapped cat scratching post with plush perch. Saves your furniture and entertains your cat.',
          short_description: 'Sisal cat scratching post',
          price: 34.99,
          sale_price: 27.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400&h=400&fit=crop',
          sku: 'PET-SCR-001',
        },
        {
          name: 'Retractable Dog Leash',
          description: 'Heavy-duty retractable leash extends to 5 metres. Ergonomic grip with one-button brake.',
          short_description: 'Retractable dog leash 5m',
          price: 16.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop',
          sku: 'PET-LSH-001',
        },
      ],
    };
  }

  // Hardware
  if (type.includes('hardware')) {
    return {
      categories: [
        { name: 'Hand Tools', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop' },
        { name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop' },
        { name: 'Plumbing', image: 'https://images.unsplash.com/photo-1585399000684-d2f72660f092?w=400&h=300&fit=crop' },
        { name: 'Paint & Supplies', image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop' },
        { name: 'Power Tools', image: 'https://images.unsplash.com/photo-1590959651373-a3db0f38a961?w=400&h=300&fit=crop' },
        { name: 'Fasteners & Hardware', image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=300&fit=crop' },
        { name: 'Safety Equipment', image: 'https://images.unsplash.com/photo-1617791160536-598cf32026fb?w=400&h=300&fit=crop' },
        { name: 'Garden & Outdoor', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: '50-Piece Tool Set',
          description: 'Complete 50-piece tool set in carry case. Includes hammer, screwdrivers, pliers, tape measure, and more.',
          short_description: 'Complete 50-piece tool set',
          price: 79.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1580901369227-308f6f40bdeb?w=400&h=400&fit=crop',
          sku: 'HAR-TOO-001',
        },
        {
          name: 'LED Work Light',
          description: 'Bright rechargeable LED work light with 360-degree rotation. 3 brightness modes, 8-hour battery.',
          short_description: 'Rechargeable LED work light',
          price: 29.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=400&fit=crop',
          sku: 'HAR-LED-001',
        },
        {
          name: 'Adjustable Pipe Wrench',
          description: 'Professional-grade adjustable pipe wrench, 14-inch. Chrome vanadium steel for maximum durability.',
          short_description: 'Professional pipe wrench',
          price: 24.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=400&fit=crop',
          sku: 'HAR-WRE-001',
        },
        {
          name: 'Paint Roller Kit',
          description: 'Complete paint roller kit with tray, 3 roller covers, extension pole, and edging brush.',
          short_description: 'Complete paint roller kit',
          price: 19.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400&h=400&fit=crop',
          sku: 'HAR-PAI-001',
        },
        {
          name: 'Cordless Drill',
          description: '18V cordless drill/driver with lithium-ion battery, 2 speed settings, and 21 torque positions.',
          short_description: '18V cordless drill/driver',
          price: 89.99,
          sale_price: 74.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=400&fit=crop',
          sku: 'HAR-DRL-001',
        },
        {
          name: 'Screw & Bolt Assortment',
          description: '500-piece screw and bolt assortment in organised case. Stainless steel, various sizes.',
          short_description: '500-piece screw assortment',
          price: 14.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=400&h=400&fit=crop',
          sku: 'HAR-SCR-001',
        },
        {
          name: 'Safety Goggles',
          description: 'Anti-fog safety goggles with adjustable strap. ANSI-rated impact protection for workshops.',
          short_description: 'Anti-fog safety goggles',
          price: 9.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=400&fit=crop',
          sku: 'HAR-GOG-001',
        },
        {
          name: 'Tape Measure 25ft',
          description: 'Heavy-duty 25-foot tape measure with magnetic tip and belt clip. Easy-to-read markings.',
          short_description: 'Heavy-duty 25ft tape measure',
          price: 12.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=400&fit=crop',
          sku: 'HAR-TPM-001',
        },
        {
          name: 'Interior Wall Paint 5L',
          description: 'Premium interior wall paint in matte white. Low VOC, excellent coverage, 5-litre can.',
          short_description: 'Premium interior wall paint 5L',
          price: 34.99,
          sale_price: 29.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=400&h=400&fit=crop',
          sku: 'HAR-PNT-001',
        },
        {
          name: 'Garden Hose 50ft',
          description: 'Flexible 50-foot garden hose with adjustable nozzle. Kink-resistant and UV-protected.',
          short_description: 'Flexible 50ft garden hose',
          price: 29.99,
          category_index: 7,
          image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=400&fit=crop',
          sku: 'HAR-HSE-001',
        },
      ],
    };
  }

  // Shoes / Footwear Store
  if (type.includes('shoes') || type.includes('footwear')) {
    return {
      categories: [
        { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop' },
        { name: 'Running Shoes', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop' },
        { name: 'Formal Shoes', image: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=300&fit=crop' },
        { name: 'Boots', image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=400&h=300&fit=crop' },
        { name: 'Sandals', image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=300&fit=crop' },
        { name: 'Kids Shoes', image: 'https://images.unsplash.com/photo-1555274175-6cbf6f3b137b?w=400&h=300&fit=crop' },
        { name: 'Athletic', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop' },
        { name: 'Loafers & Slip-Ons', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400&h=300&fit=crop' },
      ],
      products: [
        {
          name: 'Classic Running Sneakers',
          description: 'Lightweight and breathable running sneakers with excellent cushioning for everyday comfort.',
          short_description: 'Lightweight running sneakers',
          price: 89.99,
          sale_price: 74.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&h=400&fit=crop',
          sku: 'SHO-SNK-001',
        },
        {
          name: 'Performance Running Shoes',
          description: 'High-performance running shoes designed for athletes. Superior grip and energy return.',
          short_description: 'High-performance running shoes',
          price: 129.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400&h=400&fit=crop',
          sku: 'SHO-RUN-001',
        },
        {
          name: 'Leather Oxford Shoes',
          description: 'Classic leather oxford shoes perfect for formal occasions and business wear.',
          short_description: 'Classic leather oxfords',
          price: 149.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=400&h=400&fit=crop',
          sku: 'SHO-FRM-001',
        },
        {
          name: 'Casual Canvas Sneakers',
          description: 'Versatile canvas sneakers for everyday casual wear. Comfortable and stylish.',
          short_description: 'Casual canvas sneakers',
          price: 59.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&h=400&fit=crop',
          sku: 'SHO-CAS-001',
        },
        {
          name: 'Leather Chelsea Boots',
          description: 'Premium leather Chelsea boots with elastic side panels. Timeless style.',
          short_description: 'Premium Chelsea boots',
          price: 179.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop',
          sku: 'SHO-BOT-001',
        },
        {
          name: 'Summer Sandals',
          description: 'Comfortable leather sandals perfect for summer days. Adjustable straps for perfect fit.',
          short_description: 'Comfortable summer sandals',
          price: 49.99,
          category_index: 4,
          image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=400&h=400&fit=crop',
          sku: 'SHO-SAN-001',
        },
        {
          name: 'Kids Sports Sneakers',
          description: 'Durable and colorful sports sneakers for active kids. Easy velcro closure.',
          short_description: 'Kids sports sneakers',
          price: 44.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400&h=400&fit=crop',
          sku: 'SHO-KID-001',
        },
        {
          name: 'Slip-On Loafers',
          description: 'Elegant slip-on loafers for a smart casual look. Soft leather with cushioned insole.',
          short_description: 'Elegant slip-on loafers',
          price: 99.99,
          sale_price: 79.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=400&h=400&fit=crop',
          sku: 'SHO-LOA-001',
        },
        {
          name: 'Trail Hiking Boots',
          description: 'Rugged hiking boots with waterproof membrane and excellent ankle support.',
          short_description: 'Waterproof hiking boots',
          price: 159.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1520219306100-ec4afeeefe58?w=400&h=400&fit=crop',
          sku: 'SHO-HIK-001',
        },
        {
          name: 'Basketball High-Tops',
          description: 'High-top basketball shoes with superior ankle support, responsive cushioning, and grippy outsole.',
          short_description: 'High-top basketball shoes',
          price: 119.99,
          sale_price: 99.99,
          category_index: 6,
          image: 'https://images.unsplash.com/photo-1605733160314-4fc7dac4bb16?w=400&h=400&fit=crop',
          sku: 'SHO-BBL-001',
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
      { name: 'New Arrivals', image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop' },
      { name: 'Best Sellers', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop' },
      { name: 'Trending', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop' },
      { name: 'Sale', image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=300&fit=crop' },
      { name: 'Essentials', image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=300&fit=crop' },
      { name: 'Premium', image: 'https://images.unsplash.com/photo-1483181957632-8bda974cbc91?w=400&h=300&fit=crop' },
      { name: 'Gift Ideas', image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=300&fit=crop' },
    ],
    products: [
      {
          name: 'Premium Product',
          description: 'High-quality premium product crafted with care. Designed to exceed your expectations.',
          short_description: 'High-quality premium product',
          price: 49.99,
          category_index: 0,
          image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-001',
      },
      {
          name: 'Essential Item',
          description: 'Everyday essential that combines quality, durability, and great value.',
          short_description: 'Everyday essential item',
          price: 29.99,
          category_index: 5,
          image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-002',
      },
      {
          name: 'Trending Collection',
          description: 'Part of our trending collection. Fresh, modern, and designed for today.',
          short_description: 'Trending collection piece',
          price: 39.99,
          sale_price: 34.99,
          category_index: 3,
          image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-003',
      },
      {
          name: 'Best Seller',
          description: 'Our most popular product, loved by thousands of customers worldwide.',
          short_description: 'Most popular product',
          price: 44.99,
          category_index: 2,
          image: 'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-004',
      },
      {
          name: 'New Arrival',
          description: 'Just arrived! Be the first to get this fresh addition to our store.',
          short_description: 'Fresh new arrival',
          price: 34.99,
          category_index: 1,
          image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-005',
      },
      {
        name: 'Gift Set',
        description: 'Beautifully packaged gift set, perfect for any occasion. Ready to give.',
        short_description: 'Beautifully packaged gift set',
        price: 59.99,
        category_index: 7,
        image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-006',
      },
      {
        name: 'Sale Item Special',
        description: 'Great deal on this popular product. Limited time offer, while stocks last.',
        short_description: 'Limited time sale item',
        price: 54.99,
        sale_price: 39.99,
        category_index: 4,
        image: 'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-007',
      },
      {
        name: 'Premium Collection',
        description: 'From our premium collection, crafted with the finest materials.',
        short_description: 'Premium collection item',
        price: 79.99,
        category_index: 6,
        image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-008',
      },
      {
        name: 'Everyday Classic',
        description: 'A timeless classic that never goes out of style. Reliable and versatile.',
        short_description: 'Timeless everyday classic',
        price: 24.99,
        category_index: 5,
        image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-009',
      },
      {
        name: 'Featured Special',
        description: 'Hand-picked featured product with exceptional quality and outstanding reviews.',
        short_description: 'Hand-picked featured product',
        price: 42.99,
        category_index: 0,
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=400&fit=crop',
        sku: 'DEM-PRD-010',
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
        metadata: buildDemoProductMetadata('theme_demo_content', 'theme_install_demo_content'),
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
  
  // Shoes / Footwear - shoe sizes and colors
  if (type.includes('shoes') || type.includes('footwear')) {
    attributeConfigs.push(
      {
        name: 'Size',
        type: 'size',
        values: [
          { value: 'US 6' },
          { value: 'US 7' },
          { value: 'US 8' },
          { value: 'US 9' },
          { value: 'US 10' },
          { value: 'US 11' },
          { value: 'US 12' },
        ],
      },
      {
        name: 'Color',
        type: 'color',
        values: [
          { value: 'Black', color_code: '#000000' },
          { value: 'White', color_code: '#FFFFFF' },
          { value: 'Red', color_code: '#DC3545' },
          { value: 'Blue', color_code: '#007BFF' },
          { value: 'Brown', color_code: '#8B4513' },
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
        let content: string;
        if (pageData.slug === 'contact') {
          // Use page-builder contact template (contact form + location: Loita Street, Nairobi, Kenya)
          let contactFormId: string | undefined;
          const existingForm = await prisma.form_builders.findFirst({
            where: { tenant_id: tenantId, slug: 'contact-form' },
            select: { id: true },
          });
          if (existingForm) {
            contactFormId = existingForm.id;
          } else {
            const contactForm = await prisma.form_builders.create({
              data: {
                tenant_id: tenantId,
                title: 'Contact Form',
                slug: 'contact-form',
                description: 'Get in touch with us using this form',
                email: null,
                button_text: 'Send Message',
                fields: [
                  { id: `field-${Date.now()}-1`, type: 'text', label: 'Name', name: 'name', required: true, placeholder: 'Your full name' },
                  { id: `field-${Date.now()}-2`, type: 'email', label: 'Email', name: 'email', required: true, placeholder: 'your.email@example.com' },
                  { id: `field-${Date.now()}-3`, type: 'text', label: 'Subject', name: 'subject', required: true, placeholder: 'What is this regarding?' },
                  { id: `field-${Date.now()}-4`, type: 'textarea', label: 'Message', name: 'message', required: true, placeholder: 'Tell us how we can help you...' },
                ],
                success_message: 'Thank you for your message! We will get back to you soon.',
                status: 'active',
              },
            });
            contactFormId = contactForm.id;
          }
          const tenant = await prisma.tenants.findUnique({
            where: { id: tenantId },
            select: { contact_email: true },
          });
          const contactEmail = tenant?.contact_email ?? undefined;
          const template = createContactPageTemplate(tenantName, contactFormId, contactEmail);
          content = JSON.stringify(template);
        } else {
          content = pageData.content;
        }
        await prisma.pages.create({
          data: {
            tenant_id: tenantId,
            title: pageData.title,
            slug: pageData.slug,
            content,
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
 * Links products to sales via product_sales junction table.
 * @param businessType - Optional; used to set a sales banner image specific to business type
 */
export async function createDemoSales(
  prisma: PrismaClient,
  tenantId: string,
  productIds?: string[],
  businessType?: string
): Promise<number> {
  let salesCreated = 0;
  const bannerImage = getSalesBannerImageByBusinessType(businessType || '');

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
            banner_image: bannerImage,
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
 * Get theme featured image URLs for demo blogs by business type (one per blog index)
 */
function getBlogFeaturedImagesByBusinessType(businessType: string): string[] {
  const type = (businessType || '').toLowerCase();
  // Default generic blog images
  const defaultImages = [
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504711331083-9c895941bf81?w=800&h=600&fit=crop',
  ];
  if (type.includes('grocery') || type.includes('supermarket')) {
    return [
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    return [
      'https://images.unsplash.com/photo-1576671081837-49000212a370?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('fashion') || type.includes('clothing')) {
    return [
      'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('electronics') || type.includes('mobile')) {
    return [
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('beauty') || type.includes('personal care')) {
    return [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('home') || type.includes('kitchen')) {
    return [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    return [
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('furniture') || type.includes('home decor')) {
    return [
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('shoes') || type.includes('footwear')) {
    return [
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('baby') || type.includes('kids')) {
    return [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('convenience') || type.includes('duka')) {
    return [
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('pet')) {
    return [
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800&h=600&fit=crop',
    ];
  }
  if (type.includes('hardware')) {
    return [
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&h=600&fit=crop',
    ];
  }
  return defaultImages;
}

/**
 * Get sales banner image URL by business type
 */
function getSalesBannerImageByBusinessType(businessType: string): string {
  const type = (businessType || '').toLowerCase();
  const defaultBanner = 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=400&fit=crop';
  if (type.includes('grocery') || type.includes('supermarket')) {
    return 'https://images.unsplash.com/photo-1553546895-531931aa1aa8?w=1200&h=400&fit=crop';
  }
  if (type.includes('pharmacy') || type.includes('health') || type.includes('wellness')) {
    return 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=1200&h=400&fit=crop';
  }
  if (type.includes('fashion') || type.includes('clothing')) {
    return 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1200&h=400&fit=crop';
  }
  if (type.includes('electronics') || type.includes('mobile')) {
    return 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=1200&h=400&fit=crop';
  }
  if (type.includes('beauty') || type.includes('personal care')) {
    return 'https://images.unsplash.com/photo-1571875257727-256c39da42af?w=1200&h=400&fit=crop';
  }
  if (type.includes('home') || type.includes('kitchen')) {
    return 'https://images.unsplash.com/photo-1583845112239-97ef1341b271?w=1200&h=400&fit=crop';
  }
  if (type.includes('food') || type.includes('beverages') || type.includes('restaurant')) {
    return 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=1200&h=400&fit=crop';
  }
  if (type.includes('furniture') || type.includes('home decor')) {
    return 'https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200&h=400&fit=crop';
  }
  if (type.includes('shoes') || type.includes('footwear')) {
    return 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1200&h=400&fit=crop';
  }
  if (type.includes('baby') || type.includes('kids')) {
    return 'https://images.unsplash.com/photo-1555009393-f20bdb245c4d?w=1200&h=400&fit=crop';
  }
  if (type.includes('convenience') || type.includes('duka')) {
    return 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=1200&h=400&fit=crop';
  }
  if (type.includes('pet')) {
    return 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&h=400&fit=crop';
  }
  if (type.includes('hardware')) {
    return 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=1200&h=400&fit=crop';
  }
  return defaultBanner;
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
 * @param businessType - Optional; used to set theme featured images specific to business type
 */
export async function createDemoBlogs(
  prisma: PrismaClient,
  tenantId: string,
  categoryMap: Record<string, string>,
  businessType?: string
): Promise<number> {
  let blogsCreated = 0;
  const featuredImages = getBlogFeaturedImagesByBusinessType(businessType || '');

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

  for (let i = 0; i < demoBlogs.length; i++) {
    const blogData = demoBlogs[i];
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
        const image = featuredImages[i] ?? featuredImages[0];

        await prisma.blogs.create({
          data: {
            tenant_id: tenantId,
            title: blogData.title,
            slug: blogData.slug,
            excerpt: blogData.excerpt,
            content: blogData.content,
            category_id: categoryId,
            status: blogData.status,
            image,
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
    const salesCreated = await createDemoSales(prisma, tenantId, undefined, businessType);
    const blogCategoriesMap = await createDemoBlogCategories(prisma, tenantId);
    const blogsCreated = await createDemoBlogs(prisma, tenantId, blogCategoriesMap, businessType);
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
