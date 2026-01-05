# Demo Stores Guide

**Last Updated:** 2024

---

## Overview

Demo stores are pre-configured tenant stores with sample data that showcase the platform's features. They are perfect for:

- **Marketing:** Show potential customers what the platform can do
- **Testing:** Allow users to explore features without creating their own store
- **Demonstrations:** Use in sales presentations and onboarding

---

## Features

### ✅ What Demo Stores Include:

1. **Pre-populated Sample Data:**
   - 8 sample products across 4 categories (Electronics, Fashion, Home & Living, Sports)
   - Sample blog posts and pages
   - Realistic product descriptions and pricing

2. **Read-Only for Visitors:**
   - No real purchases can be made
   - Cart functionality works but checkout is blocked
   - All data is for demonstration purposes only

3. **Auto-Seeding:**
   - Demo data is automatically created when a demo store is created
   - Can be reset to original state anytime

4. **No Expiration:**
   - Demo stores never expire (no `expire_date`)
   - Always active for showcasing

5. **Visual Indicators:**
   - "Demo" badge in admin tenant list
   - Demo banner on storefront (optional)
   - Clear messaging that it's a demo

---

## Creating a Demo Store

### Via Admin Dashboard

1. Go to **Admin Dashboard** → **Tenants** → **Create Tenant**
2. Fill in tenant information:
   - Store Name
   - Subdomain
   - Admin account details
   - Contact email
3. **Check "Create as Demo Store"** checkbox
4. Click **Create Tenant**

The system will:
- Create the tenant without a subscription plan
- Set `expire_date` to `null` (never expires)
- Mark tenant as demo in `data.isDemo = true`
- Automatically seed with sample products, categories, and content

---

## Demo Store Restrictions

### What's Blocked:

1. **Checkout/Purchases:**
   - API endpoint `/api/checkout` blocks purchases on demo stores
   - Error message: "Purchases is not allowed on demo stores"

2. **Data Modifications (Optional):**
   - Can be extended to block product edits, order creation, etc.
   - Currently only checkout is restricted

### What Works:

- ✅ Browsing products
- ✅ Viewing categories
- ✅ Adding items to cart (for demonstration)
- ✅ Viewing blog posts and pages
- ✅ All read-only features

---

## Managing Demo Stores

### View Demo Stores

1. Go to **Admin Dashboard** → **Tenants**
2. Demo stores are marked with a purple **"Demo"** badge
3. Filter or search to find specific demo stores

### Reset Demo Store

1. Go to **Admin Dashboard** → **Tenants**
2. Find the demo store you want to reset
3. Click the **Reset** button (circular arrow icon)
4. Confirm the reset action

**What happens when reset:**
- All products are deleted
- All categories are deleted
- All orders are deleted
- All cart items are deleted
- All customers are deleted
- All blogs and pages are deleted
- Fresh demo data is re-seeded

### Delete Demo Store

Same as regular tenant deletion:
1. Go to **Admin Dashboard** → **Tenants**
2. Click **Delete** button
3. Confirm deletion

---

## Demo Store Showcase

### Public Showcase Page

**URL:** `/demo-stores`

Displays all active demo stores for visitors to explore:
- Store name and theme
- Direct link to visit the store
- Visual cards with store information

### Adding to Marketing Site

Add a link to the demo stores page in your marketing site navigation:

```tsx
<Link href="/demo-stores">View Demo Stores</Link>
```

---

## Sample Data Included

### Categories (4):
- Electronics
- Fashion
- Home & Living
- Sports

### Products (8):
1. Wireless Bluetooth Headphones - $129.99
2. Smart Watch Pro - $299.99
3. Classic Denim Jacket - $79.99
4. Leather Crossbody Bag - $149.99
5. Modern Coffee Table - $249.99
6. Yoga Mat Premium - $39.99
7. Running Shoes Pro - $119.99
8. Portable Phone Charger - $29.99

### Content:
- 1 sample blog post: "Welcome to Our Demo Store"
- 1 sample page: "About Us"

---

## API Endpoints

### GET /api/demo-stores
**Public endpoint** - Get all demo stores for showcase

**Response:**
```json
{
  "demoStores": [
    {
      "id": "uuid",
      "name": "Demo Store Name",
      "subdomain": "demo-store",
      "url": "https://demo-store.dukanest.com",
      "theme_slug": "modern",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### POST /api/admin/demo-stores/reset
**Landlord only** - Reset a demo store to original state

**Body:**
```json
{
  "tenantId": "uuid"
}
```

**Response:**
```json
{
  "message": "Demo store reset successfully",
  "tenantId": "uuid"
}
```

---

## Best Practices

### 1. **Create Multiple Demo Stores**
- Create demo stores with different themes
- Showcase different industries (fashion, electronics, groceries)
- Demonstrate various use cases

### 2. **Regular Resets**
- Reset demo stores weekly or monthly
- Keeps data fresh and prevents clutter
- Ensures consistent demo experience

### 3. **Clear Messaging**
- Always indicate that stores are demos
- Use banners and badges consistently
- Explain limitations to visitors

### 4. **Monitor Usage**
- Track which demo stores get the most visits
- Use analytics to understand user behavior
- Optimize demo content based on feedback

### 5. **Keep Updated**
- Update sample products to reflect current trends
- Refresh content periodically
- Ensure demo stores showcase latest features

---

## Technical Implementation

### Database Schema

Demo stores are identified by the `data.isDemo` flag in the `tenants` table:

```json
{
  "theme": "light",
  "isDemo": true
}
```

### Seeding Logic

Located in: `src/lib/demo-store/seed-demo-data.ts`

- Creates categories first
- Then creates products linked to categories
- Adds sample blog posts and pages
- Uses realistic product data

### Restrictions

Located in: `src/lib/demo-store/restrictions.ts`

- `requireNotDemoStore()` - Throws error if action attempted on demo store
- `checkIsDemoStore()` - Returns boolean check
- Used in checkout API to prevent purchases

---

## Troubleshooting

### Demo Store Not Seeding

**Issue:** Demo store created but no products appear

**Solutions:**
1. Check server logs for seeding errors
2. Verify tenant was created with `isDemo: true` in data field
3. Manually trigger seeding via API or script

### Reset Not Working

**Issue:** Reset button doesn't work or fails

**Solutions:**
1. Check browser console for errors
2. Verify user has landlord role
3. Check API endpoint logs
4. Ensure tenant is actually a demo store

### Demo Store Expired

**Issue:** Demo store shows as expired

**Solution:**
- Demo stores should have `expire_date = null`
- Check tenant record in database
- Update if needed: `UPDATE tenants SET expire_date = NULL WHERE id = 'tenant-id'`

---

## Summary

| Feature | Status |
|---------|--------|
| **Create Demo Store** | ✅ Via form checkbox |
| **Auto-Seed Data** | ✅ Automatic on creation |
| **Demo Badge** | ✅ Shown in admin list |
| **Reset Functionality** | ✅ Reset button in admin |
| **Purchase Blocking** | ✅ Checkout API restricted |
| **Showcase Page** | ✅ `/demo-stores` public page |
| **No Expiration** | ✅ `expire_date = null` |

---

**Last Updated:** 2024

