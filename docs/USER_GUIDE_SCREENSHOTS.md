# User Guide Screenshots Guide

**How to capture and use screenshots for the user guide**

---

## Quick Start

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, run the screenshot script:**
   ```bash
   npm run screenshots:user-guide
   ```

3. **Screenshots will be saved to:** `public/images/user-guide/`

---

## Prerequisites

### Environment Variables

Create or update `.env.local` with:

```env
# Base URL (usually localhost:3000 for development)
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# Tenant subdomain for testing
# Use full domain if testing on production: teststore.dukanest.com
# Or just subdomain for localhost: teststore
TEST_TENANT_SUBDOMAIN=teststore
```

### Setup

1. **Ensure you have a test tenant:**
   - Create a tenant via `/register` or admin dashboard
   - Make sure it has some products, orders, etc. for better screenshots

2. **Install Playwright browsers** (if not already installed):
   ```bash
   npm run playwright:install
   ```

---

## Screenshots Captured

The script captures the following screenshots:

1. **homepage.png** - Homepage with featured products
2. **signup-page.png** - Customer registration form
3. **login-page.png** - Customer login page
4. **products-listing.png** - Product listing with filters
5. **product-detail.png** - Product detail page with images
6. **shopping-cart.png** - Shopping cart with items
7. **checkout-page.png** - Checkout form
8. **account-dashboard.png** - Customer account dashboard
9. **order-history.png** - Order history page
10. **wishlist.png** - Wishlist page (if available)
11. **support-ticket-form.png** - Support ticket creation form
12. **help-page.png** - User guide help page

---

## Using the Screenshots

### Automatic Integration

The screenshots are automatically used in the user guide page at `/help`. The component at `src/app/help/user-guide-content.tsx` has placeholder divs that you can replace with actual images.

### Manual Integration

Replace the placeholder divs in `user-guide-content.tsx`:

**Before:**
```tsx
<div className="bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
  <p className="text-gray-500 mb-2">📸 Screenshot: Sign Up Page</p>
  <p className="text-sm text-gray-400">Add screenshot of registration form here</p>
</div>
```

**After:**
```tsx
<Image
  src="/images/user-guide/signup-page.png"
  alt="Customer Registration Page"
  width={800}
  height={600}
  className="rounded-lg border border-gray-300 shadow-md"
/>
```

Don't forget to import Image:
```tsx
import Image from 'next/image';
```

---

## Customizing Screenshots

### Modify Screenshot Config

Edit `scripts/capture-user-guide-screenshots.ts` to:

1. **Add more screenshots:**
   ```typescript
   {
     name: 'new-page',
     url: '/new-page',
     description: 'Description of the page',
     waitForSelector: 'h1',
     fullPage: true,
   }
   ```

2. **Change viewport size:**
   ```typescript
   viewport: { width: 1280, height: 720 }, // Mobile size
   ```

3. **Change screenshot options:**
   ```typescript
   fullPage: false, // Only visible area
   ```

### Taking Manual Screenshots

You can also use Playwright's UI mode to take manual screenshots:

```bash
# Open Playwright UI
npm run test:e2e:ui

# Or use codegen to interact with the page
npx playwright codegen http://localhost:3000
```

Then in the browser:
```typescript
await page.screenshot({ path: 'screenshot.png', fullPage: true });
```

---

## Tips for Better Screenshots

1. **Add test data:**
   - Create sample products with images
   - Create sample orders
   - Add items to cart
   - Create wishlist items

2. **Use consistent styling:**
   - Ensure your tenant has a theme applied
   - Use consistent colors and branding

3. **Take screenshots in different states:**
   - Empty cart vs cart with items
   - No orders vs orders with history
   - Empty wishlist vs wishlist with items

4. **Consider mobile screenshots:**
   - Take screenshots at different viewport sizes
   - Mobile: 375x667
   - Tablet: 768x1024
   - Desktop: 1920x1080

---

## Troubleshooting

### Screenshots not capturing

**Issue:** Script runs but no screenshots saved

**Solutions:**
- Check that `public/images/user-guide/` directory exists
- Verify dev server is running
- Check that tenant URL is accessible
- Review console output for errors

### Wrong pages captured

**Issue:** Screenshots show wrong content or errors

**Solutions:**
- Verify tenant exists and is accessible
- Check that test data exists (products, orders, etc.)
- Ensure you're logged in if pages require authentication
- Review URL construction in script

### Product detail screenshot missing

**Issue:** Product detail screenshot not captured

**Solutions:**
- Ensure tenant has at least one product
- Check that products page is accessible
- Verify product links are working
- The script will skip if no products are found

---

## Alternative: Manual Screenshots

If you prefer to take screenshots manually:

1. **Use browser DevTools:**
   - Open page in browser
   - Press F12 to open DevTools
   - Use browser's screenshot feature
   - Or use extensions like "Full Page Screen Capture"

2. **Use Playwright UI:**
   ```bash
   npm run test:e2e:ui
   ```
   - Navigate to pages
   - Use screenshot feature in UI

3. **Use command line:**
   ```bash
   npx playwright screenshot http://localhost:3000/help public/images/user-guide/help-page.png
   ```

---

## Related Documentation

- [User Guides](./USER_GUIDES.md)
- [E2E Testing Guide](./DAY_41_43_TESTING.md)
- [Playwright Documentation](https://playwright.dev/docs/screenshots)

---

**Last Updated:** 2024

