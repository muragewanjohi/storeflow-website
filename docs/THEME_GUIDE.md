# StoreFlow Theme Guide

**Complete guide to themes, installation, customization, and best practices**

---

## Table of Contents

1. [Overview](#overview)
2. [Installing Themes](#installing-themes)
3. [What's Included](#whats-included)
4. [Switching Themes](#switching-themes)
5. [Customizing Themes](#customizing-themes)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Technical Reference](#technical-reference)

---

## Overview

### What is a Theme?

A theme in StoreFlow is a complete design package that includes:
- **Visual Design**: Colors, fonts, layouts, and styling
- **Page Templates**: Homepage, About, Contact, Shop pages
- **Component Library**: Theme-specific headers, footers, product displays
- **Default Settings**: Pre-configured colors and typography

### Available Themes

StoreFlow includes multiple themes optimized for different industries:
- **Grocery** - Fresh produce, food stores, farmers markets
- **HexFashion** - Fashion and clothing stores
- **Furnito** - Furniture and home decor
- **Medicom** - Medical and healthcare
- **BookPoint** - Books and literature
- **Electro** - Electronics and technology
- **Modern** - Clean, modern design for any store
- **Minimal** - Minimalist design
- **Default** - Professional default theme

### Industry Standards

StoreFlow themes follow best practices from leading e-commerce platforms:

**Shopify** 🏆
- Creates homepage template with pre-built sections
- Includes demo content (optional)
- Allows customization via theme editor
- Creates theme-specific pages automatically

**WooCommerce**
- Creates homepage template with widgets/sections
- Sets up page builder
- Includes demo content (optional import)
- Creates sample pages

**BigCommerce**
- Creates homepage template with sections
- Includes demo content (optional)
- Allows customization via theme editor

---

## Installing Themes

### Installation Process

#### Step 1: Browse Themes

1. Go to **Dashboard → Themes**
2. View all available themes in a grid layout
3. Each theme shows:
   - Preview image
   - Theme name and description
   - Author and version
   - Price (Free or Premium)

#### Step 2: Preview Theme

1. Click **"Preview"** button on any theme card
2. View full storefront preview with demo content
3. Navigate through different pages (Home, Products, About, Contact)
4. See how products and categories are displayed

#### Step 3: Install Theme

**From Themes List:**
1. Click **"Install"** button on the theme card
2. Dialog appears with option: **"Install with demo content"**
3. Choose whether to include demo products and categories
4. Click **"Install Theme"**

**From Preview Page:**
1. Click **"Install Theme"** button at the top
2. Dialog appears with demo content option
3. Confirm installation
4. Auto-navigates back to themes list after installation

### Installation Options

#### Option 1: Install WITH Demo Content ✅

**What You Get:**
- ✅ Homepage with theme-specific layout
- ✅ About, Contact, Shop pages
- ✅ Theme colors and fonts
- ✅ **6 Categories** (industry-specific)
- ✅ **12-15 Products** (with images, descriptions, prices)

**Best For:**
- New e-commerce stores
- Testing and learning
- Seeing how products look
- Getting inspiration

#### Option 2: Install WITHOUT Demo Content ✅

**What You Get:**
- ✅ Homepage with theme-specific layout
- ✅ About, Contact, Shop pages
- ✅ Theme colors and fonts
- ❌ No products (empty catalog)
- ❌ No categories (empty category list)

**Best For:**
- Existing stores with products
- Clean slate approach
- Migrating from another platform
- Specific product catalog in mind

### What Happens During Installation

1. **Theme Activation**
   - Previous theme is deactivated
   - New theme is set as active
   - Theme customizations are initialized

2. **Homepage Creation**
   - Theme-specific homepage layout is loaded
   - Page builder sections are created
   - Homepage is published automatically

3. **Additional Pages**
   - About Us page created
   - Contact page created
   - Shop page created
   - All pages are published

4. **Theme Defaults**
   - Theme-specific colors applied
   - Theme-specific fonts applied
   - Customizations saved to database

5. **Demo Content** (if selected)
   - Categories created first
   - Products created and assigned to categories
   - All content is active and ready to use

### Installation Response

After installation, you'll receive a success message showing:
- ✅ Homepage created
- ✅ X additional pages created
- ✅ X categories created (if demo content)
- ✅ X products created (if demo content)

**Action Button**: "Edit Homepage" - Takes you directly to edit the homepage

---

## What's Included

### Always Included (With or Without Demo Content)

#### 1. Homepage Template 🏠

**Status**: Always created  
**Slug**: `home`  
**Status**: `published`

**Content**:
- Theme-specific layout and sections
- Hero section (customizable title, subtitle, CTA)
- Featured sections (categories, products, features)
- Theme-specific styling
- Fully editable via page builder

**Example - Grocery Theme**:
- Hero: "Fresh Groceries Delivered"
- Categories section: Fresh Produce, Dairy, Meat, etc.
- Featured Products slider
- Weekly Specials deal area
- Newsletter signup

#### 2. Additional Pages 📄

**Status**: Always created (3 pages)  
**Status**: All `published`

1. **About Us** (`/about`)
   - Hero section with company name
   - Mission and values content
   - Features section
   - Fully customizable

2. **Contact** (`/contact`)
   - Contact information section
   - Business hours
   - Ways to reach you
   - Fully customizable

3. **Shop** (`/shop`)
   - Product browsing page
   - Featured products section
   - Shop information
   - Fully customizable

#### 3. Theme Defaults 🎨

**Colors**:
- Primary color (main brand color)
- Secondary color
- Accent color
- Background colors
- Text colors

**Typography**:
- Heading font family
- Body font family
- Font sizes
- Line heights

**Applied To**: `tenant_themes` customizations table

### Only Included With Demo Content

#### 1. Categories 📂

**Grocery Theme Example**:
- Fresh Produce
- Dairy & Eggs
- Meat & Seafood
- Bakery
- Beverages
- Snacks

**Status**: `active`  
**Count**: 6 categories (varies by theme)

#### 2. Products 🛍️

**Grocery Theme Example**:
- Organic Bananas ($2.99)
- Fresh Strawberries ($4.99, on sale $3.99)
- Whole Milk ($3.49)
- Fresh Bread ($2.99)
- And more...

**Status**: `active`  
**Count**: 12-15 products (varies by theme)  
**Features**: Images, descriptions, prices, SKUs, stock quantities

### Summary Table

| Content Type | Without Demo | With Demo |
|-------------|--------------|-----------|
| **Homepage** | ✅ Yes | ✅ Yes |
| **About Page** | ✅ Yes | ✅ Yes |
| **Contact Page** | ✅ Yes | ✅ Yes |
| **Shop Page** | ✅ Yes | ✅ Yes |
| **Theme Colors** | ✅ Yes | ✅ Yes |
| **Theme Fonts** | ✅ Yes | ✅ Yes |
| **Products** | ❌ No | ✅ Yes (12-15) |
| **Categories** | ❌ No | ✅ Yes (6) |

---

## Switching Themes

### Button States

#### On Themes List Page (`/dashboard/themes`)

1. **"Active"** (disabled)
   - Theme is currently active
   - Shows checkmark icon
   - Button is disabled
   - Visual: Blue border and "Active" badge

2. **"Switch"** (enabled)
   - Theme is installed but not active
   - Shows download icon
   - Clicking switches immediately (one-click)
   - No dialog (already installed)
   - Success: "Theme switched successfully!"

3. **"Install"** (enabled)
   - Theme is not installed
   - Shows download icon
   - Clicking opens dialog with demo content option
   - Success: "Theme installed! Homepage created."

#### On Preview Page (`/dashboard/themes/preview/[themeId]`)

1. **"Active Theme"** (disabled)
   - Theme is currently active
   - Shows checkmark icon
   - Informational only

2. **"Switch to This Theme"** (enabled)
   - Theme is installed but not active
   - Clicking switches immediately
   - Auto-navigates back to themes list
   - Success message shown

3. **"Install Theme"** (enabled)
   - Theme is not installed
   - Clicking opens dialog with demo content option
   - Auto-navigates back to themes list after installation
   - Success message shown

### Switching Behavior

**When Switching (Theme Already Installed)**:
- ✅ Previous theme deactivated
- ✅ Selected theme activated
- ✅ Theme customizations preserved
- ❌ Homepage/pages NOT recreated (preserves existing content)
- ❌ Demo content NOT created (only on new installation)

**When Installing (New Theme)**:
- ✅ Previous theme deactivated
- ✅ New theme activated
- ✅ Homepage created
- ✅ Additional pages created
- ✅ Theme defaults applied
- ✅ Demo content created (if selected)

### User Flow Examples

#### Example 1: Switching Themes

1. Grocery theme is active
2. User sees Default theme with "Switch" button
3. User clicks "Switch"
4. Default theme activates immediately
5. Toast: "Theme switched successfully!"
6. Storefront shows Default theme

#### Example 2: Installing from Preview

1. User previews Minimal theme
2. User clicks "Install Theme" at top
3. Dialog appears with demo content option
4. User selects options and confirms
5. Theme installs with homepage and pages
6. Auto-navigates to themes list
7. Toast: "Theme installed! Homepage created."

---

## Customizing Themes

### Theme Customization Page

**Location**: `/dashboard/themes/customize`

**Features**:
- Color picker for all theme colors
- Font selection for headings and body
- Live preview of changes
- Save and apply changes

### Customizing Homepage

**Location**: `/dashboard/pages` → Edit Homepage

**Features**:
- Page builder interface
- Drag-and-drop sections
- Edit section content
- Add/remove sections
- Preview changes

### Customizing Pages

**Location**: `/dashboard/pages` → Edit any page

**Features**:
- Edit page content
- Change page title and slug
- Update SEO metadata
- Modify page builder sections

### What Can Be Customized

1. **Colors**
   - Primary, secondary, accent colors
   - Background colors
   - Text colors
   - Link colors

2. **Typography**
   - Heading font family
   - Body font family
   - Font sizes
   - Line heights

3. **Homepage Sections**
   - Hero section (title, subtitle, image, CTA)
   - Featured products
   - Category sections
   - Content sections
   - Newsletter signup

4. **Page Content**
   - All page text and content
   - Images and media
   - Section layouts
   - Call-to-action buttons

---

## Troubleshooting

### Issue: Demo Content Not Appearing

#### Step 1: Check Installation Logs

Look for these messages in server console:
- `[Theme Install] Installation request:` - Shows if demo content was requested
- `[Theme Install] Creating demo content for theme:` - Confirms creation started
- `[Demo Content] Creating X categories/products` - Shows progress
- `[Demo Content] Created category/product:` - Shows each item

#### Step 2: Verify What Was Created

Use verification endpoint:
```bash
GET /api/themes/verify-installation
```

Returns:
- Total pages, products, categories
- Count of published/active items
- Sample items with status
- Homepage information

#### Step 3: Common Issues

**Pages Not Showing:**
- Check status filter (should be "All Statuses" or "Published")
- Try hard refresh (Ctrl+Shift+R)
- Add `?refresh=true` to URL
- Check server logs for errors

**Products Not Showing:**
- Ensure no status filter is applied
- Verify categories exist (products need categories)
- Check products have `status: 'active'`
- Check server logs for errors

**Categories Not Showing:**
- Check categories have `status: 'active'`
- Verify in database directly
- Check server logs for creation errors

#### Step 4: Re-run Demo Content

**Option 1**: Re-install theme
- Go to Themes page
- Click "Switch" on the theme
- Or uninstall and reinstall with demo content

**Option 2**: Manual creation (developers)
```typescript
import { createDemoContent } from '@/lib/themes/demo-content';
const result = await createDemoContent(prisma, tenantId, 'grocery');
```

### Issue: Theme Not Switching

**Possible Causes**:
1. Theme not installed (should show "Install" not "Switch")
2. API error (check browser console)
3. Network issue

**Solution**:
- Check button state (Install vs Switch)
- Check browser console for errors
- Try refreshing the page
- Check server logs

### Issue: Homepage Not Created

**Possible Causes**:
1. Homepage already exists (won't recreate)
2. Installation error (check logs)
3. Database permission issue

**Solution**:
- Check if homepage exists: `/dashboard/pages` → Look for "Home" page
- Check server logs for `[Theme Install] Homepage created`
- Verify database permissions
- Try re-installing theme

### Issue: Theme Defaults Not Applied

**Possible Causes**:
1. Not a new installation (defaults only on new install)
2. Theme doesn't have defaults defined
3. Database error

**Solution**:
- Defaults only apply on NEW installations
- Switching themes doesn't reapply defaults
- Check `tenant_themes.custom_colors` and `custom_fonts` in database
- Check server logs for defaults application

---

## Best Practices

### When to Install WITH Demo Content

✅ **Install WITH Demo Content When:**
- You're new to e-commerce
- You want to see how products look
- You need inspiration for product structure
- You're setting up a demo/test store
- You want to test the theme with sample data

### When to Install WITHOUT Demo Content

✅ **Install WITHOUT Demo Content When:**
- You already have products/categories
- You want a clean slate
- You're migrating from another platform
- You have specific products in mind
- You want to start fresh

### Theme Selection Tips

1. **Match Your Industry**
   - Grocery → Food stores, farmers markets
   - HexFashion → Clothing, fashion
   - Furnito → Furniture, home decor
   - Electro → Electronics, tech

2. **Consider Your Brand**
   - Choose colors that match your brand
   - Consider typography style
   - Think about your target audience

3. **Preview First**
   - Always preview before installing
   - Check how products are displayed
   - See if layout matches your needs

### After Installation

1. **Review Created Content**
   - Check homepage layout
   - Review additional pages
   - Verify demo content (if installed)

2. **Customize Immediately**
   - Update homepage hero section
   - Add your branding
   - Adjust colors to match your brand

3. **Add Your Content**
   - Create categories (if no demo content)
   - Add products
   - Update page content

4. **Test Storefront**
   - View your storefront
   - Test navigation
   - Check mobile responsiveness

---

## Technical Reference

### API Endpoints

#### Install Theme
```http
POST /api/themes/install
Content-Type: application/json

{
  "theme_id": "uuid",
  "include_demo_content": true
}
```

**Response**:
```json
{
  "tenant_theme": {...},
  "homepage_created": true,
  "additional_pages_created": 3,
  "demo_content_created": true,
  "demo_categories_created": 6,
  "demo_products_created": 12,
  "defaults_applied": true
}
```

#### Get Installed Themes
```http
GET /api/themes/installed
```

**Response**:
```json
{
  "installedThemes": {
    "theme-id-1": true,  // active
    "theme-id-2": false  // installed but inactive
  }
}
```

#### Verify Installation
```http
GET /api/themes/verify-installation
```

**Response**:
```json
{
  "pages": {
    "total": 4,
    "published": 4,
    "homepage": {...},
    "sample": [...]
  },
  "products": {
    "total": 12,
    "active": 12,
    "sample": [...]
  },
  "categories": {
    "total": 6,
    "active": 6,
    "sample": [...]
  }
}
```

### Database Schema

#### tenant_themes
```sql
- id (UUID)
- tenant_id (UUID)
- theme_id (UUID)
- custom_colors (JSON)
- custom_fonts (JSON)
- custom_layouts (JSON)
- is_active (BOOLEAN)
```

#### pages
```sql
- id (UUID)
- tenant_id (UUID)
- title (VARCHAR)
- slug (VARCHAR)
- content (TEXT) -- JSON page builder data
- status (VARCHAR) -- 'published', 'draft', 'archived'
```

#### products
```sql
- id (UUID)
- tenant_id (UUID)
- name (VARCHAR)
- slug (VARCHAR)
- price (DECIMAL)
- status (VARCHAR) -- 'active', 'inactive', 'draft'
- category_id (UUID)
```

#### categories
```sql
- id (UUID)
- tenant_id (UUID)
- name (VARCHAR)
- slug (VARCHAR)
- status (VARCHAR) -- 'active', 'inactive'
```

### File Locations

**Theme Layouts**:
- `assets/tenant/page-layout/home-pages/[theme]-layout.json`
- `assets/tenant/page-layout/home-pages/dynamic-pages.json`

**Theme Defaults**:
- `src/lib/themes/theme-defaults.ts`

**Demo Content**:
- `src/lib/themes/demo-content.ts`

**Additional Pages**:
- `src/lib/themes/additional-pages.ts`

**Homepage Templates**:
- `src/lib/themes/homepage-templates.ts`

### Code References

**Themes List**: `src/app/dashboard/themes/themes-list-client.tsx`  
**Preview Page**: `src/app/dashboard/themes/preview/[themeId]/theme-preview-client.tsx`  
**Installation API**: `src/app/api/themes/install/route.ts`  
**Installed Themes API**: `src/app/api/themes/installed/route.ts`  
**Verification API**: `src/app/api/themes/verify-installation/route.ts`  
**Theme Customization**: `src/app/dashboard/themes/customize/theme-customize-client.tsx`

---

## Quick Reference

### Installation Checklist

- [ ] Browse available themes
- [ ] Preview theme (optional but recommended)
- [ ] Decide on demo content (yes/no)
- [ ] Click "Install" button
- [ ] Select demo content option (if installing new theme)
- [ ] Wait for installation to complete
- [ ] Review success message
- [ ] Check homepage and pages
- [ ] Verify products/categories (if demo content selected)
- [ ] Customize theme colors and fonts
- [ ] Edit homepage content

### Common Tasks

**Switch Theme**: Click "Switch" button on installed theme  
**Install New Theme**: Click "Install" → Select demo content → Confirm  
**Customize Theme**: Go to Themes → Click "Customize"  
**Edit Homepage**: Go to Pages → Click "Edit" on Homepage  
**Verify Installation**: Visit `/api/themes/verify-installation`

### Expected Results

**After Installation (With Demo Content)**:
- ✅ 1 Homepage (published)
- ✅ 3 Additional pages (published)
- ✅ 6 Categories (active)
- ✅ 12-15 Products (active)
- ✅ Theme colors applied
- ✅ Theme fonts applied

**After Installation (Without Demo Content)**:
- ✅ 1 Homepage (published)
- ✅ 3 Additional pages (published)
- ✅ Theme colors applied
- ✅ Theme fonts applied
- ❌ 0 Categories
- ❌ 0 Products

---

## Support

### Getting Help

1. **Check Logs**: Server console for `[Theme Install]` messages
2. **Verify Installation**: Use `/api/themes/verify-installation`
3. **Check Database**: Verify content exists directly
4. **Review Documentation**: This guide and troubleshooting section
5. **Contact Support**: With logs and verification results

### Useful Links

- Theme Customization: `/dashboard/themes/customize`
- Pages Management: `/dashboard/pages`
- Products Management: `/dashboard/products`
- Categories Management: `/dashboard/categories`

---

## Theme Implementation Status

### Universal Implementation

**All themes use the same implementation system** (Priorities 1-5). The code is universal and automatically works for any theme by looking up theme-specific configurations.

### Fully Implemented Themes

These themes have complete implementation (defaults, layout, demo content):
- ✅ **Grocery** (Reference implementation)
- ✅ **HexFashion**
- ✅ **Furnito**
- ✅ **Casual**
- ✅ **Electro**

### Partially Implemented Themes

These themes work but may use default templates or lack demo content:
- ⚠️ **Medicom** - Needs demo content
- ⚠️ **BookPoint** - Needs demo content
- ⚠️ **Aromatic** - Needs demo content
- ⚠️ **Modern** - Uses default layout, needs demo content
- ⚠️ **Minimal** - Uses default layout, needs demo content
- ⚠️ **Default** - Uses default layout

**Note**: Even partial themes are fully functional - they just use fallbacks or don't have demo content yet.

For detailed implementation status, see: [THEME_INSTALLATION_NEXT_STEPS.md](./THEME_INSTALLATION_NEXT_STEPS.md)

---

**Last Updated**: Based on current StoreFlow implementation  
**Version**: 1.0
