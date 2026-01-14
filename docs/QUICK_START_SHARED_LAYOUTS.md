# Quick Start: Shared Storefront Layouts
# Quick Start Guide

## 5-Minute Getting Started Guide

### Installation
No installation needed! Components are already available in your project.

## Basic Usage

### 1. Simple Page Layout

```tsx
import SharedStorefrontLayout from '@/components/storefront/shared-layout';

export default function MyPage() {
  return (
    <SharedStorefrontLayout>
      <h1>My Page Title</h1>
      <p>Content goes here...</p>
    </SharedStorefrontLayout>
  );
}
```

### 2. Product Grid

```tsx
import { ProductGridLayout, GridLayout } from '@/components/storefront/shared-layout';

export default function ProductsPage({ products }) {
  return (
    <ProductGridLayout>
      <h1 className="text-3xl font-bold mb-8">Our Products</h1>
      <GridLayout columns={4} gap="md">
        {products.map(product => (
          <ProductCard key={product.id} {...product} />
        ))}
      </GridLayout>
    </ProductGridLayout>
  );
}
```

### 3. Split Layout

```tsx
import { SimpleSplitLayout } from '@/components/storefront/shared-layout';

export default function AboutPage() {
  return (
    <SimpleSplitLayout
      ratio="60-40"
      leftColumn={
        <div>
          <h1>About Us</h1>
          <p>Our story...</p>
        </div>
      }
      rightColumn={
        <img src="/team.jpg" alt="Our team" />
      }
    />
  );
}
```

## Page Builder Usage

### Creating Enhanced Split Layout

1. **Access Page Builder**
   ```
   Dashboard → Pages → Edit Page → Add Section → Split Layout
   ```

2. **Configure Layout**
   - Choose ratio: 60/40 (recommended for hero + products)
   - Mobile: Stack vertically
   - Desktop: Normal order

3. **Left Side Setup**
   - Type: Banner
   - Upload hero image
   - Title: "Summer Sale"
   - Subtitle: "Up to 50% Off"
   - CTA: "Shop Now" → /products
   - Overlay: 40%

4. **Right Side Setup**
   - Type: Products
   - Category: Featured
   - Limit: 4 products
   - Columns: 2

5. **Save & Publish**

## Common Patterns

### Pattern 1: Homepage Hero
```tsx
<HeroLayout backgroundColor="#f9fafb">
  <div className="text-center">
    <h1 className="text-5xl font-bold mb-4">Welcome!</h1>
    <Button size="lg">Shop Now</Button>
  </div>
</HeroLayout>
```

### Pattern 2: Category Page
```tsx
<SimpleSplitLayout
  ratio="70-30"
  leftColumn={<ProductGrid />}
  rightColumn={<Filters />}
/>
```

### Pattern 3: Blog Post
```tsx
<NarrowContentLayout>
  <article>
    <h1>{post.title}</h1>
    <div dangerouslySetInnerHTML={{ __html: post.content }} />
  </article>
</NarrowContentLayout>
```

## Available Components

| Component | Use Case | Import |
|-----------|----------|--------|
| `SharedStorefrontLayout` | Base layout | `from '@/components/storefront/shared-layout'` |
| `HeroLayout` | Hero sections | Same |
| `ContentLayout` | Content pages | Same |
| `ProductGridLayout` | Product grids | Same |
| `GridLayout` | Responsive grids | Same |
| `SimpleSplitLayout` | Two columns | Same |
| `SectionWrapper` | Section headers | Same |

## Props Quick Reference

### SharedStorefrontLayout
```tsx
maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
paddingTop?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
paddingBottom?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
backgroundColor?: string
backgroundGradient?: string
```

### GridLayout
```tsx
columns?: 1 | 2 | 3 | 4 | 6
gap?: 'sm' | 'md' | 'lg'
```

### SimpleSplitLayout
```tsx
ratio?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70'
gap?: 'sm' | 'md' | 'lg' | 'xl'
stackOnMobile?: boolean
leftColumn: ReactNode
rightColumn: ReactNode
```

## Need Help?

📚 **Full Documentation**: 
- [Shared Layout System](./SHARED_LAYOUT_SYSTEM.md)
- [Enhanced Split Layout Guide](./ENHANCED_SPLIT_LAYOUT_GUIDE.md)
- [Best Practices](./SPLIT_LAYOUT_BEST_PRACTICES.md)

🐛 **Troubleshooting**: See troubleshooting sections in full documentation

💡 **Examples**: Check `/docs/SHARED_LAYOUT_SYSTEM.md` for 10+ complete examples

---

**That's it!** You're ready to build beautiful, consistent storefront pages. 🚀
