# Theme Template Architecture

## Overview

This document outlines the architecture for implementing diverse theme templates with industry-specific demo content, similar to how Shopify Theme Store and WordPress theme marketplaces work.

## Research Findings

### How Popular Platforms Handle Theme Previews

**Shopify Theme Store:**
- Each theme has a live demo store with real products
- Themes have completely different layouts (not just colors)
- Demo content matches the theme's intended industry
- Users can browse the full site, add to cart, and see checkout flow
- Preview is a fully functional storefront

**WordPress Theme Marketplaces:**
- Each theme has a demo site with sample content
- Different themes have different page structures
- Industry-specific content (restaurant themes show menus, e-commerce shows products)
- Users can interact with the demo site

**Key Principles:**
1. **Different Structures**: Each theme should have unique layouts, not just color variations
2. **Industry-Specific Content**: Themes should showcase content relevant to their target industry
3. **Full Site Preview**: Users should see a complete, functional storefront, not just a mockup
4. **Interactive Previews**: Users can navigate, browse products, and see how the theme works

## Architecture Design

### 1. Theme Template System

Each theme will have:
- **Unique Layout Components**: Different header styles, product grid layouts, hero sections
- **Theme-Specific Sections**: Custom homepage sections designed for the theme's industry
- **Layout Variants**: Different page structures (sidebar layouts, full-width, etc.)

### 2. Demo Content System

**Demo Stores per Theme:**
- **Modern Theme** (Electronics):
  - Demo products: Laptops, phones, headphones, smartwatches
  - Demo categories: Electronics, Computers, Accessories
  - Demo images: High-quality electronics product photos
  
- **HexFashion Theme** (Fashion):
  - Demo products: Clothing, shoes, accessories, jewelry
  - Demo categories: Men's, Women's, Accessories
  - Demo images: Fashion photography, models wearing products

- **Default Theme** (General):
  - Demo products: Mixed categories
  - Generic product images

**Demo Content Storage:**
- Store demo content in database with `is_demo: true` flag
- Associate demo content with theme IDs
- Use placeholder images from Unsplash/Pexels or curated stock photos

### 3. Theme Template Components

**Component Structure:**
```
themes/
  modern/
    components/
      Header.tsx (electronics-focused header)
      ProductGrid.tsx (large product cards)
      Hero.tsx (tech-focused hero)
      Footer.tsx
  hexfashion/
    components/
      Header.tsx (fashion-focused header)
      ProductGrid.tsx (fashion catalog layout)
      Hero.tsx (fashion banner)
      Footer.tsx
```

**Theme Configuration:**
```typescript
interface ThemeConfig {
  id: string;
  name: string;
  industry: 'electronics' | 'fashion' | 'general';
  layout: {
    header: 'sticky' | 'transparent' | 'minimal';
    productGrid: 'grid' | 'masonry' | 'list';
    sidebar: 'left' | 'right' | 'none';
  };
  demoContent: {
    products: DemoProduct[];
    categories: DemoCategory[];
    images: string[];
  };
}
```

### 4. Preview System

**Preview Page Features:**
- Full storefront rendering with theme applied
- Real navigation (users can click around)
- Demo products with images
- Functional cart (preview mode)
- Theme-specific homepage layout
- Industry-appropriate content

**Implementation:**
- Create `/dashboard/themes/preview/[themeId]` route
- Load theme-specific components
- Inject demo content for that theme
- Apply theme colors, fonts, and layout
- Show full site, not just homepage

## Implementation Plan

### Phase 1: Template System (Day 37 Morning)
1. Create theme component architecture
2. Build theme-specific layout components
3. Implement theme configuration system
4. Create component registry per theme

### Phase 2: Demo Content (Day 37 Afternoon)
1. Create demo content seeding system
2. Add demo products, categories, images per theme
3. Build demo content API endpoints
4. Implement preview page with full site
5. Add navigation and interactivity to preview

## Example Theme Structures

### Modern Theme (Electronics)
- **Header**: Tech-focused with search bar, categories dropdown
- **Hero**: Large banner with electronics imagery
- **Product Grid**: Large cards with product specs
- **Product Detail**: Technical specifications, comparison tables
- **Footer**: Tech support links, warranty info

### HexFashion Theme (Fashion)
- **Header**: Minimal with shopping bag icon, wishlist
- **Hero**: Fashion photography, seasonal collections
- **Product Grid**: Catalog-style with hover effects
- **Product Detail**: Size guide, lookbook, styling tips
- **Footer**: Social media, newsletter signup

## Database Schema

```sql
-- Demo content table
CREATE TABLE theme_demo_content (
  id UUID PRIMARY KEY,
  theme_id UUID REFERENCES themes(id),
  content_type VARCHAR(50), -- 'product', 'category', 'image'
  content_data JSONB,
  is_active BOOLEAN DEFAULT true
);

-- Theme components registry
CREATE TABLE theme_components (
  id UUID PRIMARY KEY,
  theme_id UUID REFERENCES themes(id),
  component_name VARCHAR(100),
  component_path VARCHAR(255),
  component_config JSONB
);
```

## Next Steps

1. Implement theme component system
2. Create demo content for each theme
3. Build full preview system
4. Test with multiple themes
5. Add more themes with different industries

