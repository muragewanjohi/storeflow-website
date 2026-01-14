# Flash Sale Implementation Plan

## Overview
This document outlines the recommended approach for implementing flash sales/campaigns in StoreFlow, following best practices from popular e-commerce platforms like Amazon, Shopify, and WooCommerce.

## How Popular E-Commerce Stores Implement Sales

### 1. **Amazon**
- **Lightning Deals**: Time-limited sales with countdown timers
- **Deal of the Day**: Single featured product with special pricing
- **Prime Day**: Annual event with thousands of products on sale
- **Features**:
  - Countdown timers create urgency
  - Products grouped by sale campaigns
  - Dedicated sale pages with filtering
  - Sale badges on product cards

### 2. **Shopify Stores**
- **Sale Collections**: Products grouped into sale collections
- **Discount Codes**: Store-wide or product-specific codes
- **Sale Badges**: Visual indicators on products
- **Features**:
  - Multiple sale campaigns can run simultaneously
  - Products can belong to multiple sales
  - Sale pages with product filtering
  - Automatic price display (original vs. sale price)

### 3. **WooCommerce**
- **Sale Campaigns**: Named campaigns (Black Friday, Summer Sale, etc.)
- **Product-Level Sales**: Individual product sale prices
- **Scheduled Sales**: Start/end dates for automatic activation
- **Features**:
  - Sale categories/tags
  - Countdown timers
  - Sale badges
  - Dedicated sale archive pages

## Recommended Implementation Approach

### Database Schema

#### 1. Sales/Campaigns Table
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- e.g., "Black Friday 2024", "Easter Sale"
  slug VARCHAR(255) NOT NULL, -- e.g., "black-friday-2024"
  description TEXT,
  banner_image VARCHAR(255),
  badge_text VARCHAR(50) DEFAULT 'SALE', -- e.g., "20% OFF", "FLASH SALE"
  badge_color VARCHAR(7) DEFAULT '#EF4444', -- Red by default
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, scheduled, ended
  is_featured BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_sales_tenant_id ON sales(tenant_id);
CREATE INDEX idx_sales_status ON sales(tenant_id, status);
CREATE INDEX idx_sales_dates ON sales(start_date, end_date);
```

#### 2. Product Sales Junction Table
```sql
CREATE TABLE product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_price DECIMAL(10, 2), -- Override product's sale_price if needed
  discount_percent DECIMAL(5, 2), -- Calculated discount percentage
  order_index INT DEFAULT 0, -- For manual sorting in sale page
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, product_id, sale_id)
);

CREATE INDEX idx_product_sales_tenant ON product_sales(tenant_id);
CREATE INDEX idx_product_sales_product ON product_sales(product_id);
CREATE INDEX idx_product_sales_sale ON product_sales(sale_id);
CREATE INDEX idx_product_sales_active ON product_sales(tenant_id, sale_id, order_index);
```

### Key Features

#### 1. **Sale Management**
- Create named sales (Black Friday, Easter, Back to School, etc.)
- Set start/end dates for automatic activation
- Add banner images and custom badge text
- Mark sales as featured for homepage display

#### 2. **Product Assignment**
- Assign products to sales from product edit page
- Bulk assign products to sales
- Set sale-specific prices (override product sale_price)
- Manual ordering of products in sale page

#### 3. **Sale Pages**
- Dedicated route: `/sales/[slug]` (e.g., `/sales/black-friday-2024`)
- Display all products in the sale
- Filtering and sorting options
- Countdown timer if sale has end date
- Sale banner and description

#### 4. **Sales Tab Section** (Renamed from Flash Sale)
- **Display Modes**:
  - **Single Sale Mode**: Display products from one specific sale
  - **Featured Sales Mode**: Display multiple featured sales as tabs
  - **All Active Sales Mode**: Show all currently active sales
- Link to dedicated sale pages
- Show countdown timers for time-limited sales
- Customizable layout and styling options

## Implementation Steps

### Phase 1: Database & Models
1. Create Prisma schema for `sales` and `product_sales` tables
2. Run migration
3. Create TypeScript types/interfaces

### Phase 2: Backend API
1. **Sales Management API** (`/api/dashboard/sales`)
   - GET: List all sales
   - POST: Create new sale
   - PUT: Update sale
   - DELETE: Delete sale
   - GET /:id: Get single sale with products

2. **Product Sales API** (`/api/dashboard/sales/:id/products`)
   - GET: List products in sale
   - POST: Add product to sale
   - DELETE: Remove product from sale
   - PUT: Update product sale price/order

3. **Public Sales API** (`/api/sales`)
   - GET: List active sales
   - GET /:slug: Get sale by slug with products

### Phase 3: Dashboard UI
1. **Sales List Page** (`/dashboard/sales`)
   - List all sales with status badges
   - Create new sale button
   - Filter by status (draft, active, ended)
   - Quick actions (edit, duplicate, delete)

2. **Sale Editor** (`/dashboard/sales/[id]`)
   - Basic info (name, slug, description)
   - Dates (start/end)
   - Banner image upload
   - Badge customization
   - Product assignment interface
   - Preview sale page

3. **Product Integration**
   - Add "Sales" section to product edit page
   - Quick assign to sales
   - Show sale badges in product list

### Phase 4: Storefront
1. **Sale Page** (`/sales/[slug]`)
   - Display sale banner
   - Countdown timer (if end_date set)
   - Product grid with sale badges
   - Filtering and sorting
   - Pagination

2. **Sales Tab Section Update** (Renamed from Flash Sale)
   - Rename `flash_sale` to `sales_tab` in page builder
   - Update section type and interface
   - Add display mode selection (single sale, featured sales, all active)
   - Add customization options (see Sales Tab Customizations below)
   - Update section editor UI
   - Update section component to handle different display modes
   - Show countdown timers when applicable

3. **Product Cards**
   - Show sale badge if product is in active sale
   - Display sale price prominently
   - Show discount percentage

### Phase 5: Automation
1. **Scheduled Sales**
   - Background job to activate sales at start_date
   - Deactivate sales at end_date
   - Update sale status automatically

2. **Sale Badges**
   - Auto-calculate discount percentage
   - Show "X% OFF" badge on product cards
   - Highlight sale products in listings

## Best Practices

### 1. **Sale Organization**
- Use descriptive names: "Black Friday 2024" not "Sale 1"
- Create slugs that are SEO-friendly
- Group related sales (e.g., "Holiday Sales 2024")

### 2. **Product Management**
- Allow products to be in multiple sales simultaneously
- Use sale-specific pricing when needed
- Maintain product's base `sale_price` for general sales
- Use `product_sales.sale_price` for campaign-specific pricing

### 3. **User Experience**
- Show countdown timers to create urgency
- Display discount percentages clearly
- Make sale pages easily discoverable
- Link from homepage flash sale section

### 4. **Performance**
- Cache active sales
- Index database properly for fast queries
- Lazy load sale products
- Use pagination for large sales

### 5. **SEO**
- Create dedicated sale pages with unique URLs
- Add meta descriptions for sale pages
- Use structured data for sale events
- Generate sitemap entries for sale pages

## Example Use Cases

### Use Case 1: Black Friday Sale
1. Create sale: "Black Friday 2024"
2. Set dates: Nov 24-30, 2024
3. Add 50 products with special pricing
4. Create Sales Tab section on homepage
5. Select "Single Sale" mode and choose "Black Friday 2024"
6. Configure: Show countdown, custom badge "50% OFF"
7. Link to `/sales/black-friday-2024`

### Use Case 2: Seasonal Sale
1. Create sale: "Summer Collection Sale"
2. Set dates: June 1 - August 31
3. Assign all summer category products
4. Set 20% discount badge
5. Feature on homepage

### Use Case 3: Flash Sale
1. Create sale: "Weekend Flash Sale"
2. Set dates: Friday 6 PM - Sunday 11:59 PM
3. Add 10 featured products
4. Create Sales Tab section
5. Select "Single Sale" mode
6. Enable countdown timer
7. Display in Sales Tab section

### Use Case 4: Multiple Featured Sales
1. Create multiple sales: "Black Friday", "Cyber Monday", "Holiday Sale"
2. Mark all as featured
3. Create Sales Tab section
4. Select "Featured Sales" mode
5. Choose the 3 sales to display
6. Configure tabs layout
7. Each tab shows products from respective sale
8. Users can switch between sales

## Sales Tab Section - Detailed Implementation

### Section Renaming
- **Old Name**: "Flash Sale" (`flash_sale`)
- **New Name**: "Sales Tab" (`sales_tab`)
- **Migration**: Update all references in codebase
  - Page builder types
  - Section templates
  - Section editor
  - Default section creation

### Sales Tab Customizations

#### 1. **Display Mode** (Required)
```typescript
display_mode: 'single_sale' | 'featured_sales' | 'all_active'
```

- **Single Sale Mode**:
  - Display products from one specific sale
  - Requires `sale_id` to be selected
  - Shows sale banner and description
  - Link to full sale page
  
- **Featured Sales Mode**:
  - Display multiple featured sales as tabs
  - Shows tabs for each featured sale
  - User can switch between sales
  - Each tab shows products from that sale
  - Limit number of featured sales (default: 3-5)
  
- **All Active Sales Mode**:
  - Automatically shows all currently active sales
  - Grouped by sale or mixed product grid
  - Filter by sale option
  - Shows sale badges on products

#### 2. **Layout Options**
```typescript
layout: 'grid' | 'carousel' | 'tabs'
columns: 2 | 3 | 4  // For grid layout
show_tabs: boolean  // For featured sales mode
```

- **Grid Layout**: Standard product grid
- **Carousel Layout**: Horizontal scrolling carousel
- **Tabs Layout**: Tabbed interface for multiple sales

#### 3. **Content Customization**
```typescript
title?: string  // Section title (e.g., "Super Flash Sale")
subtitle?: string  // Optional subtitle
show_countdown: boolean  // Show countdown timer
show_badge: boolean  // Show sale badge on products
badge_text?: string  // Custom badge text (overrides sale badge_text)
badge_color?: string  // Custom badge color
limit?: number  // Number of products to show per sale
```

#### 4. **Styling Options**
```typescript
background_color?: string  // Section background color
text_color?: string  // Section text color
banner_style: 'full_width' | 'contained' | 'none'  // Sale banner display
product_card_style: 'default' | 'compact' | 'detailed'  // Product card variant
```

#### 5. **Call-to-Action**
```typescript
cta_text?: string  // e.g., "Shop More", "View All Sales"
cta_link?: string  // Link destination
cta_position: 'top_right' | 'bottom_center' | 'none'  // CTA button position
```

### Updated Section Interface

```typescript
export interface SalesTabSection extends BaseSection {
  type: 'sales_tab';  // Renamed from 'flash_sale'
  
  // Display Mode
  display_mode: 'single_sale' | 'featured_sales' | 'all_active';
  
  // Single Sale Mode
  sale_id?: string;  // Required if display_mode is 'single_sale'
  
  // Featured Sales Mode
  featured_sale_ids?: string[];  // Array of sale IDs for featured mode
  max_featured_sales?: number;  // Limit for featured sales (default: 5)
  
  // Layout
  layout: 'grid' | 'carousel' | 'tabs';
  columns: 2 | 3 | 4;
  
  // Content
  title?: string;
  subtitle?: string;
  limit?: number;  // Products per sale
  
  // Features
  show_countdown: boolean;
  show_badge: boolean;
  badge_text?: string;  // Override sale badge_text
  badge_color?: string;  // Override sale badge_color
  
  // Styling
  background_color?: string;
  text_color?: string;
  banner_style: 'full_width' | 'contained' | 'none';
  product_card_style: 'default' | 'compact' | 'detailed';
  
  // CTA
  cta_text?: string;
  cta_link?: string;
  cta_position: 'top_right' | 'bottom_center' | 'none';
}
```

### Linking Sales to Sales Tab

#### Option 1: Single Sale Link
- Store owner selects a specific sale from dropdown
- Sales Tab displays products from that sale only
- **CTA Link Behavior**:
  - If `cta_link` is set: Uses custom link
  - If `cta_link` is empty: Auto-generates `/sales/[sale-slug]`
  - Product cards link to individual product pages
  - Sale banner (if shown) links to `/sales/[sale-slug]`

#### Option 2: Featured Sales Link
- Store owner selects multiple featured sales
- Sales Tab displays tabs for each sale
- **Link Behavior**:
  - Each tab header links to `/sales/[sale-slug]` when clicked
  - Active tab shows products from that sale
  - "View All Sales" CTA links to `/sales` (all sales page)
  - Product cards link to individual product pages

#### Option 3: All Active Sales Link
- Automatically includes all active sales
- **Link Behavior**:
  - "View All Sales" CTA links to `/sales`
  - Individual sale badges on products link to `/sales/[sale-slug]`
  - Product cards link to individual product pages
  - Filter dropdown allows filtering by sale

### Default Sales Tab Configuration

When a new Sales Tab section is created, default values:

```typescript
{
  type: 'sales_tab',
  display_mode: 'single_sale',
  layout: 'grid',
  columns: 4,
  title: 'Super Flash Sale',
  limit: 8,
  show_countdown: true,
  show_badge: true,
  banner_style: 'contained',
  product_card_style: 'default',
  cta_text: 'Shop More',
  cta_position: 'top_right',
  // sale_id: null (must be selected)
}
```

### Sales Tab Editor - Field Descriptions

1. **Display Mode** (Required)
   - **Single Sale**: Show products from one sale
   - **Featured Sales**: Show multiple sales as tabs
   - **All Active**: Show all currently active sales

2. **Sale Selection** (Required for Single Sale mode)
   - Dropdown populated with all sales (draft, active, scheduled)
   - Shows: Sale name, dates, status badge
   - Preview button to see sale details

3. **Featured Sales** (Required for Featured Sales mode)
   - Multi-select with search
   - Shows only active or scheduled sales
   - Drag handles to reorder
   - Max limit indicator (e.g., "3 of 5 selected")

4. **Layout**
   - **Grid**: Standard product grid
   - **Carousel**: Horizontal scrolling (mobile-friendly)
   - **Tabs**: Tabbed interface (only for Featured Sales mode)

5. **Columns** (Grid layout only)
   - 2, 3, or 4 columns
   - Responsive: 1 col mobile, 2 cols tablet, selected cols desktop

6. **Title & Subtitle**
   - Section heading
   - Optional subtitle for additional context

7. **Product Limit**
   - Number of products to show per sale
   - Default: 8, Range: 1-20

8. **Countdown Timer**
   - Toggle to show/hide countdown
   - Only shows if sale has `end_date` set
   - Format: "Sale ends in: Xd Xh Xm Xs"

9. **Sale Badge**
   - Toggle to show/hide sale badges on products
   - Custom badge text (overrides sale's badge_text)
   - Custom badge color (overrides sale's badge_color)

10. **Styling**
    - Background color picker
    - Text color picker
    - Banner style: Full width, Contained, or None
    - Product card style: Default, Compact, or Detailed

11. **Call-to-Action**
    - CTA text input
    - CTA link input (auto-filled based on display mode)
    - CTA position: Top right, Bottom center, or None

### Sales Tab Editor UI

The section editor will include:

1. **Display Mode Selector**
   - Radio buttons: Single Sale / Featured Sales / All Active
   - Conditional fields based on selection

2. **Sale Selection** (for Single Sale mode)
   - Dropdown to select sale
   - Shows sale name, dates, status
   - Preview sale details

3. **Featured Sales Selection** (for Featured Sales mode)
   - Multi-select dropdown or checkboxes
   - Drag to reorder
   - Shows sale preview cards
   - Limit indicator

4. **Layout Options**
   - Layout type selector
   - Column selector (for grid)
   - Preview toggle

5. **Content Settings**
   - Title input
   - Subtitle input
   - Product limit slider
   - Feature toggles (countdown, badges)

6. **Styling Options**
   - Color pickers
   - Banner style selector
   - Product card style selector

7. **CTA Settings**
   - CTA text input
   - CTA link input
   - CTA position selector

### Sales Tab UI/UX Flow

#### Visual Layout Examples

**Single Sale Mode - Grid Layout:**
```
┌─────────────────────────────────────────────────┐
│  Super Flash Sale              [Shop More] →    │
├─────────────────────────────────────────────────┤
│  [Sale Banner Image]                            │
│  ⏰ Sale ends in: 2d 5h 23m 15s                 │
├─────────────────────────────────────────────────┤
│  [Product] [Product] [Product] [Product]        │
│  [Product] [Product] [Product] [Product]       │
└─────────────────────────────────────────────────┘
```

**Featured Sales Mode - Tabs Layout:**
```
┌─────────────────────────────────────────────────┐
│  Featured Sales                                 │
├─────────────────────────────────────────────────┤
│  [Black Friday] [Cyber Monday] [Holiday Sale]  │
├─────────────────────────────────────────────────┤
│  [Sale Banner for Active Tab]                   │
│  ⏰ Sale ends in: 2d 5h 23m 15s                 │
├─────────────────────────────────────────────────┤
│  [Product] [Product] [Product] [Product]        │
│  [Product] [Product] [Product] [Product]       │
└─────────────────────────────────────────────────┘
```

**All Active Sales Mode - Mixed Grid:**
```
┌─────────────────────────────────────────────────┐
│  All Active Sales          [View All Sales] →   │
├─────────────────────────────────────────────────┤
│  Filter: [All] [Black Friday] [Easter] [Summer] │
├─────────────────────────────────────────────────┤
│  [Product] [Product] [Product] [Product]        │
│  [Product] [Product] [Product] [Product]       │
│  (Each product shows its sale badge)            │
└─────────────────────────────────────────────────┘
```

### Sales Tab Component Behavior

#### Single Sale Mode
```typescript
// Fetch products from selected sale
GET /api/sales/{sale_id}/products?limit={limit}

// Display:
// - Sale banner (if banner_style !== 'none')
// - Countdown timer (if show_countdown && sale has end_date)
// - Product grid/carousel
// - CTA button linking to /sales/{sale_slug}
```

#### Featured Sales Mode
```typescript
// Fetch multiple sales
GET /api/sales?ids={featured_sale_ids}&status=active

// For each sale, fetch products:
GET /api/sales/{sale_id}/products?limit={limit}

// Display:
// - Tabs for each featured sale
// - Products in selected tab
// - Countdown timers per sale
// - CTA linking to /sales/{active_sale_slug}
```

#### All Active Sales Mode
```typescript
// Fetch all active sales
GET /api/sales?status=active

// Fetch products from all active sales
GET /api/sales/products?status=active&limit={limit}

// Display:
// - All active sales grouped or mixed
// - Sale badges on products
// - Filter by sale option
// - CTA linking to /sales
```

## Migration Path

1. **Backward Compatibility**
   - Keep existing `sale_price` field on products
   - If product has `sale_price` but no sale assignment, show as general sale
   - Gradually migrate to sale-based system
   - **Section Migration**: Convert existing `flash_sale` sections to `sales_tab` with `display_mode: 'single_sale'`

2. **Data Migration**
   - Create default "General Sale" for existing sale_price products
   - Migrate existing sale data if any
   - **Section Data Migration**: 
     - Update `type: 'flash_sale'` to `type: 'sales_tab'`
     - Set `display_mode: 'single_sale'`
     - Map `category_id` to appropriate sale if needed
     - Preserve existing `title`, `badge_text`, `limit`, `columns`

## Implementation Checklist

### Phase 1: Database & Core ✅ COMPLETE
- [x] Create Prisma schema for `sales` and `product_sales` tables
- [x] Run database migration
- [x] Create TypeScript types/interfaces
- [x] Update page builder types: rename `flash_sale` to `sales_tab`

### Phase 2: Backend APIs ✅ COMPLETE
- [x] Sales Management API (`/api/dashboard/sales`) - GET, POST
- [x] Single Sale API (`/api/dashboard/sales/[id]`) - GET, PUT, DELETE
- [x] Product Sales API (`/api/dashboard/sales/:id/products`) - GET, POST, PUT, DELETE
- [x] Public Sales API (`/api/sales`) - GET
- [x] Public Sale by Slug (`/api/sales/[slug]`) - GET
- [x] Sales Tab API (fetch products by sale_id or featured sales) - Integrated in section component

### Phase 3: Dashboard UI ✅ COMPLETE
- [x] Sales List Page (`/dashboard/sales`)
- [x] Sale Editor (`/dashboard/sales/[id]`)
- [x] Product Integration (assign products to sales) - ProductSalesSection component
- [x] Update page builder section editor for Sales Tab
- [x] Add sale selection dropdown
- [x] Add display mode selector (single_sale, featured_sales, all_active)
- [x] Add customization options UI (layout, columns, title, countdown, badges, styling, CTA)

### Phase 4: Storefront ✅ COMPLETE
- [x] Sale Page (`/sales/[slug]`)
- [x] All Sales Page (`/sales`)
- [x] Update Sales Tab section component
  - [x] Single Sale Mode implementation
  - [x] Featured Sales Mode with tabs
  - [x] All Active Sales Mode
- [x] Countdown timer component
- [x] Product card sale badges with custom badges (saleBadge, saleBadgeColor) and discount percentages
- [x] Update section templates

### Phase 5: Automation & Migration ✅ COMPLETE
- [x] Automation API route (`/api/admin/sales/automate`)
- [x] Auto-activate sales at start_date
- [x] Auto-deactivate sales at end_date
- [x] Auto-calculate discount percentages
- [x] Migration API route (`/api/admin/migrate-flash-sale-sections`) to migrate existing `flash_sale` sections to `sales_tab`
- [x] Dashboard navigation menu item added for Sales
- [ ] **TODO**: Comprehensive testing of all display modes
- [ ] **TODO**: Performance testing
- [ ] **TODO**: Documentation

## Next Steps

1. Review and approve this plan
2. Create database migration
3. Implement backend APIs
4. Build dashboard UI
5. Update storefront components (rename Flash Sale to Sales Tab)
6. Implement Sales Tab customizations
7. Test with sample data
8. Deploy and document
