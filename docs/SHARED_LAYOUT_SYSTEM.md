# Shared Storefront Layout System

## Overview

The Shared Storefront Layout System provides a comprehensive set of reusable layout components for building consistent, professional storefront pages. Based on best practices from Shopify, BigCommerce, and WooCommerce, these components handle common layout patterns while maintaining flexibility for custom designs.

## Components

### 1. SharedStorefrontLayout (Base Component)

The foundational layout component that all others build upon.

```tsx
import SharedStorefrontLayout from '@/components/storefront/shared-layout';

<SharedStorefrontLayout
  maxWidth="xl"
  paddingTop="md"
  paddingBottom="md"
  backgroundColor="#f9fafb"
>
  <h1>My Content</h1>
</SharedStorefrontLayout>
```

**Props:**
- `maxWidth`: `'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'` (default: `'xl'`)
- `noPadding`: `boolean` - Remove horizontal padding
- `noMargin`: `boolean` - Remove container margin
- `as`: `'div' | 'main' | 'section' | 'article'` - HTML element type
- `paddingTop`: `'none' | 'sm' | 'md' | 'lg' | 'xl'` (default: `'md'`)
- `paddingBottom`: `'none' | 'sm' | 'md' | 'lg' | 'xl'` (default: `'md'`)
- `backgroundColor`: `string` - Solid background color
- `backgroundGradient`: `string` - CSS gradient
- `className`: `string` - Additional CSS classes
- `ariaLabel`: `string` - Accessibility label
- `role`: `string` - ARIA role

### 2. Specialized Layout Variants

Pre-configured layouts for common use cases.

#### HeroLayout
```tsx
import { HeroLayout } from '@/components/storefront/shared-layout';

<HeroLayout backgroundColor="#f9fafb">
  <h1>Welcome to Our Store</h1>
  <p>Discover amazing products</p>
</HeroLayout>
```
- Large padding (xl)
- Extra wide container (2xl)
- Semantic `<section>` element

#### ContentLayout
```tsx
import { ContentLayout } from '@/components/storefront/shared-layout';

<ContentLayout>
  <article>
    <h2>About Us</h2>
    <p>Our story...</p>
  </article>
</ContentLayout>
```
- Medium container width (lg)
- Large padding (lg)
- Best for text-heavy content

#### ProductGridLayout
```tsx
import { ProductGridLayout } from '@/components/storefront/shared-layout';

<ProductGridLayout>
  <div className="grid grid-cols-4 gap-6">
    {products.map(product => <ProductCard key={product.id} {...product} />)}
  </div>
</ProductGridLayout>
```
- Wide container (xl)
- Medium padding (md)
- Optimized for product displays

#### FullWidthLayout
```tsx
import { FullWidthLayout } from '@/components/storefront/shared-layout';

<FullWidthLayout>
  <BannerSlider />
</FullWidthLayout>
```
- No padding or margin
- Full viewport width
- Perfect for banners and sliders

#### NarrowContentLayout
```tsx
import { NarrowContentLayout } from '@/components/storefront/shared-layout';

<NarrowContentLayout>
  <article>
    <h1>Blog Post Title</h1>
    <p>Content with optimal line length for reading...</p>
  </article>
</NarrowContentLayout>
```
- Narrow container (md)
- Semantic `<article>` element
- Best for blog posts and articles

### 3. Grid Layouts

#### GridLayout
Responsive grid with configurable columns and gaps.

```tsx
import { GridLayout } from '@/components/storefront/shared-layout';

<GridLayout
  columns={4}
  gap="md"
  maxWidth="xl"
  paddingTop="lg"
>
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</GridLayout>
```

**Additional Props:**
- `columns`: `1 | 2 | 3 | 4 | 6` (default: `3`)
- `gap`: `'sm' | 'md' | 'lg'` (default: `'md'`)

**Column Behavior:**
- `1`: Single column on all screens
- `2`: 1 column mobile, 2 columns tablet+
- `3`: 1 column mobile, 2 tablet, 3 desktop
- `4`: 1 column mobile, 2 tablet, 4 desktop
- `6`: 2 columns mobile, 3 tablet, 6 desktop

### 4. Split Layouts

#### SimpleSplitLayout
Two-column layout with configurable ratios.

```tsx
import { SimpleSplitLayout } from '@/components/storefront/shared-layout';

<SimpleSplitLayout
  ratio="60-40"
  gap="lg"
  stackOnMobile={true}
  leftColumn={
    <div>
      <h2>Main Content</h2>
      <p>Primary information here...</p>
    </div>
  }
  rightColumn={
    <aside>
      <h3>Sidebar</h3>
      <p>Supporting content...</p>
    </aside>
  }
/>
```

**Additional Props:**
- `ratio`: `'50-50' | '60-40' | '40-60' | '70-30' | '30-70'` (default: `'50-50'`)
- `gap`: `'sm' | 'md' | 'lg' | 'xl'` (default: `'lg'`)
- `stackOnMobile`: `boolean` (default: `true`)
- `leftColumn`: `ReactNode`
- `rightColumn`: `ReactNode`

### 5. Section Wrapper

Adds consistent section headers and styling.

```tsx
import { SectionWrapper } from '@/components/storefront/shared-layout';

<SectionWrapper
  title="Featured Products"
  subtitle="Hand-picked items just for you"
  titleAlignment="center"
>
  <ProductGrid products={featuredProducts} />
</SectionWrapper>
```

**Props:**
- `title`: `string` - Section heading
- `subtitle`: `string` - Section subheading
- `titleAlignment`: `'left' | 'center' | 'right'` (default: `'center'`)
- `className`: `string` - Additional CSS classes

## Usage Examples

### Example 1: Homepage Layout

```tsx
import { 
  HeroLayout, 
  ProductGridLayout, 
  ContentLayout,
  GridLayout,
  SectionWrapper 
} from '@/components/storefront/shared-layout';

export default function Homepage() {
  return (
    <>
      {/* Hero Section */}
      <HeroLayout backgroundColor="#f9fafb">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Our Store</h1>
          <p className="text-xl mb-8">Discover amazing products at great prices</p>
          <Button size="lg">Shop Now</Button>
        </div>
      </HeroLayout>

      {/* Featured Products */}
      <ProductGridLayout>
        <SectionWrapper 
          title="Featured Products" 
          subtitle="Best sellers this month"
        >
          <GridLayout columns={4} gap="md">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} {...product} />
            ))}
          </GridLayout>
        </SectionWrapper>
      </ProductGridLayout>

      {/* About Section */}
      <ContentLayout backgroundColor="#ffffff">
        <div className="prose max-w-none">
          <h2>Why Choose Us</h2>
          <p>We offer the best quality products with fast shipping...</p>
        </div>
      </ContentLayout>
    </>
  );
}
```

### Example 2: Product Category Page

```tsx
import { 
  SharedStorefrontLayout, 
  SimpleSplitLayout,
  GridLayout 
} from '@/components/storefront/shared-layout';

export default function CategoryPage({ category, products }) {
  return (
    <SharedStorefrontLayout maxWidth="2xl" paddingTop="lg">
      <SimpleSplitLayout
        ratio="70-30"
        gap="xl"
        stackOnMobile
        leftColumn={
          <>
            <h1 className="text-4xl font-bold mb-8">{category.name}</h1>
            <GridLayout columns={3} gap="lg" noPadding>
              {products.map(product => (
                <ProductCard key={product.id} {...product} />
              ))}
            </GridLayout>
          </>
        }
        rightColumn={
          <aside className="sticky top-4">
            <CategoryFilters category={category} />
          </aside>
        }
      />
    </SharedStorefrontLayout>
  );
}
```

### Example 3: Blog Post Layout

```tsx
import { 
  NarrowContentLayout,
  SectionWrapper 
} from '@/components/storefront/shared-layout';

export default function BlogPost({ post }) {
  return (
    <NarrowContentLayout>
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="text-muted-foreground">
          <time>{post.publishedAt}</time> • {post.author}
        </div>
      </header>
      
      <div 
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      
      <footer className="mt-12 pt-8 border-t">
        <SectionWrapper title="Related Posts">
          {/* Related posts grid */}
        </SectionWrapper>
      </footer>
    </NarrowContentLayout>
  );
}
```

### Example 4: Landing Page with Alternating Sections

```tsx
import { 
  FullWidthLayout,
  SimpleSplitLayout,
  ContentLayout 
} from '@/components/storefront/shared-layout';

export default function LandingPage() {
  return (
    <>
      {/* Hero Banner */}
      <FullWidthLayout>
        <HeroBanner />
      </FullWidthLayout>

      {/* Feature 1 - Image Left */}
      <ContentLayout paddingTop="xl" paddingBottom="xl">
        <SimpleSplitLayout
          ratio="50-50"
          gap="xl"
          leftColumn={<img src="/feature1.jpg" alt="Feature 1" />}
          rightColumn={
            <div>
              <h2 className="text-3xl font-bold mb-4">Feature One</h2>
              <p>Description of feature one...</p>
            </div>
          }
        />
      </ContentLayout>

      {/* Feature 2 - Image Right */}
      <ContentLayout 
        paddingTop="xl" 
        paddingBottom="xl"
        backgroundColor="#f9fafb"
      >
        <SimpleSplitLayout
          ratio="50-50"
          gap="xl"
          leftColumn={
            <div>
              <h2 className="text-3xl font-bold mb-4">Feature Two</h2>
              <p>Description of feature two...</p>
            </div>
          }
          rightColumn={<img src="/feature2.jpg" alt="Feature 2" />}
        />
      </ContentLayout>

      {/* CTA Section */}
      <ContentLayout paddingTop="xl" paddingBottom="xl">
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <Button size="lg">Sign Up Now</Button>
        </div>
      </ContentLayout>
    </>
  );
}
```

## Best Practices

### Container Widths
- **sm** (max-w-3xl): Blog posts, articles, narrow forms
- **md** (max-w-5xl): Product details, content pages
- **lg** (max-w-7xl): Standard content pages
- **xl** (max-w-[1400px]): Product grids, wide layouts (recommended default)
- **2xl** (max-w-[1600px]): Hero sections, expansive layouts
- **full**: Banners, sliders, full-bleed images

### Padding Guidelines
- **none**: Remove padding entirely
- **sm** (4px): Tight spacing, compact designs
- **md** (8-12px): Standard spacing (recommended default)
- **lg** (12-16px): Generous spacing, breathing room
- **xl** (16-24px): Maximum spacing, hero sections

### Grid Columns
- **1 column**: Forms, detailed content
- **2 columns**: Blog posts, comparisons
- **3 columns**: Standard product grids, feature lists
- **4 columns**: Dense product displays, category grids
- **6 columns**: Category icons, small cards

### Split Layout Ratios
- **50-50**: Equal importance, balanced content
- **60-40**: Emphasize left content
- **40-60**: Emphasize right content
- **70-30**: Strong left emphasis (main content + sidebar)
- **30-70**: Strong right emphasis (sidebar + main content)

## Accessibility Features

All layout components include:
- Semantic HTML elements (`<main>`, `<section>`, `<article>`)
- ARIA labels and roles support
- Keyboard navigation friendly
- Screen reader optimized
- Responsive breakpoints for mobile accessibility

## Performance Considerations

- **Lazy Loading**: Components don't include images - implement lazy loading at the content level
- **CSS-in-JS**: Minimal inline styles, prefer Tailwind classes
- **Bundle Size**: Tree-shakeable exports for minimal impact
- **Responsive**: Mobile-first responsive design

## Migration from Old Layouts

### Before (Direct Container Usage)
```tsx
<div className="container mx-auto px-4 py-16">
  <div className="grid grid-cols-3 gap-6">
    {products.map(product => <ProductCard {...product} />)}
  </div>
</div>
```

### After (Using Shared Layout)
```tsx
<ProductGridLayout>
  <GridLayout columns={3} gap="md">
    {products.map(product => <ProductCard {...product} />)}
  </GridLayout>
</ProductGridLayout>
```

**Benefits:**
- Consistent spacing across pages
- Responsive behavior built-in
- Easy to update globally
- Better semantic HTML
- Reduced code duplication

## Troubleshooting

### Issue: Layout too wide on large screens
**Solution**: Use a smaller `maxWidth` prop (try `lg` or `md`)

### Issue: Too much vertical spacing
**Solution**: Reduce `paddingTop` and `paddingBottom` or use `'sm'`

### Issue: Content touching edges on mobile
**Solution**: Ensure `noPadding={false}` (default) to include horizontal padding

### Issue: Grid not stacking properly on mobile
**Solution**: Check `columns` prop - most values auto-stack except `columns={1}`

### Issue: Split layout not responsive
**Solution**: Ensure `stackOnMobile={true}` (default) for SimpleSplitLayout

## Integration with Page Builder

The shared layout system works seamlessly with the page builder's section system. Each section type can use these layouts internally for consistent styling:

```tsx
// In section renderer
function ProductsSectionComponent({ section }) {
  return (
    <ProductGridLayout backgroundColor={section.background_color}>
      <SectionWrapper 
        title={section.title} 
        subtitle={section.subtitle}
      >
        <GridLayout columns={section.columns} gap="md">
          {/* Product cards */}
        </GridLayout>
      </SectionWrapper>
    </ProductGridLayout>
  );
}
```

## Future Enhancements

Planned improvements:
1. **Sticky Headers**: Built-in support for sticky positioned elements
2. **Animation Support**: Fade-in, slide-in animations
3. **Print Styles**: Optimized layouts for printing
4. **Dark Mode**: Automatic dark mode support
5. **Responsive Images**: Integrated responsive image handling
6. **A/B Testing**: Layout variant testing support

## Related Documentation

- [Enhanced Split Layout Guide](./ENHANCED_SPLIT_LAYOUT_GUIDE.md)
- [Split Layout Best Practices](./SPLIT_LAYOUT_BEST_PRACTICES.md)
- [Page Builder Documentation](./PAGE_BUILDER_GUIDE.md)

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: January 2026
