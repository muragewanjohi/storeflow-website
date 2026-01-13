# Split Layout Section - Best Practices & Recommendations

## Overview

Split layout sections are a powerful design pattern used by major e-commerce platforms (Shopify, BigCommerce, WooCommerce, Magento) to create engaging, conversion-focused content blocks. This document outlines best practices and recommendations for improving the current implementation.

## Current Implementation Analysis

### ✅ What's Working Well

1. **Basic Structure**: Left side (banner) + Right side (products/features)
2. **Color Customization**: Individual color controls for titles, CTAs, backgrounds
3. **Image Support**: Image upload with preview
4. **Product Integration**: Dynamic product fetching from categories
5. **Responsive Design**: Grid layout that stacks on mobile

### ⚠️ Areas for Improvement

Based on industry best practices from Shopify, BigCommerce, and other major platforms:

## Best Practices from Popular E-commerce Stores

### 1. **Flexible Layout Ratios**

**Current**: Fixed 50/50 split (`grid-cols-2`)

**Best Practice** (Shopify, BigCommerce):
- Allow configurable split ratios: 50/50, 60/40, 40/60, 70/30, 30/70
- Default to 50/50, but provide options for visual hierarchy
- Example: Banner with large image (60%) + Product grid (40%)

**Recommendation**:
```typescript
// Add to SplitLayoutSection interface
layout_ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
```

### 2. **Content Type Flexibility**

**Current**: 
- Left: Only `banner` or `image`
- Right: Only `products` or `features`

**Best Practice** (Shopify Sections 2.0):
- Allow ANY content type in either side:
  - Text blocks
  - Images
  - Videos
  - Product grids
  - Category grids
  - Forms
  - Testimonials
  - Rich content (HTML/WYSIWYG)

**Recommendation**:
```typescript
left_side: {
  content_type: 'banner' | 'image' | 'text' | 'video' | 'products' | 'categories' | 'custom';
  // ... content-specific fields
}
```

### 3. **Mobile Behavior Control**

**Current**: Always stacks vertically on mobile

**Best Practice** (BigCommerce, WooCommerce):
- Option to control mobile behavior:
  - Stack vertically (default)
  - Keep side-by-side (with horizontal scroll)
  - Hide one side on mobile
  - Show different content on mobile

**Recommendation**:
```typescript
mobile_behavior?: 'stack' | 'scroll' | 'hide_left' | 'hide_right' | 'custom';
mobile_content?: { /* mobile-specific content */ };
```

### 4. **Visual Alignment & Positioning**

**Current**: Centered text overlay on banner

**Best Practice** (Shopify, Magento):
- Configurable text alignment: left, center, right, top-left, top-right, bottom-left, bottom-right
- Vertical alignment: top, middle, bottom
- Text overlay positioning controls
- Background image positioning (cover, contain, position)

**Recommendation**:
```typescript
left_side: {
  text_alignment?: 'left' | 'center' | 'right';
  vertical_alignment?: 'top' | 'middle' | 'bottom';
  image_position?: 'cover' | 'contain' | 'top' | 'center' | 'bottom';
  overlay_opacity?: number; // 0-100
}
```

### 5. **Spacing & Padding Controls**

**Current**: Fixed padding (`py-16`, `gap-12`)

**Best Practice** (All major platforms):
- Individual padding controls: top, right, bottom, left
- Gap/spacing between columns
- Section-level padding separate from column padding
- Responsive spacing (different values for mobile/tablet/desktop)

**Recommendation**:
```typescript
spacing?: {
  section_padding?: { top?: number; right?: number; bottom?: number; left?: number };
  column_gap?: number;
  responsive?: {
    mobile?: { /* mobile spacing */ };
    tablet?: { /* tablet spacing */ };
  };
}
```

### 6. **Advanced Styling Options**

**Current**: Basic background colors

**Best Practice** (Shopify, BigCommerce):
- Background gradients (like CTA section)
- Border radius controls
- Box shadows
- Border styles
- Background image support (not just left side)
- Parallax effects (optional)

**Recommendation**:
```typescript
background_gradient?: string;
border_radius?: number;
box_shadow?: boolean;
border?: { width?: number; color?: string; style?: string };
parallax?: boolean;
```

### 7. **Content Richness**

**Current**: Simple title + subtitle + CTA

**Best Practice** (Shopify):
- Rich text editor support (WYSIWYG)
- Multiple CTAs
- Badge/label support
- Icon support
- Custom HTML blocks
- Video embeds

**Recommendation**:
```typescript
left_side: {
  content?: string; // Rich HTML content
  badges?: Array<{ text: string; color: string; position: string }>;
  icons?: Array<{ icon: string; position: string }>;
  videos?: Array<{ url: string; autoplay?: boolean }>;
}
```

### 8. **Product Display Options**

**Current**: Basic product grid (1-2 columns)

**Best Practice** (Shopify, BigCommerce):
- Product card styles: compact, detailed, minimal
- Product selection: specific products, category, collection, featured, new arrivals, best sellers
- Display options: image only, with price, with add-to-cart, with quick view
- Product limit with pagination
- "View All" link

**Recommendation**:
```typescript
right_side: {
  product_selection?: 'specific' | 'category' | 'featured' | 'new' | 'bestsellers' | 'on_sale';
  product_ids?: string[];
  display_style?: 'compact' | 'detailed' | 'minimal';
  show_price?: boolean;
  show_add_to_cart?: boolean;
  show_quick_view?: boolean;
  view_all_link?: string;
}
```

### 9. **Accessibility Features**

**Current**: Basic alt text support

**Best Practice** (WCAG 2.1):
- Alt text for all images (required)
- ARIA labels for CTAs
- Color contrast validation
- Keyboard navigation support
- Screen reader announcements

**Recommendation**:
- Enforce alt text on image upload
- Add ARIA labels to all interactive elements
- Validate color contrast ratios
- Test with screen readers

### 10. **Performance Optimization**

**Current**: Client-side product fetching

**Best Practice**:
- Server-side rendering for products (SSR)
- Image lazy loading
- Product data prefetching
- Caching strategies
- Optimized image sizes

**Recommendation**:
- Move product fetching to server component
- Use Next.js Image component (already done)
- Implement ISR for product data
- Add loading states and skeletons

## Implementation Priority

### Phase 1: High Priority (Quick Wins)
1. ✅ Layout ratio options (50/50, 60/40, etc.)
2. ✅ Text alignment controls
3. ✅ Mobile behavior options
4. ✅ Spacing/padding controls
5. ✅ Background gradients

### Phase 2: Medium Priority (Enhanced Functionality)
1. Content type flexibility
2. Advanced product display options
3. Rich text support
4. Video support
5. Better mobile controls

### Phase 3: Advanced Features
1. Parallax effects
2. Custom HTML blocks
3. Advanced animations
4. A/B testing support
5. Analytics integration

## Example: Shopify-Style Split Layout

```typescript
interface SplitLayoutSection {
  type: 'split_layout';
  
  // Layout
  layout_ratio: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
  mobile_behavior: 'stack' | 'scroll' | 'hide_left' | 'hide_right';
  
  // Left Side
  left_side: {
    content_type: 'banner' | 'image' | 'text' | 'video' | 'products';
    title?: string;
    subtitle?: string;
    content?: string; // Rich HTML
    image?: string;
    video?: string;
    text_alignment: 'left' | 'center' | 'right';
    vertical_alignment: 'top' | 'middle' | 'bottom';
    cta_text?: string;
    cta_link?: string;
    background_color?: string;
    background_gradient?: string;
    overlay_opacity?: number;
  };
  
  // Right Side
  right_side: {
    content_type: 'products' | 'features' | 'text' | 'image' | 'categories';
    title?: string;
    product_selection?: 'category' | 'featured' | 'specific';
    category_id?: string;
    product_ids?: string[];
    limit?: number;
    columns?: 1 | 2 | 3;
    display_style?: 'compact' | 'detailed';
    show_price?: boolean;
    show_add_to_cart?: boolean;
  };
  
  // Styling
  spacing: {
    section_padding: { top: number; bottom: number };
    column_gap: number;
  };
  background_color?: string;
  background_gradient?: string;
  border_radius?: number;
}
```

## Comparison with Major Platforms

| Feature | Current | Shopify | BigCommerce | Recommendation |
|---------|---------|---------|-------------|----------------|
| Layout Ratios | ❌ Fixed 50/50 | ✅ 5 options | ✅ 4 options | **Add ratios** |
| Content Types | ⚠️ Limited | ✅ Unlimited | ✅ Flexible | **Expand types** |
| Mobile Control | ❌ Auto-stack | ✅ Configurable | ✅ Configurable | **Add options** |
| Text Alignment | ❌ Center only | ✅ 9 positions | ✅ 6 positions | **Add alignment** |
| Spacing Control | ❌ Fixed | ✅ Full control | ✅ Full control | **Add controls** |
| Rich Content | ❌ No | ✅ Yes | ✅ Yes | **Add WYSIWYG** |
| Product Options | ⚠️ Basic | ✅ Advanced | ✅ Advanced | **Enhance** |
| Gradients | ❌ No | ✅ Yes | ✅ Yes | **Add support** |
| Video Support | ❌ No | ✅ Yes | ✅ Yes | **Add support** |

## Next Steps

1. **Review and prioritize** features based on user needs
2. **Implement Phase 1** improvements (high priority)
3. **Test with real content** to ensure usability
4. **Gather user feedback** on new features
5. **Iterate** based on usage patterns

## References

- [Shopify Sections Best Practices](https://shopify.dev/docs/storefronts/themes/architecture/sections/best-practices)
- [BigCommerce Page Builder Guide](https://support.bigcommerce.com/s/article/Using-Page-Builder)
- [WooCommerce Block Editor](https://woocommerce.com/document/woocommerce-blocks/)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
