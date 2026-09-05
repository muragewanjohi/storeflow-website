# Image Optimization Guide

This guide explains how to replace `<img>` tags with Next.js `<Image />` component for better performance.

## ✅ Completed Fixes

- ✅ React Hook dependency warnings (2 files)
- ✅ Storefront header component
- ✅ Default theme Hero component

## 📋 Pattern for Replacing `<img>` with `<Image />`

### Basic Pattern

**Before:**
```tsx
<img 
  src={imageUrl} 
  alt="Description"
  className="w-full h-auto"
/>
```

**After:**
```tsx
<div className="relative w-full aspect-video">
  <Image
    src={imageUrl}
    alt="Description"
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
</div>
```

### With Fixed Dimensions

**Before:**
```tsx
<img 
  src={imageUrl} 
  alt="Description"
  width={200}
  height={200}
  className="rounded"
/>
```

**After:**
```tsx
<Image
  src={imageUrl}
  alt="Description"
  width={200}
  height={200}
  className="rounded"
  sizes="200px"
/>
```

### With Error Handling

**Before:**
```tsx
<img 
  src={imageUrl} 
  alt="Description"
  onError={(e) => {
    e.currentTarget.style.display = 'none';
  }}
/>
```

**After:**
```tsx
<div className="relative w-full aspect-video">
  <Image
    src={imageUrl}
    alt="Description"
    fill
    className="object-cover"
    sizes="(max-width: 768px) 100vw, 50vw"
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
  />
</div>
```

## 📝 Files Remaining to Fix

### High Priority (User-Facing)

1. **Theme Components** (Most visible to customers)
   - `src/components/themes/hexfashion/Hero.tsx`
   - `src/components/themes/hexfashion/ProductCard.tsx`
   - `src/components/themes/hexfashion/ProductDetail.tsx`
   - `src/components/themes/furniture/Homepage.tsx`
   - `src/components/themes/furniture/ProductCard.tsx`
   - `src/components/themes/furniture/ProductDetail.tsx`
   - `src/components/themes/grocery/Hero.tsx`
   - `src/components/themes/modern/Hero.tsx`
   - `src/components/themes/modern/ProductCard.tsx`
   - `src/components/themes/minimal/ProductCard.tsx`

2. **Storefront Components**
   - `src/components/storefront/product-reviews-section.tsx`

### Medium Priority (Dashboard)

3. **Dashboard Components**
   - `src/app/dashboard/products/product-form-client.tsx`
   - `src/app/dashboard/products/[id]/product-detail-client.tsx`
   - `src/app/dashboard/categories/categories-list-client.tsx`
   - `src/app/dashboard/categories/category-form-client.tsx`
   - `src/app/dashboard/customers/customers-list-client.tsx`
   - `src/app/dashboard/customers/[id]/customer-detail-client.tsx`
   - `src/app/dashboard/orders/[id]/order-detail-client.tsx`
   - `src/app/dashboard/inventory/inventory-dashboard-client.tsx`
   - `src/app/dashboard/inventory/alerts/inventory-alerts-client.tsx`
   - `src/app/dashboard/inventory/adjust/adjust-stock-client.tsx`
   - `src/app/dashboard/media/media-library-client.tsx`
   - `src/app/dashboard/themes/customize/theme-customize-client.tsx`
   - `src/app/dashboard/themes/preview/[themeId]/theme-preview-client.tsx`

4. **Support Tickets**
   - `src/app/support/tickets/[id]/customer-ticket-detail-client.tsx`
   - `src/app/dashboard/support/tickets/[id]/ticket-detail-client.tsx`
   - `src/app/dashboard/support/landlord-tickets/[id]/tenant-landlord-ticket-detail-client.tsx`
   - `src/app/admin/support/tickets/[id]/landlord-ticket-detail-client.tsx`

## 🔧 Step-by-Step Fix Process

1. **Add Import** (if not already present):
   ```tsx
   import Image from 'next/image';
   ```

2. **Identify Image Context**:
   - Is it in a fixed-size container? → Use `width` and `height` props
   - Is it in a flexible container? → Use `fill` with relative parent

3. **Replace the Tag**:
   - Wrap in `<div className="relative">` if using `fill`
   - Add appropriate `sizes` prop for responsive images
   - Use `priority` for above-the-fold images
   - Use `unoptimized` for external URLs that can't be optimized

4. **Test**:
   - Verify image loads correctly
   - Check responsive behavior
   - Ensure error handling works

## ⚠️ Special Cases

### Data URLs and Blobs
For `data:` URLs and `blob:` URLs, you may need to use `unoptimized` prop or keep using `<img>` tag (as in `image-with-fallback.tsx`).

### External Images
For external images (like Unsplash), use `unoptimized={true}` or configure `next.config.ts` with `remotePatterns`.

### Dynamic Sizes
Use the `sizes` prop to tell Next.js about responsive image sizes:
```tsx
sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
```

## 📊 Benefits

- **Automatic Optimization**: Images are automatically optimized for different devices
- **Lazy Loading**: Images load only when needed (except with `priority`)
- **Better Performance**: Smaller file sizes, faster page loads
- **Better SEO**: Improved Core Web Vitals scores
- **Responsive Images**: Automatically serves appropriate image sizes

## 🚀 Quick Fix Script

You can use find-and-replace in your editor with these patterns:

**Pattern 1: Simple img tag**
```regex
Find: <img\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+className="([^"]+)"\s*/>
Replace: <div className="relative w-full aspect-video"><Image src={$1} alt={$2} fill className="object-cover $3" sizes="100vw" /></div>
```

**Pattern 2: With width/height**
```regex
Find: <img\s+src=\{([^}]+)\}\s+alt=\{([^}]+)\}\s+width=\{(\d+)\}\s+height=\{(\d+)\}
Replace: <Image src={$1} alt={$2} width={$3} height={$4}
```

## ✅ Verification

After making changes, verify:
1. Run `npm run build` - should have fewer warnings
2. Check browser console for image errors
3. Test responsive behavior on different screen sizes
4. Verify images load correctly in production

---

**Note**: The `image-with-fallback.tsx` component intentionally uses `<img>` for error/fallback cases, which is acceptable.
