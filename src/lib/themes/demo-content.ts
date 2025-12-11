/**
 * Demo Content Generator
 * 
 * Generates industry-specific demo content for theme previews
 * 
 * Day 37: Theme Templates with Demo Content
 */

import type { ThemeIndustry } from './theme-registry';

export interface DemoProduct {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  sku: string;
  image: string;
  category: string;
  stock_quantity: number;
  metadata?: Record<string, unknown>;
}

export interface DemoCategory {
  name: string;
  slug: string;
  description: string;
  image?: string;
}

/**
 * Electronics demo products
 */
const electronicsProducts: DemoProduct[] = [
  {
    name: 'MacBook Pro 16"',
    description: 'Powerful laptop with M2 Pro chip, perfect for professionals and creatives.',
    price: 2499.99,
    compareAtPrice: 2799.99,
    sku: 'MBP-16-M2',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop',
    category: 'Laptops',
    stock_quantity: 15,
    metadata: { brand: 'Apple', model: 'MacBook Pro 16"', processor: 'M2 Pro' },
  },
  {
    name: 'iPhone 15 Pro',
    description: 'Latest iPhone with titanium design and A17 Pro chip.',
    price: 999.99,
    compareAtPrice: 1099.99,
    sku: 'IPH-15-PRO',
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&h=800&fit=crop',
    category: 'Phones',
    stock_quantity: 25,
    metadata: { brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB' },
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Industry-leading noise cancellation with premium sound quality.',
    price: 399.99,
    sku: 'SONY-WH1000XM5',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    category: 'Audio',
    stock_quantity: 30,
    metadata: { brand: 'Sony', type: 'Over-ear', noiseCancellation: true },
  },
  {
    name: 'Samsung 4K Monitor 32"',
    description: 'Ultra-sharp 4K display with HDR support for professional work.',
    price: 599.99,
    sku: 'SAM-4K-32',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&h=800&fit=crop',
    category: 'Monitors',
    stock_quantity: 20,
    metadata: { brand: 'Samsung', size: '32"', resolution: '4K UHD' },
  },
  {
    name: 'Logitech MX Master 3S',
    description: 'Premium wireless mouse with advanced ergonomics and precision.',
    price: 99.99,
    sku: 'LOG-MX-M3S',
    image: 'https://images.unsplash.com/photo-1527814052947-f34b3b30004d?w=800&h=800&fit=crop',
    category: 'Accessories',
    stock_quantity: 50,
    metadata: { brand: 'Logitech', type: 'Wireless', dpi: '8000' },
  },
  {
    name: 'iPad Pro 12.9"',
    description: 'Powerful tablet with M2 chip, perfect for creative professionals.',
    price: 1099.99,
    sku: 'IPAD-PRO-12.9',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&h=800&fit=crop',
    category: 'Tablets',
    stock_quantity: 18,
    metadata: { brand: 'Apple', model: 'iPad Pro 12.9"', storage: '256GB' },
  },
  {
    name: 'Apple Watch Ultra',
    description: 'Rugged smartwatch designed for extreme sports and adventures.',
    price: 799.99,
    sku: 'AW-ULTRA',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=800&fit=crop',
    category: 'Wearables',
    stock_quantity: 22,
    metadata: { brand: 'Apple', model: 'Watch Ultra', size: '49mm' },
  },
  {
    name: 'DJI Mini 4 Pro Drone',
    description: 'Compact drone with 4K video and obstacle avoidance.',
    price: 1099.99,
    sku: 'DJI-MINI-4-PRO',
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=800&fit=crop',
    category: 'Drones',
    stock_quantity: 12,
    metadata: { brand: 'DJI', model: 'Mini 4 Pro', camera: '4K' },
  },
  {
    name: 'Nintendo Switch OLED',
    description: 'Enhanced Switch with vibrant OLED display and improved audio.',
    price: 349.99,
    sku: 'NSW-OLED',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800&h=800&fit=crop',
    category: 'Gaming',
    stock_quantity: 35,
    metadata: { brand: 'Nintendo', model: 'Switch OLED', storage: '64GB' },
  },
  {
    name: 'Canon EOS R6 Mark II',
    description: 'Professional mirrorless camera with 24MP sensor and 4K video.',
    price: 2499.99,
    sku: 'CAN-R6-M2',
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop',
    category: 'Cameras',
    stock_quantity: 10,
    metadata: { brand: 'Canon', model: 'EOS R6 Mark II', sensor: '24MP' },
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Flagship Android phone with S Pen and 200MP camera.',
    price: 1199.99,
    sku: 'SAM-S24-ULTRA',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=800&fit=crop',
    category: 'Phones',
    stock_quantity: 20,
    metadata: { brand: 'Samsung', model: 'Galaxy S24 Ultra', storage: '512GB' },
  },
  {
    name: 'AirPods Pro 2',
    description: 'Premium wireless earbuds with active noise cancellation.',
    price: 249.99,
    sku: 'APP-PRO-2',
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800&h=800&fit=crop',
    category: 'Audio',
    stock_quantity: 40,
    metadata: { brand: 'Apple', model: 'AirPods Pro 2', noiseCancellation: true },
  },
];

/**
 * Fashion demo products
 */
const fashionProducts: DemoProduct[] = [
  {
    name: 'Classic White T-Shirt',
    description: 'Premium cotton t-shirt with perfect fit and timeless design.',
    price: 29.99,
    sku: 'TSH-WHT-CLS',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
    category: 'Tops',
    stock_quantity: 50,
    metadata: { brand: 'StoreFlow', material: '100% Cotton', sizes: ['S', 'M', 'L', 'XL'] },
  },
  {
    name: 'Denim Jacket',
    description: 'Vintage-style denim jacket with modern fit and premium quality.',
    price: 89.99,
    compareAtPrice: 119.99,
    sku: 'JKT-DNM-VTG',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
    category: 'Outerwear',
    stock_quantity: 30,
    metadata: { brand: 'StoreFlow', material: '100% Cotton Denim', sizes: ['S', 'M', 'L', 'XL'] },
  },
  {
    name: 'Leather Ankle Boots',
    description: 'Genuine leather boots with comfortable sole and stylish design.',
    price: 149.99,
    sku: 'BOT-LTH-ANK',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=800&fit=crop',
    category: 'Footwear',
    stock_quantity: 25,
    metadata: { brand: 'StoreFlow', material: 'Genuine Leather', sizes: ['7', '8', '9', '10', '11'] },
  },
  {
    name: 'Wool Blend Coat',
    description: 'Warm winter coat with elegant design and premium materials.',
    price: 199.99,
    compareAtPrice: 249.99,
    sku: 'COT-WOL-BLD',
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
    category: 'Outerwear',
    stock_quantity: 18,
    metadata: { brand: 'StoreFlow', material: '70% Wool, 30% Polyester', sizes: ['S', 'M', 'L', 'XL'] },
  },
  {
    name: 'Silk Scarf',
    description: 'Luxurious silk scarf with elegant pattern and vibrant colors.',
    price: 49.99,
    sku: 'SCR-SLK-ELG',
    image: 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800&h=800&fit=crop',
    category: 'Accessories',
    stock_quantity: 40,
    metadata: { brand: 'StoreFlow', material: '100% Silk', dimensions: '90x90cm' },
  },
  {
    name: 'High-Waisted Jeans',
    description: 'Comfortable jeans with perfect fit and premium denim quality.',
    price: 79.99,
    sku: 'JNS-HW-DNM',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
    category: 'Bottoms',
    stock_quantity: 35,
    metadata: { brand: 'StoreFlow', material: '98% Cotton, 2% Elastane', sizes: ['24', '26', '28', '30', '32'] },
  },
  {
    name: 'Leather Crossbody Bag',
    description: 'Stylish crossbody bag with multiple compartments and premium leather.',
    price: 129.99,
    sku: 'BAG-LTH-CRS',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
    category: 'Accessories',
    stock_quantity: 28,
    metadata: { brand: 'StoreFlow', material: 'Genuine Leather', color: 'Brown' },
  },
  {
    name: 'Cashmere Sweater',
    description: 'Luxurious cashmere sweater with soft texture and elegant design.',
    price: 179.99,
    compareAtPrice: 219.99,
    sku: 'SWT-CSH-LUX',
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop',
    category: 'Tops',
    stock_quantity: 22,
    metadata: { brand: 'StoreFlow', material: '100% Cashmere', sizes: ['S', 'M', 'L', 'XL'] },
  },
  {
    name: 'Sneakers',
    description: 'Comfortable sneakers with modern design and cushioned sole.',
    price: 89.99,
    sku: 'SNK-CMF-MOD',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
    category: 'Footwear',
    stock_quantity: 45,
    metadata: { brand: 'StoreFlow', material: 'Canvas & Rubber', sizes: ['7', '8', '9', '10', '11', '12'] },
  },
  {
    name: 'Wool Beanie',
    description: 'Warm beanie hat with soft wool and stylish design.',
    price: 24.99,
    sku: 'BEA-WOL-WRM',
    image: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=800&fit=crop',
    category: 'Accessories',
    stock_quantity: 60,
    metadata: { brand: 'StoreFlow', material: '100% Wool', oneSize: true },
  },
  {
    name: 'Midi Dress',
    description: 'Elegant midi dress perfect for any occasion with flattering fit.',
    price: 99.99,
    compareAtPrice: 129.99,
    sku: 'DRS-MDI-ELG',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop',
    category: 'Dresses',
    stock_quantity: 20,
    metadata: { brand: 'StoreFlow', material: 'Polyester & Elastane', sizes: ['S', 'M', 'L', 'XL'] },
  },
  {
    name: 'Sunglasses',
    description: 'Stylish sunglasses with UV protection and premium frame.',
    price: 69.99,
    sku: 'SUN-STY-UV',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop',
    category: 'Accessories',
    stock_quantity: 55,
    metadata: { brand: 'StoreFlow', uvProtection: '100%', frame: 'Acetate' },
  },
];

/**
 * General demo products
 */
const generalProducts: DemoProduct[] = [
  {
    name: 'Premium Coffee Beans',
    description: 'Artisan coffee beans sourced from the finest regions.',
    price: 24.99,
    sku: 'COF-BNS-PRM',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=800&fit=crop',
    category: 'Food & Beverage',
    stock_quantity: 100,
  },
  {
    name: 'Yoga Mat',
    description: 'Non-slip yoga mat with comfortable cushioning.',
    price: 39.99,
    sku: 'YGA-MAT-NS',
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=800&fit=crop',
    category: 'Fitness',
    stock_quantity: 40,
  },
  {
    name: 'Ceramic Plant Pot',
    description: 'Beautiful ceramic pot perfect for indoor plants.',
    price: 19.99,
    sku: 'POT-CRM-PLT',
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&h=800&fit=crop',
    category: 'Home & Garden',
    stock_quantity: 60,
  },
  {
    name: 'Wireless Speaker',
    description: 'Portable Bluetooth speaker with excellent sound quality.',
    price: 79.99,
    sku: 'SPK-WLS-BT',
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&h=800&fit=crop',
    category: 'Electronics',
    stock_quantity: 30,
  },
  {
    name: 'Leather Journal',
    description: 'Handcrafted leather journal with lined pages.',
    price: 34.99,
    sku: 'JRN-LTH-HND',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=800&fit=crop',
    category: 'Stationery',
    stock_quantity: 50,
  },
  {
    name: 'Essential Oil Set',
    description: 'Set of 6 premium essential oils for aromatherapy.',
    price: 49.99,
    sku: 'OIL-ESS-SET',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&h=800&fit=crop',
    category: 'Wellness',
    stock_quantity: 35,
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: 'Eco-friendly water bottle that keeps drinks cold for 24 hours.',
    price: 29.99,
    sku: 'BTL-STL-ECO',
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&h=800&fit=crop',
    category: 'Accessories',
    stock_quantity: 70,
  },
  {
    name: 'Bamboo Cutting Board',
    description: 'Sustainable bamboo cutting board with juice groove.',
    price: 44.99,
    sku: 'BRD-BMB-CUT',
    image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&h=800&fit=crop',
    category: 'Kitchen',
    stock_quantity: 45,
  },
];

/**
 * Grocery demo products
 */
const groceryProducts: DemoProduct[] = [
  {
    name: 'Fresh Organic Broccoli',
    description: 'Nutritious, crisp & fresh green broccoli, perfect for healthy meals.',
    price: 3.14,
    compareAtPrice: 3.49,
    sku: 'VEG-BRO-ORG',
    image: 'https://images.unsplash.com/photo-1584270354949-c26b550d4b4a?w=800&h=800&fit=crop',
    category: 'Vegetables',
    stock_quantity: 50,
    metadata: { organic: true, unit: 'lb' },
  },
  {
    name: 'Fresh Crisp Lettuce',
    description: 'Organic, nutrient-packed & refreshing green lettuce.',
    price: 1.28,
    compareAtPrice: 1.51,
    sku: 'VEG-LET-CRS',
    image: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&h=800&fit=crop',
    category: 'Vegetables',
    stock_quantity: 40,
    metadata: { organic: true, unit: 'head' },
  },
  {
    name: 'Fresh Cilantro',
    description: 'Organic, fragrant, and flavorful herb perfect for cooking.',
    price: 1.85,
    compareAtPrice: 1.99,
    sku: 'VEG-CIL-ORG',
    image: 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?w=800&h=800&fit=crop',
    category: 'Vegetables',
    stock_quantity: 30,
    metadata: { organic: true, unit: 'bunch' },
  },
  {
    name: 'Fresh Organic Spinach',
    description: 'Nutrient-rich & healthy green spinach, perfect for salads.',
    price: 2.99,
    sku: 'VEG-SPN-ORG',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&h=800&fit=crop',
    category: 'Vegetables',
    stock_quantity: 35,
    metadata: { organic: true, unit: 'bunch' },
  },
  {
    name: 'Premium Black Pepper',
    description: 'Bold, spicy, and essential for every kitchen.',
    price: 3.69,
    compareAtPrice: 4.10,
    sku: 'SPC-BLK-PEP',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&h=800&fit=crop',
    category: 'Pure Spices',
    stock_quantity: 60,
    metadata: { organic: true, unit: 'oz' },
  },
  {
    name: 'Pure Garlic Powder',
    description: 'Aromatic, savory, and perfect for every dish.',
    price: 3.20,
    sku: 'SPC-GAR-PWD',
    image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&h=800&fit=crop',
    category: 'Pure Spices',
    stock_quantity: 55,
    metadata: { organic: true, unit: 'oz' },
  },
  {
    name: 'Fresh, Crisp Apples',
    description: 'Sweet, juicy, and refreshing apples, perfect for snacking.',
    price: 2.76,
    compareAtPrice: 2.90,
    sku: 'FRT-APP-CRS',
    image: 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?w=800&h=800&fit=crop',
    category: 'Pure Fruits',
    stock_quantity: 80,
    metadata: { organic: true, unit: 'lb' },
  },
  {
    name: 'Fresh, Sweet Mangoes',
    description: 'Tropical, juicy, and irresistible mangoes.',
    price: 3.71,
    compareAtPrice: 3.90,
    sku: 'FRT-MNG-SWT',
    image: 'https://images.unsplash.com/photo-1605027990121-c736a1ed3411?w=800&h=800&fit=crop',
    category: 'Pure Fruits',
    stock_quantity: 45,
    metadata: { organic: true, unit: 'lb' },
  },
  {
    name: 'Fresh & Sweet Pineapple',
    description: 'Tropical delight in every bite.',
    price: 4.56,
    compareAtPrice: 4.90,
    sku: 'FRT-PIN-SWT',
    image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=800&h=800&fit=crop',
    category: 'Pure Fruits',
    stock_quantity: 25,
    metadata: { organic: true, unit: 'each' },
  },
  {
    name: 'Fresh, Juicy Oranges',
    description: 'Sweet & refreshing citrus fruit, packed with vitamin C.',
    price: 2.32,
    compareAtPrice: 2.90,
    sku: 'FRT-ORG-JCY',
    image: 'https://images.unsplash.com/photo-1611080626919-7cf5e9adab5a?w=800&h=800&fit=crop',
    category: 'Pure Fruits',
    stock_quantity: 70,
    metadata: { organic: true, unit: 'lb' },
  },
  {
    name: 'Fresh & Ripe Bananas',
    description: 'Naturally sweet, healthy & delicious bananas.',
    price: 1.40,
    compareAtPrice: 2.40,
    sku: 'FRT-BAN-RPE',
    image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800&h=800&fit=crop',
    category: 'Pure Fruits',
    stock_quantity: 90,
    metadata: { organic: true, unit: 'lb' },
  },
  {
    name: 'Premium Beef Meat',
    description: 'Fresh and tender beef cuts, perfect for grilling.',
    price: 10.00,
    compareAtPrice: 12.00,
    sku: 'MT-BEF-PRM',
    image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=800&h=800&fit=crop',
    category: 'Fresh Meat',
    stock_quantity: 20,
    metadata: { organic: true, unit: 'lb' },
  },
  {
    name: 'Juicy Cheeseburger',
    description: 'Tender, savory, and packed with flavor.',
    price: 5.90,
    sku: 'FFD-CHS-BRG',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&h=800&fit=crop',
    category: 'Fast Food',
    stock_quantity: 15,
    metadata: { unit: 'each' },
  },
];

/**
 * Get demo products by industry
 */
export function getDemoProducts(industry: ThemeIndustry, count?: number): DemoProduct[] {
  let products: DemoProduct[];
  
  switch (industry) {
    case 'electronics':
      products = electronicsProducts;
      break;
    case 'fashion':
      products = fashionProducts;
      break;
    case 'grocery':
      products = groceryProducts;
      break;
    default:
      products = generalProducts;
  }
  
  return count ? products.slice(0, count) : products;
}

/**
 * Get demo categories by industry
 */
export function getDemoCategories(industry: ThemeIndustry): DemoCategory[] {
  switch (industry) {
    case 'electronics':
      return [
        { name: 'Laptops', slug: 'laptops', description: 'High-performance laptops for work and play' },
        { name: 'Phones', slug: 'phones', description: 'Latest smartphones and accessories' },
        { name: 'Audio', slug: 'audio', description: 'Headphones, speakers, and audio equipment' },
        { name: 'Accessories', slug: 'accessories', description: 'Tech accessories and peripherals' },
      ];
    case 'fashion':
      return [
        { name: 'Tops', slug: 'tops', description: 'Shirts, t-shirts, and blouses' },
        { name: 'Bottoms', slug: 'bottoms', description: 'Pants, jeans, and skirts' },
        { name: 'Outerwear', slug: 'outerwear', description: 'Jackets, coats, and blazers' },
        { name: 'Footwear', slug: 'footwear', description: 'Shoes, boots, and sneakers' },
        { name: 'Accessories', slug: 'accessories', description: 'Bags, jewelry, and accessories' },
      ];
    case 'grocery':
      return [
        { name: 'Fresh Meat', slug: 'fresh-meat', description: 'Fresh and organic meat products', image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?w=400&h=400&fit=crop' },
        { name: 'Pure Fruits', slug: 'pure-fruits', description: 'Fresh organic fruits', image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop' },
        { name: 'Fast Food', slug: 'fast-food', description: 'Quick and delicious meals', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop' },
        { name: 'Pure Spices', slug: 'pure-spices', description: 'Premium quality spices', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop' },
        { name: 'Dry Bread', slug: 'dry-bread', description: 'Fresh baked bread', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop' },
        { name: 'Vegetables', slug: 'vegetables', description: 'Fresh organic vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop' },
        { name: 'Layer Cake', slug: 'layer-cake', description: 'Delicious cakes and desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop' },
        { name: 'Organic Oil', slug: 'organic-oil', description: 'Premium organic cooking oils', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop' },
      ];
    default:
      return [
        { name: 'Featured', slug: 'featured', description: 'Featured products' },
        { name: 'New Arrivals', slug: 'new-arrivals', description: 'Latest products' },
        { name: 'Best Sellers', slug: 'best-sellers', description: 'Popular products' },
      ];
  }
}

