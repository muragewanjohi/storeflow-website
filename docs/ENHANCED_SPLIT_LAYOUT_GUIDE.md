# Enhanced Split Layout Section - Implementation Guide

## Overview

The Enhanced Split Layout Section is a powerful, flexible component based on best practices from major e-commerce platforms like Shopify, BigCommerce, and WooCommerce. It allows you to create professional, conversion-focused split-screen layouts with extensive customization options.

## Features Implemented (Phase 1)

### ✅ Layout Configuration
- **Flexible Ratios**: Choose from 50/50, 60/40, 40/60, 70/30, or 30/70 splits
- **Desktop Reversal**: Option to swap left/right columns on desktop
- **Full Width**: Extend section to viewport edges

### ✅ Mobile Responsiveness
- **Stack Vertically**: Default mobile behavior (recommended)
- **Reverse Stack**: Right column appears first on mobile
- **Horizontal Scroll**: Keep side-by-side with scroll
- **Hide Left/Right**: Selectively hide columns on mobile

### ✅ Text & Content Alignment
- **Horizontal Alignment**: Left, center, or right alignment
- **Vertical Alignment**: Top, middle, or bottom positioning
- **Per-Column Control**: Independent alignment for each side

### ✅ Image Positioning
- **Cover**: Fill the entire container (default)
- **Contain**: Fit entire image within container
- **Top/Center/Bottom**: Position image vertically
- **Overlay Control**: Adjustable overlay opacity (0-100%)

### ✅ Spacing & Padding
- **Section Padding**: Independent top/bottom padding
- **Column Gap**: Customizable space between columns
- **Content Padding**: Internal padding for each column
- **Responsive**: All spacing values in pixels

### ✅ Background Styling
- **Solid Colors**: Traditional background colors
- **Gradients**: CSS gradients for modern effects
- **Per-Column**: Independent backgrounds for each side
- **Section-Level**: Overall section background

### ✅ Content Flexibility
**Left Side Options:**
- Banner with text overlay
- Image only
- Text content

**Right Side Options:**
- Product grid (with category filtering)
- Feature list
- Text content
- Image

## Usage Guide

### Creating a Split Layout Section

1. **Navigate to Page Builder**
   - Go to Dashboard → Pages → Edit Page
   - Click "Add Section"
   - Select "Split Layout"

2. **Configure Layout**
   - Choose your preferred layout ratio (e.g., 60/40 for emphasis on left)
   - Set mobile behavior (stack is most common)
   - Toggle desktop reversal if needed

3. **Configure Left Side**
   - Select content type (Banner, Image, or Text)
   - Upload image (if applicable)
   - Set text alignment and vertical positioning
   - Adjust overlay opacity for banner type
   - Configure background color or gradient
   - Add CTA button (optional)

4. **Configure Right Side**
   - Select content type (Products, Features, Text, or Image)
   - For products: set category filter, limit, and columns
   - Configure text alignment
   - Set background styling

5. **Adjust Spacing**
   - Fine-tune section padding (top/bottom)
   - Adjust column gap
   - Set content padding for internal spacing

### Common Use Cases

#### 1. Product Showcase with Featured Items
```
Layout: 50/50
Left: Banner with product hero image + CTA
Right: Featured products (2 columns, limit 4)
Mobile: Stack vertically
```

#### 2. Content-Heavy with Image
```
Layout: 60/40
Left: Text content with rich formatting
Right: Supporting image
Mobile: Reverse stack (image first)
```

#### 3. Sale Promotion
```
Layout: 70/30
Left: Large banner with countdown timer
Right: Top deals (1 column, limit 3)
Mobile: Hide right on mobile
```

#### 4. Feature Highlight
```
Layout: 40/60
Left: Icon and tagline
Right: Feature list with descriptions
Mobile: Stack vertically
```

## Best Practices

### Layout Ratios
- **50/50**: Equal importance, balanced content
- **60/40**: Emphasize left content (hero + products)
- **40/60**: Emphasize right content (small banner + large product grid)
- **70/30**: Strong left emphasis (large promotion + small widget)
- **30/70**: Strong right emphasis (small badge + large content)

### Mobile Behavior
- **Stack**: Most versatile, works for 90% of cases
- **Reverse Stack**: When right content should appear first on mobile
- **Horizontal Scroll**: Only for image galleries or card collections
- **Hide Left/Right**: Use sparingly, only for truly optional content

### Text Alignment
- **Left-aligned**: Best for readability, long-form content
- **Center-aligned**: Attention-grabbing, short hero text
- **Right-aligned**: Unique layouts, artistic designs

### Image Overlays
- **0-20%**: Light tint, preserve image details
- **30-50%**: Moderate darkening, ensure text contrast
- **60-80%**: Heavy darkening, dramatic effect
- **80-100%**: Near-black background, text-focused

### Spacing Guidelines
- **Section Padding**: 64px (default) for generous spacing, 32px for compact
- **Column Gap**: 48px (default) for desktop comfort, consider reducing for mobile
- **Content Padding**: 32px (default) for balanced internal spacing

### Performance Tips
1. **Optimize Images**: Use appropriate sizes for each layout ratio
2. **Lazy Loading**: Automatic for product images
3. **Gradient vs Color**: Gradients add visual interest but use color for better performance
4. **Mobile Images**: Consider different images for mobile vs desktop (future enhancement)

## Accessibility Considerations

### Images
- Always provide alt text for images
- Use descriptive alt text (not just "banner" or "image")
- Ensure overlay opacity maintains sufficient contrast for text

### Colors
- Maintain WCAG 2.1 AA contrast ratios (4.5:1 for normal text)
- Test with colorblindness simulators
- Don't rely solely on color to convey information

### Mobile
- Ensure tap targets are at least 44x44px
- Test with screen readers
- Verify keyboard navigation works

## Technical Details

### TypeScript Interface
```typescript
interface SplitLayoutSection {
  type: 'split_layout';
  layout_ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70';
  mobile_behavior?: 'stack' | 'scroll' | 'hide_left' | 'hide_right' | 'reverse_stack';
  reverse_desktop?: boolean;
  full_width?: boolean;
  
  left_side: {
    type: 'banner' | 'image' | 'text';
    title?: string;
    subtitle?: string;
    image?: string;
    text_alignment?: 'left' | 'center' | 'right';
    vertical_alignment?: 'top' | 'middle' | 'bottom';
    image_position?: 'cover' | 'contain' | 'top' | 'center' | 'bottom';
    overlay_opacity?: number;
    background_color?: string;
    background_gradient?: string;
    border_radius?: number;
    // ... CTA fields
  };
  
  right_side: {
    type: 'products' | 'features' | 'text' | 'image';
    title?: string;
    product_ids?: string[];
    category_id?: string;
    limit?: number;
    columns?: 1 | 2 | 3;
    text_alignment?: 'left' | 'center' | 'right';
    // ... styling fields
  };
  
  spacing?: {
    section_padding_top?: number;
    section_padding_bottom?: number;
    column_gap?: number;
    content_padding?: number;
  };
  
  background_color?: string;
  background_gradient?: string;
  min_height?: number;
}
```

### CSS Variables Used
- `--font-heading`: Heading font from theme
- `--font-body`: Body font from theme
- `--color-primary`: Primary theme color
- `--color-text`: Default text color
- `--container-max-width`: Maximum container width

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid for layout
- CSS Custom Properties for theming
- Flexbox for internal alignment

## Future Enhancements (Phase 2)

### Planned Features
1. **Video Support**: Embed videos in either column
2. **Animation Effects**: Fade in, slide in, parallax
3. **Multiple CTAs**: Up to 3 CTA buttons per side
4. **Rich Text Editor**: Full WYSIWYG for text content
5. **Custom HTML**: For advanced users
6. **Responsive Images**: Different images for mobile/tablet/desktop
7. **Lazy Loading**: Configurable lazy loading for images
8. **A/B Testing**: Built-in variant testing

## Troubleshooting

### Issue: Layout not responsive
**Solution**: Check that mobile_behavior is set (defaults to 'stack')

### Issue: Image not showing
**Solution**: Verify image URL is not a blob URL, re-upload if needed

### Issue: Text not readable on image
**Solution**: Increase overlay_opacity or adjust text colors

### Issue: Spacing looks wrong
**Solution**: Check spacing values, ensure they're in pixels (not percentages)

### Issue: Gradient not working
**Solution**: Verify gradient syntax, use CSS gradient generator if unsure

### Issue: Products not loading
**Solution**: Check category_id is valid, verify products exist with 'active' status

## Examples

### Example 1: Hero Split with Products
```json
{
  "type": "split_layout",
  "layout_ratio": "50-50",
  "mobile_behavior": "stack",
  "left_side": {
    "type": "banner",
    "title": "Summer Sale",
    "subtitle": "Up to 50% Off",
    "image": "/uploads/summer-hero.jpg",
    "text_alignment": "center",
    "vertical_alignment": "middle",
    "overlay_opacity": 40,
    "cta_text": "Shop Now",
    "cta_link": "/products"
  },
  "right_side": {
    "type": "products",
    "title": "Top Picks",
    "limit": 4,
    "columns": 2,
    "category_id": "summer-collection"
  },
  "spacing": {
    "section_padding_top": 64,
    "section_padding_bottom": 64,
    "column_gap": 48,
    "content_padding": 32
  }
}
```

### Example 2: Content Focus with Image Accent
```json
{
  "type": "split_layout",
  "layout_ratio": "60-40",
  "mobile_behavior": "stack",
  "left_side": {
    "type": "text",
    "title": "Our Story",
    "content": "<p>We started in 2020 with a simple mission...</p>",
    "text_alignment": "left",
    "vertical_alignment": "top"
  },
  "right_side": {
    "type": "image",
    "image": "/uploads/team-photo.jpg",
    "alt_text": "Our team at work"
  },
  "background_color": "#f9fafb"
}
```

### Example 3: Feature Showcase
```json
{
  "type": "split_layout",
  "layout_ratio": "40-60",
  "mobile_behavior": "reverse_stack",
  "left_side": {
    "type": "banner",
    "title": "Why Choose Us",
    "subtitle": "Quality Guaranteed",
    "background_gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "text_alignment": "center",
    "vertical_alignment": "middle"
  },
  "right_side": {
    "type": "features",
    "features": [
      {
        "icon": "🚚",
        "title": "Free Shipping",
        "description": "On orders over $50"
      },
      {
        "icon": "💯",
        "title": "100% Satisfaction",
        "description": "30-day money back guarantee"
      },
      {
        "icon": "🔒",
        "title": "Secure Checkout",
        "description": "SSL encrypted payments"
      }
    ]
  }
}
```

## Support

For issues or feature requests related to the Split Layout Section:
1. Check this documentation first
2. Review the troubleshooting section
3. Consult the main documentation (SPLIT_LAYOUT_BEST_PRACTICES.md)
4. Contact development team

---

**Last Updated**: January 2026
**Version**: 1.0.0 (Phase 1 Complete)
**Status**: Production Ready
