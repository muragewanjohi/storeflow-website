/**
 * Seed User Guide Content
 * 
 * Populates the database with comprehensive user guide categories and articles
 * for the DukaNest store management platform.
 * 
 * Categories are based on the tenant dashboard sidebar menu items.
 * Articles cover the features available within each menu section.
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
  if (directUrl && !directUrl.startsWith('prisma+')) {
    const isDirectConnection = directUrl.includes(':5432/') && 
                              !directUrl.includes('pooler.supabase.com');
    
    if (isDirectConnection) {
      console.log('   ⚠️  DIRECT_URL uses direct connection (port 5432) - may not be IPv4 compatible');
      console.log('   Trying DATABASE_URL (pooler) instead for better compatibility...');
      
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
    process.exit(1);
  }
} else {
  console.log('   Using DATABASE_URL connection');
  connectionString = databaseUrl;
}

const pool = new Pool({
  connectionString: connectionString,
  max: 10,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);
prisma = new PrismaClient({ adapter });

// Test connection
async function testConnection() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
  } catch (error: any) {
    console.error('❌ Failed to connect to database:', error.message);
    if (error.code === 'P1001' || error.message?.includes('Can\'t reach database server')) {
      console.error('\n⚠️  Database server unreachable. Check connection settings.');
    }
    process.exit(1);
  }
}

// ============================================================================
// ARTICLE CONTENT
// ============================================================================

const introductionOverviewContent = `<h2>Welcome to DukaNest</h2>
<p>Welcome to the DukaNest Store Dashboard user guide. This comprehensive guide is intended to help store owners and administrators learn how to use the DukaNest Dashboard to manage their online store effectively.</p>
<p><em>[Screenshot: DukaNest Store Dashboard Overview]</em></p>
<h2>Who is this guide for?</h2>
<p>This guide is for DukaNest store owners and administrators who want to master the Store Dashboard and manage their store operations effectively. You don't need any technical knowledge to follow this guide.</p>
<p>Whether you're setting up your store for the first time or looking to use advanced features, this guide covers everything you need to know.</p>
<h2>What is DukaNest?</h2>
<p>DukaNest is a multi-tenant ecommerce platform that enables businesses to create and manage their own online stores. Each store comes with:</p>
<ul>
<li><strong>A customizable storefront</strong> — Your own branded online store with themes and customization options</li>
<li><strong>Product management</strong> — Add, organize, and manage your product catalog with variants, categories, and attributes</li>
<li><strong>Order management</strong> — Process orders, manage fulfillment, and track deliveries</li>
<li><strong>Customer management</strong> — View customer profiles, order history, and manage relationships</li>
<li><strong>Marketing tools</strong> — Create sales campaigns and promotions to drive revenue</li>
<li><strong>Content management</strong> — Manage blog posts, static pages, forms, and media</li>
<li><strong>Payment integrations</strong> — Accept payments via M-Pesa, cash, and other methods</li>
<li><strong>Analytics</strong> — Track your store's performance with dashboards and reports</li>
</ul>
<h2>Accessing the Dashboard</h2>
<p>To access your DukaNest Store Dashboard, navigate to your store's admin URL and log in with your credentials. You'll need your email address and password to sign in.</p>
<p><em>[Screenshot: Login Page]</em></p>
<p>If you're unsure of your login credentials, contact your store administrator or use the "Forgot Password" link on the login page.</p>
<h2>Tour of the Dashboard</h2>
<p>After logging in, you'll see the main dashboard with a sidebar navigation on the left and the main content area in the center.</p>
<h3>Sidebar Navigation</h3>
<p>The sidebar contains the main navigation menu organized into sections:</p>
<ul>
<li><strong>Dashboard</strong> — Overview of your store's key metrics</li>
<li><strong>Themes</strong> — Manage and customize your store's appearance</li>
<li><strong>Orders</strong> — View and manage customer orders</li>
<li><strong>Products</strong> — Manage your product catalog, categories, attributes, and inventory</li>
<li><strong>Customers</strong> — View and manage your customer base</li>
<li><strong>Marketing</strong> — Create sales campaigns and view analytics</li>
<li><strong>Content</strong> — Manage pages, blogs, forms, and media</li>
<li><strong>Settings</strong> — Configure your store settings</li>
<li><strong>Support</strong> — Manage support tickets and get platform help</li>
<li><strong>Users</strong> — Manage team members and roles</li>
<li><strong>Subscription</strong> — Manage your subscription plan and billing</li>
</ul>
<p><em>[Screenshot: Sidebar Navigation]</em></p>
<p>You can collapse the sidebar by clicking the collapse button at the top to give more space to the main content area. The sidebar groups like Products, Marketing, Content, and Support are expandable — click on them to reveal sub-menu items.</p>
<h3>Getting Help</h3>
<p>If you need help at any time, you can:</p>
<ul>
<li>Browse this user guide for detailed instructions</li>
<li>Submit a support ticket through the Support section</li>
<li>Contact the DukaNest platform support team</li>
</ul>`;

const gettingStartedAccountContent = `<h2>Creating Your Store Account</h2>
<p>Getting started with DukaNest is simple. Follow these steps to create your store and start selling online.</p>
<p><em>[Screenshot: Store Registration Page]</em></p>
<h3>Step 1: Sign Up</h3>
<ol>
<li>Visit the DukaNest platform homepage</li>
<li>Click on <strong>"Get Started"</strong> or <strong>"Create Your Store"</strong></li>
<li>Fill in your details:
<ul>
<li><strong>Full Name</strong> — Your name as the store owner</li>
<li><strong>Email Address</strong> — A valid email for account verification</li>
<li><strong>Password</strong> — Create a strong password (8+ characters recommended)</li>
<li><strong>Store Name</strong> — Choose a name for your online store</li>
</ul>
</li>
<li>Click <strong>"Create Account"</strong></li>
</ol>
<h3>Step 2: Verify Your Email</h3>
<ol>
<li>Check your email inbox for a verification message from DukaNest</li>
<li>Click the verification link in the email</li>
<li>If you don't see the email, check your spam/junk folder</li>
<li>You can request a new verification email if needed</li>
</ol>
<h3>Step 3: Set Up Your Store</h3>
<p>After verifying your email, you'll be guided through the initial store setup:</p>
<ol>
<li><strong>Store Details</strong> — Add your store description, contact information, and address</li>
<li><strong>Theme Selection</strong> — Choose a theme for your storefront</li>
<li><strong>Payment Setup</strong> — Configure your preferred payment methods</li>
<li><strong>First Product</strong> — Add your first product to get started</li>
</ol>
<h3>Choosing a Subscription Plan</h3>
<p>DukaNest offers several subscription plans to match your business needs. You can start with a free trial and upgrade as your business grows. Each plan has different limits for products, orders, and features.</p>
<p>Visit the <strong>Subscription</strong> section in your dashboard to view available plans and manage your subscription.</p>`;

const gettingStartedLoginContent = `<h2>Logging Into Your Dashboard</h2>
<p>Access your DukaNest Store Dashboard by logging in with your credentials.</p>
<p><em>[Screenshot: Login Page]</em></p>
<h3>How to Log In</h3>
<ol>
<li>Navigate to your store's admin login page</li>
<li>Enter your <strong>email address</strong></li>
<li>Enter your <strong>password</strong></li>
<li>Click <strong>"Sign In"</strong></li>
</ol>
<h3>Multi-Factor Authentication (MFA)</h3>
<p>If MFA is enabled on your account, you'll be prompted for an additional verification step after entering your password:</p>
<ol>
<li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
<li>Enter the 6-digit code displayed in the app</li>
<li>Click <strong>"Verify"</strong> to complete login</li>
</ol>
<p>You can manage MFA settings from your <strong>Settings</strong> page once logged in.</p>
<h3>Forgot Password?</h3>
<p>If you've forgotten your password:</p>
<ol>
<li>Click <strong>"Forgot Password?"</strong> on the login page</li>
<li>Enter the email address associated with your account</li>
<li>Check your email for password reset instructions</li>
<li>Click the reset link and create a new password</li>
<li>Log in with your new password</li>
</ol>
<h3>Trusted Devices</h3>
<p>When logging in from a recognized device, you may be able to skip MFA verification. You can manage your trusted devices from the <strong>Settings</strong> page.</p>`;

const gettingStartedTourContent = `<h2>Tour of Your Store Dashboard</h2>
<p>This article walks you through the main areas of your DukaNest Store Dashboard so you can quickly find what you need.</p>
<p><em>[Screenshot: Dashboard Overview]</em></p>
<h3>The Main Dashboard</h3>
<p>When you first log in, you'll see the main Dashboard page which displays:</p>
<ul>
<li><strong>Key Metrics</strong> — Total Revenue, Total Orders, Total Customers, and Active Products at a glance</li>
<li><strong>Revenue Chart</strong> — A visual chart showing your revenue trends over the last 30 days</li>
<li><strong>Recent Orders</strong> — Your 5 most recent orders with status</li>
<li><strong>Top-Selling Products</strong> — Your best-performing products</li>
<li><strong>Low Stock Alerts</strong> — Products and variants that are running low on inventory</li>
<li><strong>Quick Actions</strong> — Shortcuts to common tasks like adding products, viewing orders, and managing inventory</li>
</ul>
<h3>Sidebar Navigation</h3>
<p>The sidebar on the left side of the screen is your main navigation tool. It's organized into logical sections:</p>
<p><em>[Screenshot: Sidebar Navigation]</em></p>
<ul>
<li><strong>Standalone Items</strong>: Dashboard, Themes, Orders, Customers, Settings</li>
<li><strong>Expandable Groups</strong>: Products, Marketing, Content, Support — click these to reveal sub-items</li>
<li><strong>Admin-Only Items</strong>: Themes, Users, and Subscription are only visible to admin users</li>
</ul>
<p>The sidebar can be collapsed by clicking the collapse button, giving you more screen space for the main content area. On mobile devices, the sidebar automatically becomes a slide-out menu.</p>
<h3>Navigation Tips</h3>
<ul>
<li>The currently active page is highlighted in the sidebar</li>
<li>Expandable groups automatically open when you navigate to a child page</li>
<li>Only one expandable group can be open at a time (accordion behavior)</li>
<li>Use the breadcrumbs at the top of pages to navigate back to parent sections</li>
</ul>`;

const dashboardOverviewContent = `<h2>Understanding Your Dashboard</h2>
<p>The Dashboard is your command center — the first page you see after logging in. It provides a quick snapshot of your store's health and recent activity.</p>
<p><em>[Screenshot: Dashboard Page]</em></p>
<h3>Key Metrics</h3>
<p>At the top of the dashboard, you'll see four important metrics displayed as cards:</p>
<ul>
<li><strong>Total Revenue</strong> — The total amount of revenue your store has generated</li>
<li><strong>Total Orders</strong> — The total number of orders placed on your store</li>
<li><strong>Total Customers</strong> — The number of registered customers</li>
<li><strong>Active Products</strong> — The number of currently active products in your catalog</li>
</ul>
<p><em>[Screenshot: Key Metrics Cards]</em></p>
<h3>Revenue Chart</h3>
<p>Below the metrics, you'll find a revenue chart that visualizes your store's revenue over the last 30 days. This area chart helps you identify trends and patterns in your sales performance.</p>
<p><em>[Screenshot: Revenue Chart]</em></p>
<h3>Recent Orders</h3>
<p>The Recent Orders section shows your 5 most recent orders, including:</p>
<ul>
<li>Order number</li>
<li>Customer name</li>
<li>Order total</li>
<li>Order status (with color-coded badges)</li>
<li>Order date</li>
</ul>
<p>Click on any order to view its full details. Click "View All Orders" to go to the complete orders list.</p>
<h3>Top-Selling Products</h3>
<p>See which products are performing best over the last 30 days. This helps you understand what your customers love and where to focus your marketing efforts.</p>
<h3>Low Stock Alerts</h3>
<p>The dashboard alerts you when products or product variants are running low on stock. This helps you stay on top of inventory and avoid disappointing customers with out-of-stock items.</p>
<p><em>[Screenshot: Low Stock Alerts]</em></p>
<h3>Quick Actions</h3>
<p>The dashboard provides quick action buttons for common tasks:</p>
<ul>
<li><strong>Add Product</strong> — Jump straight to the product creation form</li>
<li><strong>View Orders</strong> — Go to the orders management page</li>
<li><strong>View Customers</strong> — Navigate to your customer list</li>
<li><strong>Manage Inventory</strong> — Go to inventory management</li>
<li><strong>Full Analytics</strong> — View detailed analytics and reports</li>
</ul>
<h3>Welcome Banner</h3>
<p>New store owners will see a welcome banner with helpful links and a guided setup flow to get their store up and running quickly.</p>`;

const themesManagingContent = `<h2>Managing Your Store Themes</h2>
<p>Themes control the visual appearance of your customer-facing storefront. DukaNest provides a selection of professionally designed themes that you can install and customize.</p>
<p><em>[Screenshot: Themes List Page]</em></p>
<h3>Browsing Available Themes</h3>
<p>Navigate to <strong>Themes</strong> in the sidebar to see all available themes. Each theme displays:</p>
<ul>
<li>A preview image showing how the theme looks</li>
<li>The theme name and description</li>
<li>An <strong>"Install"</strong> or <strong>"Active"</strong> badge indicating the current status</li>
</ul>
<h3>Installing a Theme</h3>
<ol>
<li>Browse the available themes</li>
<li>Click <strong>"Preview"</strong> to see a live preview of the theme</li>
<li>Click <strong>"Install"</strong> on the theme you want to use</li>
<li>Optionally check <strong>"Include demo content"</strong> to populate your store with sample data</li>
<li>Confirm the installation</li>
</ol>
<p>The installed theme will become your active storefront theme immediately.</p>
<h3>Switching Themes</h3>
<p>If you have multiple themes installed, you can switch between them:</p>
<ol>
<li>Go to the <strong>Themes</strong> page</li>
<li>Find the theme you want to activate</li>
<li>Click <strong>"Activate"</strong> to make it your current theme</li>
</ol>
<p>Switching themes is instant and your store's content (products, pages, etc.) remains unchanged — only the visual appearance changes.</p>`;

const themesCustomizingContent = `<h2>Customizing Your Store Theme</h2>
<p>After installing a theme, you can customize its appearance to match your brand. The Theme Customizer gives you control over colors, typography, layout, and branding.</p>
<p><em>[Screenshot: Theme Customizer]</em></p>
<h3>Accessing the Customizer</h3>
<p>Click the <strong>"Customize"</strong> button on your active theme, or navigate to <strong>Themes → Customize</strong>.</p>
<h3>Colors</h3>
<p>Customize your store's color palette:</p>
<ul>
<li><strong>Primary Color</strong> — Main brand color used for buttons, links, and accents</li>
<li><strong>Secondary Color</strong> — Supporting color for secondary elements</li>
<li><strong>Accent Color</strong> — Highlight color for special elements</li>
<li><strong>Background Color</strong> — Main background color of your store</li>
<li><strong>Text Color</strong> — Default text color</li>
<li><strong>Muted Color</strong> — Color for secondary text and borders</li>
<li><strong>Button Background/Text</strong> — Specific colors for button elements</li>
</ul>
<p>Each color has a color picker and hex code input for precise control.</p>
<p><em>[Screenshot: Color Customization]</em></p>
<h3>Typography</h3>
<p>Customize your store's fonts and text styles:</p>
<ul>
<li><strong>Heading Font</strong> — Font used for headings and titles</li>
<li><strong>Body Font</strong> — Font used for body text and paragraphs</li>
<li><strong>Base Font Size</strong> — The default font size for body text</li>
<li><strong>Heading Weight</strong> — The boldness of heading text</li>
</ul>
<h3>Layout</h3>
<p>Control the structural elements of your store:</p>
<ul>
<li><strong>Header Style</strong> — Choose between Sticky, Static, or Transparent headers</li>
<li><strong>Footer Style</strong> — Select Multi-column, Simple, or Minimal footers</li>
<li><strong>Sidebar Position</strong> — Choose left or right sidebar placement</li>
<li><strong>Container Max Width</strong> — Set the maximum width of your content area</li>
</ul>
<h3>Branding & SEO</h3>
<p>Upload your brand assets and configure SEO:</p>
<ul>
<li><strong>Store Logo</strong> — Upload your store's logo image</li>
<li><strong>Favicon</strong> — Upload or auto-generate from your logo</li>
<li><strong>Meta Title</strong> — Your store's title for search engines</li>
<li><strong>Meta Description</strong> — A brief description for search results</li>
<li><strong>Meta Keywords</strong> — Keywords for search engine optimization</li>
</ul>
<p><em>[Screenshot: Branding Settings]</em></p>
<h3>Export & Import</h3>
<p>You can export your theme customizations as a file and import them later or on another store. This is useful for:</p>
<ul>
<li>Backing up your customizations before making changes</li>
<li>Sharing theme settings across multiple stores</li>
<li>Quickly restoring a previous configuration</li>
</ul>`;

const ordersManagingContent = `<h2>Managing Orders</h2>
<p>The Orders page is where you view, process, and manage all customer orders. Navigate to <strong>Orders</strong> in the sidebar to access it.</p>
<p><em>[Screenshot: Orders List Page]</em></p>
<h3>Orders List</h3>
<p>The orders list displays all orders in a paginated table with the following information:</p>
<ul>
<li><strong>Order Number</strong> — Unique identifier for each order</li>
<li><strong>Customer</strong> — Customer name and email</li>
<li><strong>Items</strong> — Number of items in the order</li>
<li><strong>Total</strong> — Order total amount</li>
<li><strong>Status</strong> — Current order status (Pending, Processing, Shipped, Delivered)</li>
<li><strong>Payment Status</strong> — Payment state (Pending, Paid, Failed, Refunded)</li>
<li><strong>Date</strong> — When the order was placed</li>
</ul>
<h3>Filtering Orders</h3>
<p>Use the filter options to find specific orders:</p>
<ul>
<li><strong>Search</strong> — Search by order number, customer name, or email</li>
<li><strong>Order Status</strong> — Filter by Pending, Processing, Shipped, or Delivered</li>
<li><strong>Payment Status</strong> — Filter by Pending, Paid, Failed, or Refunded</li>
<li><strong>Customer Email</strong> — Filter by specific customer email</li>
<li><strong>Date Range</strong> — Filter orders within a date range</li>
</ul>
<h3>Bulk Actions</h3>
<p>Perform actions on multiple orders at once:</p>
<ul>
<li><strong>Export to CSV</strong> — Download selected orders as a CSV spreadsheet</li>
<li><strong>Bulk Status Update</strong> — Update the status of multiple orders simultaneously</li>
</ul>
<h3>Order Status Flow</h3>
<p>Orders follow this typical lifecycle:</p>
<ol>
<li><strong>Pending</strong> — Order has been placed but not yet processed</li>
<li><strong>Processing</strong> — Order is being prepared for shipment</li>
<li><strong>Shipped</strong> — Order has been shipped (includes tracking information)</li>
<li><strong>Delivered</strong> — Order has been successfully delivered</li>
</ol>
<p>Orders can also be <strong>Cancelled</strong> at any point before delivery.</p>`;

const ordersDetailContent = `<h2>Order Details & Fulfillment</h2>
<p>Click on any order in the orders list to view its complete details and manage its fulfillment.</p>
<p><em>[Screenshot: Order Detail Page]</em></p>
<h3>Order Information</h3>
<p>The order detail page shows comprehensive information:</p>
<ul>
<li><strong>Order Items</strong> — Each product with image, name, SKU, quantity, and price</li>
<li><strong>Order Timeline</strong> — Visual timeline showing the order's progression (Placed → Processing → Shipped → Delivered)</li>
<li><strong>Shipping Address</strong> — Where the order will be delivered</li>
<li><strong>Billing Address</strong> — The customer's billing address</li>
<li><strong>Customer Contact</strong> — Customer email and phone number</li>
</ul>
<h3>Updating Order Status</h3>
<p>To update an order's status:</p>
<ol>
<li>Open the order detail page</li>
<li>Click <strong>"Update Status"</strong></li>
<li>Select the new status from the dropdown</li>
<li>If marking as <strong>"Shipped"</strong>, enter the tracking number and carrier name</li>
<li>Click <strong>"Update"</strong> to save</li>
</ol>
<p><em>[Screenshot: Update Order Status]</em></p>
<h3>Managing Payments</h3>
<p>You can update the payment status separately:</p>
<ul>
<li><strong>Mark as Paid</strong> — Confirm that payment has been received</li>
<li><strong>Mark as Refunded</strong> — Record a refund for the order</li>
</ul>
<h3>M-Pesa Payment Verification</h3>
<p>For orders paid via M-Pesa, you can verify the payment:</p>
<ol>
<li>Review the M-Pesa transaction details provided by the customer</li>
<li>Click <strong>"Verify Payment"</strong> to confirm the payment is valid</li>
<li>Or click <strong>"Reject Payment"</strong> if the payment cannot be verified</li>
</ol>
<h3>Delivery Fee Quotes</h3>
<p>For orders that require delivery outside your standard zones:</p>
<ol>
<li>Calculate the delivery fee for the customer's location</li>
<li>Send a delivery fee quote to the customer</li>
<li>The customer will receive the quote and can accept or decline</li>
</ol>
<h3>Cancelling Orders</h3>
<p>To cancel an order:</p>
<ol>
<li>Open the order detail page</li>
<li>Click <strong>"Cancel Order"</strong></li>
<li>Provide a reason for the cancellation</li>
<li>Confirm the cancellation</li>
</ol>
<p>Note: Cancellation may not be possible for orders that have already been shipped or delivered.</p>
<h3>Download Invoice</h3>
<p>You can download or print an invoice/receipt for any order by clicking the <strong>"Download Invoice"</strong> button on the order detail page.</p>`;

const productsManagingContent = `<h2>Managing Products</h2>
<p>The Products page is where you manage your entire product catalog. Navigate to <strong>Products → Products</strong> in the sidebar.</p>
<p><em>[Screenshot: Products List Page]</em></p>
<h3>Products List</h3>
<p>The products list shows all your products in a paginated table:</p>
<ul>
<li><strong>Image</strong> — Product thumbnail</li>
<li><strong>Name</strong> — Product name</li>
<li><strong>SKU</strong> — Stock Keeping Unit identifier</li>
<li><strong>Price</strong> — Regular price and sale price (if applicable)</li>
<li><strong>Stock</strong> — Current inventory level</li>
<li><strong>Status</strong> — Active, Inactive, Draft, or Archived</li>
</ul>
<h3>Filtering & Searching</h3>
<ul>
<li><strong>Full-text Search</strong> — Search across product names, descriptions, and SKUs</li>
<li><strong>Status Filter</strong> — Filter by Active, Inactive, Draft, or Archived</li>
<li><strong>Category Filter</strong> — Filter by product category</li>
</ul>
<h3>Creating a New Product</h3>
<ol>
<li>Click <strong>"+ New Product"</strong> at the top of the products list</li>
<li>Fill in the product details:
<ul>
<li><strong>Product Name</strong> — A descriptive name for your product</li>
<li><strong>SKU</strong> — Auto-generated, but you can customize it</li>
<li><strong>Short Description</strong> — A brief summary shown on product cards</li>
<li><strong>Full Description</strong> — Detailed product description (supports rich text with formatting, images, and links)</li>
</ul>
</li>
<li>Set pricing and inventory:
<ul>
<li><strong>Regular Price</strong> — The standard selling price</li>
<li><strong>Sale Price</strong> — Optional discounted price</li>
<li><strong>Stock Quantity</strong> — How many units you have available</li>
</ul>
</li>
<li>Upload a <strong>Product Image</strong></li>
<li>Choose a <strong>Category</strong> for the product</li>
<li>Set the <strong>Status</strong> (Draft, Active, etc.)</li>
<li>Click <strong>"Create Product"</strong></li>
</ol>
<p><em>[Screenshot: Product Creation Form]</em></p>
<h3>Editing Products</h3>
<p>Click the <strong>Edit</strong> button (pencil icon) on any product to modify its details. All fields from creation are available for editing.</p>
<h3>Product Actions</h3>
<p>Each product has action buttons for:</p>
<ul>
<li><strong>Edit</strong> — Modify product details</li>
<li><strong>Toggle Status</strong> — Quickly activate or deactivate a product</li>
<li><strong>Share</strong> — Share the product on Facebook, Twitter, WhatsApp, or copy the link</li>
<li><strong>Delete</strong> — Permanently remove the product</li>
</ul>`;

const productsVariantsContent = `<h2>Product Variants</h2>
<p>Product variants allow you to offer different options for the same product, such as different sizes, colors, or materials. Each variant can have its own price, stock level, SKU, and image.</p>
<p><em>[Screenshot: Product Variants Section]</em></p>
<h3>Adding Variants to a Product</h3>
<ol>
<li>Open the product edit page</li>
<li>Scroll down to the <strong>Product Variants</strong> section</li>
<li>Click <strong>"Add Variant"</strong></li>
<li>Select the <strong>attribute</strong> (e.g., Size, Color) from the dropdown</li>
<li>Choose or enter the <strong>attribute value</strong> (e.g., Large, Red)</li>
<li>Set variant-specific details:
<ul>
<li><strong>SKU</strong> — Unique identifier for this variant</li>
<li><strong>Price</strong> — Variant-specific price (overrides the base product price)</li>
<li><strong>Stock</strong> — Inventory level for this specific variant</li>
<li><strong>Image</strong> — Optional variant-specific image</li>
</ul>
</li>
<li>Click <strong>"Save Variant"</strong></li>
</ol>
<h3>Managing Existing Variants</h3>
<p>For each variant, you can:</p>
<ul>
<li><strong>Edit</strong> — Update the variant's price, stock, SKU, or image</li>
<li><strong>Delete</strong> — Remove a variant from the product</li>
</ul>
<h3>How Variants Work on the Storefront</h3>
<p>When a customer views a product with variants on your store, they'll see selectors (like dropdowns or color swatches) to choose their preferred option. The price and availability will update based on their selection.</p>
<h3>Variant Names</h3>
<p>Variant names are auto-generated from the selected attributes. For example, if you add a Size: Large and Color: Red variant, the name will be "Large / Red".</p>`;

const productsCategoriesContent = `<h2>Product Categories</h2>
<p>Categories help organize your products so customers can easily browse and find what they're looking for. DukaNest supports hierarchical categories with parent and sub-categories.</p>
<p><em>[Screenshot: Categories List Page]</em></p>
<h3>Viewing Categories</h3>
<p>Navigate to <strong>Products → Categories</strong> to see all your categories. The list shows:</p>
<ul>
<li><strong>Category Name</strong> — With visual indentation for sub-categories</li>
<li><strong>Slug</strong> — URL-friendly identifier</li>
<li><strong>Status</strong> — Active or Inactive</li>
<li><strong>Image</strong> — Optional category image</li>
</ul>
<h3>Creating a Category</h3>
<ol>
<li>Click <strong>"+ New Category"</strong></li>
<li>Enter the <strong>Category Name</strong></li>
<li>Optionally select a <strong>Parent Category</strong> to create a sub-category</li>
<li>Set the <strong>Status</strong> (Active or Inactive)</li>
<li>Optionally upload a <strong>Category Image</strong></li>
<li>Click <strong>"Create Category"</strong></li>
</ol>
<h3>Category Hierarchy</h3>
<p>You can create a two-level category structure:</p>
<ul>
<li><strong>Parent Categories</strong> — Top-level groupings (e.g., "Electronics", "Clothing")</li>
<li><strong>Sub-Categories</strong> — More specific groupings under a parent (e.g., "Phones", "Laptops" under "Electronics")</li>
</ul>
<p>On your storefront, categories appear in the navigation menu and help customers filter products.</p>
<h3>Editing & Deleting Categories</h3>
<ul>
<li>Click the <strong>Edit</strong> icon to modify a category's name, parent, status, or image</li>
<li>Click the <strong>Delete</strong> icon to remove a category. Note: products in the deleted category will become uncategorized</li>
</ul>`;

const productsAttributesContent = `<h2>Product Attributes</h2>
<p>Attributes define the characteristics that differentiate product variants, such as Size, Color, Weight, or Material. You must set up attributes before creating product variants.</p>
<p><em>[Screenshot: Attributes List Page]</em></p>
<h3>Viewing Attributes</h3>
<p>Navigate to <strong>Products → Attributes</strong> to see all configured attributes. Each attribute shows:</p>
<ul>
<li><strong>Attribute Name</strong> — e.g., Size, Color, Material</li>
<li><strong>Type</strong> — Text, Color, Size, or Number</li>
<li><strong>Values</strong> — The possible values for this attribute</li>
</ul>
<h3>Creating an Attribute</h3>
<ol>
<li>Click <strong>"+ New Attribute"</strong></li>
<li>Enter the <strong>Attribute Name</strong> (e.g., "Size", "Color")</li>
<li>Select the <strong>Type</strong>:
<ul>
<li><strong>Text</strong> — General text values (e.g., Material: Cotton, Polyester)</li>
<li><strong>Color</strong> — Color values with color picker (includes hex code for visual swatches)</li>
<li><strong>Size</strong> — Size values (e.g., S, M, L, XL)</li>
<li><strong>Number</strong> — Numeric values (e.g., Weight: 100, 200, 500)</li>
</ul>
</li>
<li>Add <strong>Attribute Values</strong> — Enter the specific options for this attribute</li>
<li>Click <strong>"Save"</strong></li>
</ol>
<p><em>[Screenshot: Create Attribute Form]</em></p>
<h3>Color Attributes</h3>
<p>For Color-type attributes, each value includes a color code (hex value) that displays as a visual swatch on your storefront. You can use the color picker or enter the hex code directly.</p>
<h3>Using Attributes with Products</h3>
<p>Once you've created attributes, you can use them when adding variants to your products. Select the attribute and its value when creating each variant.</p>`;

const productsInventoryContent = `<h2>Inventory Management</h2>
<p>The Inventory page gives you a centralized view of your stock levels across all products and variants. Navigate to <strong>Products → Inventory</strong>.</p>
<p><em>[Screenshot: Inventory Page]</em></p>
<h3>Inventory Overview</h3>
<p>The inventory page displays a comprehensive view of your stock:</p>
<ul>
<li><strong>Product/Variant Name</strong> — The item being tracked</li>
<li><strong>SKU</strong> — Stock Keeping Unit</li>
<li><strong>Current Stock</strong> — How many units are available</li>
<li><strong>Status Indicators</strong> — Color-coded indicators for stock levels (Green = healthy, Yellow = low, Red = critical/out of stock)</li>
</ul>
<h3>Updating Stock</h3>
<p>To update inventory levels:</p>
<ol>
<li>Find the product or variant in the inventory list</li>
<li>Click to edit the stock quantity</li>
<li>Enter the new stock level</li>
<li>Save the changes</li>
</ol>
<h3>Low Stock Alerts</h3>
<p>The system automatically alerts you on the Dashboard when products are running low on stock. This helps you reorder in time and avoid stockouts.</p>
<h3>Inventory Settings (Admin Only)</h3>
<p>Admin users can access <strong>Inventory Settings</strong> to configure:</p>
<ul>
<li><strong>Low Stock Threshold</strong> — The quantity at which a product is considered "low stock"</li>
<li><strong>Out of Stock Behavior</strong> — What happens when a product runs out (hide from store, show as "Out of Stock", allow backorders)</li>
</ul>`;

const customersManagingContent = `<h2>Managing Customers</h2>
<p>The Customers page gives you a complete view of everyone who has created an account on your store. Navigate to <strong>Customers</strong> in the sidebar.</p>
<p><em>[Screenshot: Customers List Page]</em></p>
<h3>Customers List</h3>
<p>The customers list shows all registered customers in a paginated table:</p>
<ul>
<li><strong>Name</strong> — Customer's full name</li>
<li><strong>Email</strong> — Email address</li>
<li><strong>Mobile</strong> — Phone number</li>
<li><strong>Orders</strong> — Number of orders placed</li>
<li><strong>Total Spent</strong> — Total amount the customer has spent</li>
<li><strong>Email Verified</strong> — Whether the customer has verified their email</li>
</ul>
<h3>Searching & Filtering</h3>
<ul>
<li><strong>Search</strong> — Search by customer name, email, or username</li>
<li><strong>Email Filter</strong> — Filter by specific email address</li>
</ul>
<h3>Customer Details</h3>
<p>Click on any customer to view their detailed profile, organized into tabs:</p>
<h4>Overview Tab</h4>
<ul>
<li>Contact information (email, phone, username, company)</li>
<li>General address</li>
<li>Account statistics (cart items, reviews, member since, last updated)</li>
</ul>
<h4>Orders Tab</h4>
<ul>
<li>Complete list of the customer's orders</li>
<li>Each order shows: order number, date, items, amount, and status</li>
</ul>
<h4>Addresses Tab</h4>
<ul>
<li>All saved shipping and billing addresses</li>
</ul>
<h4>Reviews Tab</h4>
<ul>
<li>Product reviews submitted by this customer</li>
<li>Shows product name, rating, comment, and review status</li>
</ul>
<p><em>[Screenshot: Customer Detail Page]</em></p>
<h3>Export Customers</h3>
<p>You can export your customer data to a CSV file by clicking the <strong>"Export"</strong> button. This is useful for:</p>
<ul>
<li>Email marketing campaigns</li>
<li>Data analysis and reporting</li>
<li>Backup purposes</li>
</ul>`;

const marketingSalesContent = `<h2>Sales & Promotions</h2>
<p>Create sales campaigns to offer discounts and drive revenue. Navigate to <strong>Marketing → Sales</strong> in the sidebar.</p>
<p><em>[Screenshot: Sales List Page]</em></p>
<h3>Sales List</h3>
<p>The sales page shows all your promotions with:</p>
<ul>
<li><strong>Sale Name</strong> — The name of the promotion</li>
<li><strong>Status</strong> — Draft, Active, Scheduled, or Ended</li>
<li><strong>Start/End Dates</strong> — When the sale runs</li>
<li><strong>Products</strong> — Number of products included in the sale</li>
<li><strong>Featured</strong> — Whether the sale is featured on your storefront</li>
</ul>
<h3>Creating a Sale</h3>
<ol>
<li>Click <strong>"+ New Sale"</strong></li>
<li>Fill in the <strong>Basic Info</strong>:
<ul>
<li><strong>Sale Name</strong> — A catchy name for your promotion (e.g., "Summer Sale", "Black Friday")</li>
<li><strong>Slug</strong> — Auto-generated URL-friendly identifier</li>
<li><strong>Description</strong> — Describe the promotion</li>
<li><strong>Banner Image</strong> — Upload an eye-catching banner for the sale page</li>
</ul>
</li>
<li>Set <strong>Dates & Status</strong>:
<ul>
<li><strong>Start Date/Time</strong> — When the sale begins</li>
<li><strong>End Date/Time</strong> — When the sale ends</li>
<li><strong>Status</strong> — Set to Draft while preparing, then Active to go live</li>
<li><strong>Featured</strong> — Check to feature on your storefront homepage</li>
</ul>
</li>
<li>Customize the <strong>Sale Badge</strong>:
<ul>
<li><strong>Badge Text</strong> — Text shown on product cards (e.g., "SALE", "20% OFF")</li>
<li><strong>Badge Color</strong> — Color of the badge</li>
</ul>
</li>
<li>Click <strong>"Create Sale"</strong></li>
</ol>
<p><em>[Screenshot: Create Sale Form]</em></p>
<h3>Adding Products to a Sale</h3>
<ol>
<li>Open the sale detail page</li>
<li>Go to the <strong>Products</strong> tab</li>
<li>Click <strong>"Add Products"</strong></li>
<li>Select the products you want to include</li>
<li>Set the <strong>sale price</strong> for each product (the discounted price during the sale)</li>
<li>Save the changes</li>
</ol>
<h3>Sale Actions</h3>
<ul>
<li><strong>Edit</strong> — Modify sale details, dates, or products</li>
<li><strong>Duplicate</strong> — Create a copy of an existing sale (great for recurring promotions)</li>
<li><strong>Share</strong> — Share the sale on social media (Facebook, Twitter, WhatsApp) or copy the link</li>
<li><strong>Preview</strong> — See how the sale will appear on your storefront</li>
<li><strong>Delete</strong> — Remove the sale</li>
</ul>
<h3>Storefront Display</h3>
<p>Active sales are displayed on your storefront at <code>/sales/[sale-slug]</code>. Products included in active sales will show the sale badge and discounted pricing throughout your store.</p>`;

const marketingAnalyticsContent = `<h2>Analytics</h2>
<p>The Analytics page provides insights into your store's performance. Navigate to <strong>Marketing → Analytics</strong> in the sidebar.</p>
<p><em>[Screenshot: Analytics Page]</em></p>
<h3>What You Can Track</h3>
<p>The analytics dashboard helps you understand:</p>
<ul>
<li><strong>Revenue Trends</strong> — Track how your revenue changes over time</li>
<li><strong>Order Trends</strong> — See order volume patterns</li>
<li><strong>Top Products</strong> — Identify your best-selling products</li>
<li><strong>Customer Insights</strong> — Understand your customer base growth</li>
</ul>
<h3>Using Analytics Data</h3>
<p>Use your analytics data to make informed business decisions:</p>
<ul>
<li>Identify seasonal trends and plan promotions accordingly</li>
<li>Focus marketing efforts on your top-performing products</li>
<li>Track the effectiveness of sales campaigns</li>
<li>Monitor customer growth and retention</li>
</ul>`;

const contentPagesContent = `<h2>Managing Pages</h2>
<p>Create and manage static content pages for your storefront, such as About Us, Contact, FAQ, or any custom page. Navigate to <strong>Content → Pages</strong>.</p>
<p><em>[Screenshot: Pages List]</em></p>
<h3>Pages List</h3>
<p>The pages list shows all your content pages:</p>
<ul>
<li><strong>Title</strong> — Page title</li>
<li><strong>Slug</strong> — URL path (e.g., /about, /contact)</li>
<li><strong>Status</strong> — Draft, Published, or Archived</li>
<li><strong>Last Updated</strong> — When the page was last modified</li>
</ul>
<h3>System Pages</h3>
<p>DukaNest comes with pre-created system pages that cannot be deleted:</p>
<ul>
<li><strong>Home</strong> — Your store's homepage</li>
<li><strong>About</strong> — Information about your store</li>
<li><strong>Contact</strong> — Contact information and form</li>
</ul>
<h3>Creating a Page</h3>
<ol>
<li>Click <strong>"+ New Page"</strong></li>
<li>Enter the <strong>Title</strong> — The page title (also used for the heading)</li>
<li>The <strong>Slug</strong> is auto-generated from the title (e.g., "Shipping Policy" → /shipping-policy)</li>
<li>Choose a content editing mode:
<ul>
<li><strong>Rich Text Editor</strong> — Write content with formatting toolbar (bold, italic, headings, lists, links, images, code blocks, quotes)</li>
<li><strong>Page Builder</strong> — Build pages visually with drag-and-drop sections</li>
</ul>
</li>
<li>Optionally add a <strong>Banner Image</strong></li>
<li>Configure <strong>SEO Settings</strong>:
<ul>
<li>Meta Title — Title shown in search results</li>
<li>Meta Description — Description shown in search results</li>
<li>Meta Tags — Keywords for search engines</li>
</ul>
</li>
<li>Set the <strong>Status</strong> (Draft or Published)</li>
<li>Click <strong>"Save"</strong> or <strong>"Publish"</strong></li>
</ol>
<p><em>[Screenshot: Page Editor with Rich Text]</em></p>
<h3>Rich Text Editor</h3>
<p>The rich text editor provides a toolbar with:</p>
<ul>
<li><strong>Text Formatting</strong> — Bold, Italic</li>
<li><strong>Headings</strong> — H1, H2, H3</li>
<li><strong>Lists</strong> — Bulleted and numbered lists</li>
<li><strong>Quotes</strong> — Block quotes</li>
<li><strong>Code Blocks</strong> — For displaying code snippets</li>
<li><strong>Links</strong> — Insert hyperlinks</li>
<li><strong>Images</strong> — Upload and insert images directly into the content</li>
</ul>
<h3>Page Builder</h3>
<p>The page builder allows you to create pages visually by adding and arranging sections. Each section has its own settings and content.</p>`;

const contentBlogsContent = `<h2>Managing Blogs</h2>
<p>Create and manage blog posts to engage your customers, improve SEO, and drive traffic to your store. Navigate to <strong>Content → Blogs</strong>.</p>
<p><em>[Screenshot: Blogs List Page]</em></p>
<h3>Blog Posts List</h3>
<p>The blog list shows all your posts:</p>
<ul>
<li><strong>Title</strong> — Blog post title</li>
<li><strong>Category</strong> — The blog category</li>
<li><strong>Status</strong> — Draft, Published, or Archived</li>
<li><strong>Last Updated</strong> — When the post was last modified</li>
</ul>
<h3>Creating a Blog Post</h3>
<ol>
<li>Click <strong>"+ New Blog Post"</strong></li>
<li>Enter the <strong>Title</strong></li>
<li>The <strong>Slug</strong> is auto-generated from the title</li>
<li>Write your content using:
<ul>
<li><strong>Rich Text Editor</strong> — For formatted text with images and links</li>
<li><strong>Page Builder</strong> — For visually designed posts with sections</li>
</ul>
</li>
<li>Write an <strong>Excerpt</strong> — A brief summary shown in blog listings</li>
<li>Select a <strong>Category</strong> for the blog post</li>
<li>Upload a <strong>Featured Image</strong></li>
<li>Configure <strong>SEO Settings</strong> (Meta Title, Description, Tags)</li>
<li>Set the <strong>Status</strong> (Draft, Published, or Archived)</li>
<li>Click <strong>"Save"</strong></li>
</ol>
<p><em>[Screenshot: Blog Post Editor]</em></p>
<h3>Blog Categories</h3>
<p>Manage blog categories by navigating to <strong>Content → Blog Categories</strong>. Categories help organize your blog posts and make it easier for readers to find content they're interested in.</p>
<p>To create a blog category:</p>
<ol>
<li>Click <strong>"+ New Category"</strong></li>
<li>Enter the <strong>Category Name</strong></li>
<li>The <strong>Slug</strong> is auto-generated</li>
<li>Click <strong>"Create"</strong></li>
</ol>`;

const contentMediaContent = `<h2>Media Library</h2>
<p>The Media Library is your centralized location for managing all uploaded images and files. Navigate to <strong>Content → Media Library</strong>.</p>
<p><em>[Screenshot: Media Library Page]</em></p>
<h3>Viewing Your Media</h3>
<p>The media library displays all your uploaded files in a grid view. Each item shows:</p>
<ul>
<li>Image thumbnail or file icon</li>
<li>File name</li>
<li>Upload date</li>
<li>File size</li>
</ul>
<h3>Uploading Files</h3>
<ol>
<li>Click <strong>"Upload"</strong> in the media library</li>
<li>Select files from your computer or drag and drop them</li>
<li>Supported formats: JPEG, PNG, WebP, GIF (max 5MB per file)</li>
<li>Files are automatically uploaded and available for use</li>
</ol>
<h3>Using Media in Your Store</h3>
<p>Images from the media library can be used in:</p>
<ul>
<li>Product images</li>
<li>Blog post featured images and inline images</li>
<li>Page content and banners</li>
<li>Theme branding (logo, favicon)</li>
<li>Sale campaign banners</li>
</ul>`;

const contentFormsContent = `<h2>Managing Forms</h2>
<p>Create and manage contact forms and other form submissions from your storefront. Navigate to <strong>Content → Forms</strong>.</p>
<p><em>[Screenshot: Forms Page]</em></p>
<h3>Form Submissions</h3>
<p>View all submissions from forms on your storefront:</p>
<ul>
<li>Contact form submissions</li>
<li>Custom form submissions</li>
<li>Each submission shows the sender's details, message, and submission date</li>
</ul>
<h3>Managing Submissions</h3>
<p>For each form submission, you can:</p>
<ul>
<li><strong>View</strong> — Read the full submission details</li>
<li><strong>Mark as Read/Unread</strong> — Track which submissions you've reviewed</li>
<li><strong>Delete</strong> — Remove old or spam submissions</li>
</ul>`;

const settingsGeneralContent = `<h2>General Settings</h2>
<p>Configure your store's basic information and preferences. Navigate to <strong>Settings</strong> in the sidebar.</p>
<p><em>[Screenshot: Settings Page]</em></p>
<h3>Store Details</h3>
<p>Update your store's basic information:</p>
<ul>
<li><strong>Store Name</strong> — Your store's name (read-only, set during registration)</li>
<li><strong>Domain</strong> — Your store's URL (read-only)</li>
<li><strong>Store Logo</strong> — Upload your store's logo image</li>
<li><strong>Description</strong> — A brief description of your store</li>
<li><strong>Contact Phone</strong> — Your store's contact phone number</li>
<li><strong>Address</strong> — Your physical store or business address</li>
<li><strong>City, State, Country</strong> — Location details</li>
<li><strong>Postal Code</strong> — Your postal/ZIP code</li>
</ul>
<h3>Contact Email</h3>
<p>Update your store's primary contact email address. This is used for:</p>
<ul>
<li>Order notifications</li>
<li>Customer inquiries</li>
<li>System notifications</li>
</ul>
<h3>Multi-Factor Authentication (MFA)</h3>
<p>Enhance your account security by enabling MFA:</p>
<ol>
<li>Navigate to the <strong>MFA Settings</strong> section</li>
<li>Click <strong>"Enable MFA"</strong></li>
<li>Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)</li>
<li>Enter the verification code to confirm setup</li>
</ol>
<p>Once enabled, you'll need to enter a 6-digit code from your authenticator app each time you log in.</p>
<h3>Trusted Devices</h3>
<p>Manage devices that are trusted for login. Trusted devices can skip MFA verification for convenience.</p>`;

const settingsCurrencyContent = `<h2>Currency Settings</h2>
<p>Configure how prices and currency are displayed in your store.</p>
<p><em>[Screenshot: Currency Settings]</em></p>
<h3>Currency Configuration</h3>
<ul>
<li><strong>Currency Code</strong> — The ISO currency code (e.g., KES, USD, EUR)</li>
<li><strong>Currency Symbol</strong> — The symbol displayed with prices (e.g., KSh, $, €)</li>
<li><strong>Symbol Position</strong> — Choose whether the symbol appears before or after the amount (e.g., "KSh 1,000" vs "1,000 KSh")</li>
<li><strong>Decimal Places</strong> — Number of decimal places in prices (typically 2)</li>
<li><strong>Thousand Separator</strong> — Character used for thousand grouping (e.g., comma: 1,000)</li>
<li><strong>Decimal Separator</strong> — Character used for decimal point (e.g., period: 1,000.00)</li>
</ul>
<h3>How It Works</h3>
<p>Currency settings affect how all prices are displayed throughout your store, including:</p>
<ul>
<li>Product prices on the storefront</li>
<li>Cart totals and checkout amounts</li>
<li>Order totals and invoices</li>
<li>Dashboard metrics and reports</li>
</ul>`;

const settingsShippingContent = `<h2>Shipping Settings</h2>
<p>Configure how products are delivered to your customers. DukaNest supports multiple shipping methods to suit different business needs.</p>
<p><em>[Screenshot: Shipping Settings]</em></p>
<h3>Enable/Disable Shipping</h3>
<p>Toggle shipping on or off for your store. When disabled, shipping options won't appear during checkout.</p>
<h3>Shipping Methods</h3>
<p>Choose your preferred shipping method:</p>
<h4>Flat Rate Shipping</h4>
<ul>
<li>Set a single shipping fee that applies to all orders</li>
<li>Simple and straightforward — same price regardless of location</li>
<li>Configure the <strong>Flat Rate Amount</strong> (e.g., KSh 200)</li>
</ul>
<h4>Delivery Zones</h4>
<ul>
<li>Set different shipping rates based on the customer's location</li>
<li>Create zones for different areas (e.g., within city, outskirts, other counties)</li>
<li>Each zone has its own delivery fee and estimated delivery time</li>
<li>Orders outside defined zones can receive custom delivery quotes</li>
</ul>
<h3>Free Shipping</h3>
<p>Set a <strong>Free Shipping Threshold</strong> — orders above this amount qualify for free shipping. For example, set it to KSh 5,000 to offer free shipping on orders over that amount.</p>
<h3>Estimated Delivery Days</h3>
<p>Set the <strong>Default Estimated Delivery Days</strong> shown to customers during checkout and on order confirmations.</p>
<h3>Store Pickup</h3>
<p>Enable store pickup as an alternative to delivery:</p>
<ul>
<li><strong>Enable/Disable</strong> — Toggle store pickup option</li>
<li><strong>Pickup Location Name</strong> — Name of the pickup point</li>
<li><strong>Pickup Instructions</strong> — Directions or notes for customers</li>
<li><strong>Store Hours</strong> — Configure your operating hours for each day of the week</li>
</ul>
<p><em>[Screenshot: Store Pickup Settings]</em></p>`;

const settingsPaymentContent = `<h2>Payment Settings</h2>
<p>Configure how customers can pay for orders on your store. DukaNest supports multiple payment methods popular in Kenya and East Africa.</p>
<p><em>[Screenshot: Payment Settings]</em></p>
<h3>Available Payment Methods</h3>
<h4>Cash on Delivery</h4>
<ul>
<li>Enable or disable cash payments</li>
<li>Customers pay when they receive their order</li>
</ul>
<h4>M-Pesa</h4>
<p>M-Pesa is the most popular mobile payment method in Kenya. DukaNest supports multiple M-Pesa payment options:</p>
<ul>
<li><strong>Send Money</strong> — Customers send money to your phone number</li>
<li><strong>Buy Goods (Till Number)</strong> — Customers pay using your Safaricom till number</li>
<li><strong>Paybill</strong> — Customers pay using your paybill number and account number</li>
<li><strong>Pochi la Biashara</strong> — Customers pay to your Pochi la Biashara phone number</li>
</ul>
<p>For each M-Pesa option, provide the relevant details (phone number, till number, or paybill number) so customers know where to send their payment.</p>
<p><em>[Screenshot: M-Pesa Configuration]</em></p>
<h3>Payment Timing</h3>
<p>Configure when customers should pay:</p>
<ul>
<li><strong>Before Delivery</strong> — Payment is required before the order is processed</li>
<li><strong>After Delivery</strong> — Customers pay upon receiving their order</li>
<li><strong>User Choice</strong> — Let customers choose their preferred payment timing</li>
</ul>
<h3>Default Payment Method</h3>
<p>Set the default payment method that's pre-selected at checkout. Customers can still choose a different method if multiple are enabled.</p>`;

const settingsTaxContent = `<h2>Tax Settings</h2>
<p>Configure tax calculation for your store's products and orders.</p>
<p><em>[Screenshot: Tax Settings]</em></p>
<h3>Tax Configuration</h3>
<ul>
<li><strong>Enable/Disable Tax</strong> — Toggle tax calculation for your store</li>
<li><strong>Default Tax Rate</strong> — Set the tax percentage (e.g., 16% for Kenya's VAT)</li>
<li><strong>Tax Pricing Type</strong>:
<ul>
<li><strong>Inclusive</strong> — Product prices already include tax (tax is extracted from the price)</li>
<li><strong>Exclusive</strong> — Tax is added on top of the product price at checkout</li>
</ul>
</li>
<li><strong>Tax Calculation Basis</strong>:
<ul>
<li><strong>Billing Address</strong> — Tax calculated based on customer's billing address</li>
<li><strong>Shipping Address</strong> — Tax calculated based on delivery address</li>
<li><strong>Store Address</strong> — Tax calculated based on your store's location</li>
</ul>
</li>
</ul>
<h3>How It Works</h3>
<p>When enabled, tax is automatically calculated and displayed:</p>
<ul>
<li>On product pages (if configured to show)</li>
<li>In the shopping cart</li>
<li>At checkout as a separate line item</li>
<li>On order confirmations and invoices</li>
</ul>`;

const supportTicketsContent = `<h2>Customer Support Tickets</h2>
<p>Manage support inquiries from your customers. Navigate to <strong>Support → Support Tickets</strong>.</p>
<p><em>[Screenshot: Support Tickets List]</em></p>
<h3>Viewing Tickets</h3>
<p>The support tickets list displays all customer inquiries:</p>
<ul>
<li><strong>Ticket ID</strong> — Unique identifier</li>
<li><strong>Subject</strong> — Topic of the inquiry</li>
<li><strong>Customer</strong> — Customer name and email</li>
<li><strong>Status</strong> — Open, In Progress, Resolved, Closed</li>
<li><strong>Priority</strong> — Low, Medium, High, Urgent</li>
<li><strong>Messages</strong> — Number of messages in the conversation</li>
<li><strong>Created</strong> — When the ticket was submitted</li>
</ul>
<h3>Filtering Tickets</h3>
<ul>
<li><strong>Search</strong> — Search by subject or description</li>
<li><strong>Status</strong> — Filter by Open, In Progress, Resolved, or Closed</li>
<li><strong>Priority</strong> — Filter by priority level</li>
</ul>
<h3>Responding to Tickets</h3>
<ol>
<li>Click on a ticket to open the full conversation</li>
<li>Review the customer's message and any previous replies</li>
<li>Type your response</li>
<li>Click <strong>"Send Reply"</strong></li>
<li>Update the ticket status as needed (e.g., move from Open to In Progress or Resolved)</li>
</ol>`;

const supportPlatformContent = `<h2>Platform Support</h2>
<p>If you need help with the DukaNest platform itself, you can reach out to the platform support team. Navigate to <strong>Support → Platform Support</strong>.</p>
<p><em>[Screenshot: Platform Support Page]</em></p>
<h3>Getting Help</h3>
<p>Platform support covers:</p>
<ul>
<li><strong>Technical Issues</strong> — Problems with your store's functionality</li>
<li><strong>Billing Questions</strong> — Subscription and payment inquiries</li>
<li><strong>Feature Requests</strong> — Suggest new features or improvements</li>
<li><strong>Bug Reports</strong> — Report issues with the platform</li>
</ul>
<h3>Submitting a Support Request</h3>
<ol>
<li>Navigate to <strong>Platform Support</strong></li>
<li>Click <strong>"New Ticket"</strong></li>
<li>Provide a clear <strong>Subject</strong></li>
<li>Describe your issue in detail</li>
<li>Include any relevant screenshots or error messages</li>
<li>Submit the ticket</li>
</ol>
<p>The DukaNest support team will respond as soon as possible. You can track the status of your tickets and continue the conversation right from the Platform Support page.</p>`;

const usersManagingContent = `<h2>Managing Users & Team Members</h2>
<p>Add team members to help manage your store. Navigate to <strong>Users</strong> in the sidebar. This section is only available to store administrators.</p>
<p><em>[Screenshot: Users List Page]</em></p>
<h3>Users List</h3>
<p>The users page shows all team members with access to your store dashboard:</p>
<ul>
<li><strong>Name</strong> — Team member's name</li>
<li><strong>Email</strong> — Login email address</li>
<li><strong>Role</strong> — Admin or Staff</li>
<li><strong>Last Sign In</strong> — When they last logged in</li>
</ul>
<h3>User Roles</h3>
<p>DukaNest has two team member roles:</p>
<h4>Admin</h4>
<ul>
<li>Full access to all dashboard features</li>
<li>Can manage other users</li>
<li>Can access themes, users, and subscription settings</li>
<li>Can modify store settings</li>
</ul>
<h4>Staff</h4>
<ul>
<li>Limited access based on assigned permissions</li>
<li>Cannot manage other users</li>
<li>Cannot access admin-only sections (Themes, Users, Subscription)</li>
<li>Ideal for team members who handle specific tasks like order fulfillment</li>
</ul>
<h3>Adding a New User</h3>
<ol>
<li>Click <strong>"+ New User"</strong></li>
<li>Fill in the details:
<ul>
<li><strong>Name</strong> — Team member's full name</li>
<li><strong>Email</strong> — Their login email address</li>
<li><strong>Password</strong> — Set an initial password</li>
<li><strong>Confirm Password</strong> — Re-enter the password</li>
<li><strong>Role</strong> — Select Admin or Staff</li>
</ul>
</li>
<li>Optionally configure <strong>Custom Permissions</strong> — Override the default role permissions to grant or restrict access to specific modules and actions</li>
<li>Click <strong>"Create User"</strong></li>
</ol>
<p><em>[Screenshot: Create User Form]</em></p>
<h3>Plan Restrictions</h3>
<p>The number of users you can add depends on your subscription plan. If you've reached your plan's user limit, you'll see a prompt to upgrade your plan.</p>
<h3>Roles & Permissions</h3>
<p>Click <strong>"View Roles & Permissions"</strong> to see a detailed breakdown of what each role can access.</p>`;

const subscriptionManagingContent = `<h2>Managing Your Subscription</h2>
<p>Manage your DukaNest subscription plan, view usage, and handle billing. Navigate to <strong>Subscription</strong> in the sidebar.</p>
<p><em>[Screenshot: Subscription Page]</em></p>
<h3>Overview Tab</h3>
<p>See your current subscription details at a glance:</p>
<ul>
<li><strong>Current Plan</strong> — The name of your active subscription plan</li>
<li><strong>Monthly Price</strong> — How much you're paying per month</li>
<li><strong>Renewal Date</strong> — When your subscription next renews</li>
<li><strong>Status</strong> — Active, Trial, or Expired</li>
</ul>
<p>If you're on a trial that's ending soon, you'll see a banner prompting you to upgrade.</p>
<h3>Usage & Limits Tab</h3>
<p>Monitor how much of your plan's resources you're using:</p>
<ul>
<li><strong>Products</strong> — Number of products vs. plan limit</li>
<li><strong>Orders</strong> — Number of orders vs. plan limit</li>
<li><strong>Pages</strong> — Number of pages vs. plan limit</li>
<li><strong>Blogs</strong> — Number of blog posts vs. plan limit</li>
<li><strong>Customers</strong> — Number of customers vs. plan limit</li>
</ul>
<p>Color-coded progress bars show your usage:</p>
<ul>
<li><strong>Green</strong> — Under 50% usage (healthy)</li>
<li><strong>Yellow</strong> — 50-80% usage (approaching limit)</li>
<li><strong>Red</strong> — Over 80% usage (near or at limit)</li>
</ul>
<p><em>[Screenshot: Usage & Limits]</em></p>
<h3>Plans & Pricing Tab</h3>
<p>View all available subscription plans and compare features. From here you can:</p>
<ul>
<li>See what each plan offers (products, orders, features)</li>
<li><strong>Upgrade</strong> — Move to a higher plan for more resources</li>
<li><strong>Downgrade</strong> — Move to a lower plan if you need fewer resources</li>
</ul>
<h3>Making a Payment</h3>
<p>DukaNest supports two payment methods for subscriptions:</p>
<h4>M-Pesa (STK Push)</h4>
<ol>
<li>Select M-Pesa as your payment method</li>
<li>Enter your M-Pesa phone number</li>
<li>Click <strong>"Pay"</strong> — You'll receive an STK push notification on your phone</li>
<li>Enter your M-Pesa PIN on your phone to complete the payment</li>
<li>Wait for confirmation (the system automatically checks payment status)</li>
</ol>
<h4>Card/Mobile Money (PesaPal)</h4>
<ol>
<li>Select PesaPal as your payment method</li>
<li>You'll be redirected to the PesaPal checkout page</li>
<li>Choose your preferred payment option (Visa, Mastercard, M-Pesa, Airtel Money, etc.)</li>
<li>Complete the payment on PesaPal</li>
<li>You'll be redirected back to your dashboard with confirmation</li>
</ol>
<p>Annual payments are also available through PesaPal and may come with a discount.</p>
<h3>Billing History Tab</h3>
<p>View all your past transactions and payments:</p>
<ul>
<li><strong>Transaction Type</strong> — Subscription payment, upgrade, etc.</li>
<li><strong>Description</strong> — Details of the transaction</li>
<li><strong>Amount</strong> — Amount paid</li>
<li><strong>Status</strong> — Completed, Pending, Failed</li>
<li><strong>Date</strong> — When the transaction occurred</li>
</ul>`;


// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  await testConnection();
  
  console.log('🌱 Seeding comprehensive user guide content...');

  // Check if tables exist
  try {
    await prisma.user_guide_categories.count();
    console.log('✅ Tables exist, proceeding with seed...');
  } catch (error: any) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.error('❌ Tables do not exist. Please run the migration first.');
      process.exit(1);
    }
    throw error;
  }

  // Clear existing data
  console.log('🗑️  Clearing existing user guide data...');
  await prisma.user_guide_articles.deleteMany({});
  await prisma.user_guide_categories.deleteMany({});

  // ========================================================================
  // CATEGORY 1: Introduction
  // ========================================================================
  console.log('📝 Creating Introduction category...');
  await prisma.user_guide_categories.create({
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
          content: introductionOverviewContent,
          image: '/images/user-guide/store-overview.png',
          image_alt: 'DukaNest Store Dashboard Overview',
          sort_order: 0,
          is_active: true,
          is_popular: true,
        },
      },
    },
  });

  // ========================================================================
  // CATEGORY 2: Getting Started
  // ========================================================================
  console.log('📝 Creating Getting Started category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Getting Started',
      slug: 'getting-started',
      icon: 'RocketLaunchIcon',
      color: 'text-green-600',
      bg_color: 'bg-green-50',
      sort_order: 1,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Creating Your Store Account',
            slug: 'creating-account',
            content: gettingStartedAccountContent,
            image: '/images/user-guide/signup-page.png',
            image_alt: 'Store Registration Page',
            sort_order: 0,
            is_active: true,
            is_popular: true,
          },
          {
            title: 'Logging Into Your Dashboard',
            slug: 'logging-in',
            content: gettingStartedLoginContent,
            image: '/images/user-guide/login-page.png',
            image_alt: 'Login Page',
            sort_order: 1,
            is_active: true,
          },
          {
            title: 'Tour of Your Store Dashboard',
            slug: 'dashboard-tour',
            content: gettingStartedTourContent,
            image: '/images/user-guide/dashboard-tour.png',
            image_alt: 'Dashboard Tour',
            sort_order: 2,
            is_active: true,
            is_popular: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 3: Dashboard
  // ========================================================================
  console.log('📝 Creating Dashboard category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Dashboard',
      slug: 'dashboard',
      icon: 'HomeIcon',
      color: 'text-indigo-600',
      bg_color: 'bg-indigo-50',
      sort_order: 2,
      is_active: true,
      articles: {
        create: {
          title: 'Dashboard Overview',
          slug: 'dashboard-overview',
          content: dashboardOverviewContent,
          image: '/images/user-guide/dashboard.png',
          image_alt: 'Dashboard Overview',
          sort_order: 0,
          is_active: true,
        },
      },
    },
  });

  // ========================================================================
  // CATEGORY 4: Themes
  // ========================================================================
  console.log('📝 Creating Themes category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Themes',
      slug: 'themes',
      icon: 'PaintBrushIcon',
      color: 'text-purple-600',
      bg_color: 'bg-purple-50',
      sort_order: 3,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Managing Your Store Themes',
            slug: 'managing-themes',
            content: themesManagingContent,
            image: '/images/user-guide/themes-list.png',
            image_alt: 'Themes List Page',
            sort_order: 0,
            is_active: true,
          },
          {
            title: 'Customizing Your Store Theme',
            slug: 'customizing-theme',
            content: themesCustomizingContent,
            image: '/images/user-guide/theme-customizer.png',
            image_alt: 'Theme Customizer',
            sort_order: 1,
            is_active: true,
            is_popular: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 5: Orders
  // ========================================================================
  console.log('📝 Creating Orders category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Orders',
      slug: 'orders',
      icon: 'ShoppingCartIcon',
      color: 'text-orange-600',
      bg_color: 'bg-orange-50',
      sort_order: 4,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Managing Orders',
            slug: 'managing-orders',
            content: ordersManagingContent,
            image: '/images/user-guide/orders-list.png',
            image_alt: 'Orders List Page',
            sort_order: 0,
            is_active: true,
          },
          {
            title: 'Order Details & Fulfillment',
            slug: 'order-details',
            content: ordersDetailContent,
            image: '/images/user-guide/order-detail.png',
            image_alt: 'Order Detail Page',
            sort_order: 1,
            is_active: true,
            is_popular: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 6: Products
  // ========================================================================
  console.log('📝 Creating Products category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Products',
      slug: 'products',
      icon: 'CubeIcon',
      color: 'text-teal-600',
      bg_color: 'bg-teal-50',
      sort_order: 5,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Managing Products',
            slug: 'managing-products',
            content: productsManagingContent,
            image: '/images/user-guide/products-list.png',
            image_alt: 'Products List Page',
            sort_order: 0,
            is_active: true,
            is_popular: true,
          },
          {
            title: 'Product Variants',
            slug: 'product-variants',
            content: productsVariantsContent,
            image: '/images/user-guide/product-variants.png',
            image_alt: 'Product Variants',
            sort_order: 1,
            is_active: true,
          },
          {
            title: 'Product Categories',
            slug: 'product-categories',
            content: productsCategoriesContent,
            image: '/images/user-guide/categories.png',
            image_alt: 'Product Categories',
            sort_order: 2,
            is_active: true,
          },
          {
            title: 'Product Attributes',
            slug: 'product-attributes',
            content: productsAttributesContent,
            image: '/images/user-guide/attributes.png',
            image_alt: 'Product Attributes',
            sort_order: 3,
            is_active: true,
          },
          {
            title: 'Inventory Management',
            slug: 'inventory-management',
            content: productsInventoryContent,
            image: '/images/user-guide/inventory.png',
            image_alt: 'Inventory Management',
            sort_order: 4,
            is_active: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 7: Customers
  // ========================================================================
  console.log('📝 Creating Customers category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Customers',
      slug: 'customers',
      icon: 'UserGroupIcon',
      color: 'text-cyan-600',
      bg_color: 'bg-cyan-50',
      sort_order: 6,
      is_active: true,
      articles: {
        create: {
          title: 'Managing Customers',
          slug: 'managing-customers',
          content: customersManagingContent,
          image: '/images/user-guide/customers-list.png',
          image_alt: 'Customers List Page',
          sort_order: 0,
          is_active: true,
        },
      },
    },
  });

  // ========================================================================
  // CATEGORY 8: Marketing
  // ========================================================================
  console.log('📝 Creating Marketing category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Marketing',
      slug: 'marketing',
      icon: 'FireIcon',
      color: 'text-red-600',
      bg_color: 'bg-red-50',
      sort_order: 7,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Sales & Promotions',
            slug: 'sales-promotions',
            content: marketingSalesContent,
            image: '/images/user-guide/sales-list.png',
            image_alt: 'Sales List Page',
            sort_order: 0,
            is_active: true,
            is_popular: true,
          },
          {
            title: 'Analytics',
            slug: 'analytics',
            content: marketingAnalyticsContent,
            image: '/images/user-guide/analytics.png',
            image_alt: 'Analytics Dashboard',
            sort_order: 1,
            is_active: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 9: Content
  // ========================================================================
  console.log('📝 Creating Content category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Content',
      slug: 'content',
      icon: 'DocumentTextIcon',
      color: 'text-amber-600',
      bg_color: 'bg-amber-50',
      sort_order: 8,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Managing Pages',
            slug: 'managing-pages',
            content: contentPagesContent,
            image: '/images/user-guide/pages-list.png',
            image_alt: 'Pages List',
            sort_order: 0,
            is_active: true,
          },
          {
            title: 'Managing Blogs',
            slug: 'managing-blogs',
            content: contentBlogsContent,
            image: '/images/user-guide/blogs-list.png',
            image_alt: 'Blog Posts List',
            sort_order: 1,
            is_active: true,
          },
          {
            title: 'Media Library',
            slug: 'media-library',
            content: contentMediaContent,
            image: '/images/user-guide/media-library.png',
            image_alt: 'Media Library',
            sort_order: 2,
            is_active: true,
          },
          {
            title: 'Managing Forms',
            slug: 'managing-forms',
            content: contentFormsContent,
            image: '/images/user-guide/forms.png',
            image_alt: 'Forms Page',
            sort_order: 3,
            is_active: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 10: Settings
  // ========================================================================
  console.log('📝 Creating Settings category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Settings',
      slug: 'settings',
      icon: 'Cog6ToothIcon',
      color: 'text-gray-600',
      bg_color: 'bg-gray-50',
      sort_order: 9,
      is_active: true,
      articles: {
        create: [
          {
            title: 'General Settings',
            slug: 'general-settings',
            content: settingsGeneralContent,
            image: '/images/user-guide/settings-general.png',
            image_alt: 'General Settings',
            sort_order: 0,
            is_active: true,
          },
          {
            title: 'Currency Settings',
            slug: 'currency-settings',
            content: settingsCurrencyContent,
            image: '/images/user-guide/settings-currency.png',
            image_alt: 'Currency Settings',
            sort_order: 1,
            is_active: true,
          },
          {
            title: 'Shipping Settings',
            slug: 'shipping-settings',
            content: settingsShippingContent,
            image: '/images/user-guide/settings-shipping.png',
            image_alt: 'Shipping Settings',
            sort_order: 2,
            is_active: true,
            is_popular: true,
          },
          {
            title: 'Payment Settings',
            slug: 'payment-settings',
            content: settingsPaymentContent,
            image: '/images/user-guide/settings-payment.png',
            image_alt: 'Payment Settings',
            sort_order: 3,
            is_active: true,
            is_popular: true,
          },
          {
            title: 'Tax Settings',
            slug: 'tax-settings',
            content: settingsTaxContent,
            image: '/images/user-guide/settings-tax.png',
            image_alt: 'Tax Settings',
            sort_order: 4,
            is_active: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 11: Support
  // ========================================================================
  console.log('📝 Creating Support category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Support',
      slug: 'support',
      icon: 'ChatBubbleLeftRightIcon',
      color: 'text-sky-600',
      bg_color: 'bg-sky-50',
      sort_order: 10,
      is_active: true,
      articles: {
        create: [
          {
            title: 'Customer Support Tickets',
            slug: 'support-tickets',
            content: supportTicketsContent,
            image: '/images/user-guide/support-tickets.png',
            image_alt: 'Support Tickets List',
            sort_order: 0,
            is_active: true,
          },
          {
            title: 'Platform Support',
            slug: 'platform-support',
            content: supportPlatformContent,
            image: '/images/user-guide/platform-support.png',
            image_alt: 'Platform Support',
            sort_order: 1,
            is_active: true,
          },
        ],
      },
    },
  });

  // ========================================================================
  // CATEGORY 12: Users
  // ========================================================================
  console.log('📝 Creating Users category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Users',
      slug: 'users',
      icon: 'UsersIcon',
      color: 'text-violet-600',
      bg_color: 'bg-violet-50',
      sort_order: 11,
      is_active: true,
      articles: {
        create: {
          title: 'Managing Users & Team Members',
          slug: 'managing-users',
          content: usersManagingContent,
          image: '/images/user-guide/users-list.png',
          image_alt: 'Users List Page',
          sort_order: 0,
          is_active: true,
        },
      },
    },
  });

  // ========================================================================
  // CATEGORY 13: Subscription
  // ========================================================================
  console.log('📝 Creating Subscription category...');
  await prisma.user_guide_categories.create({
    data: {
      name: 'Subscription',
      slug: 'subscription',
      icon: 'CreditCardIcon',
      color: 'text-emerald-600',
      bg_color: 'bg-emerald-50',
      sort_order: 12,
      is_active: true,
      articles: {
        create: {
          title: 'Managing Your Subscription',
          slug: 'managing-subscription',
          content: subscriptionManagingContent,
          image: '/images/user-guide/subscription.png',
          image_alt: 'Subscription Management',
          sort_order: 0,
          is_active: true,
        },
      },
    },
  });

  // Print summary
  const categoryCount = await prisma.user_guide_categories.count();
  const articleCount = await prisma.user_guide_articles.count();
  
  console.log('\n✅ User guide content seeded successfully!');
  console.log(`   📂 Created ${categoryCount} categories`);
  console.log(`   📄 Created ${articleCount} articles`);
  console.log('\n📋 Categories & Articles:');
  
  const allCategories = await prisma.user_guide_categories.findMany({
    include: { articles: { orderBy: { sort_order: 'asc' } } },
    orderBy: { sort_order: 'asc' },
  });
  
  for (const cat of allCategories) {
    console.log(`   📂 ${cat.name} (${cat.articles.length} articles)`);
    for (const art of cat.articles) {
      console.log(`      📄 ${art.title}${art.is_popular ? ' ⭐' : ''}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding user guide:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
