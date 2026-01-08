# Demo Content Troubleshooting Guide

## Issue: Demo Content Not Appearing After Theme Installation

If you installed a theme with demo content selected but don't see pages, products, or categories, follow these steps:

### Step 1: Check Installation Logs

Check your server console/logs for installation messages. You should see:
- `[Theme Install] Installation request:` - Shows if demo content was requested
- `[Theme Install] Creating demo content for theme:` - Confirms demo content creation started
- `[Demo Content] Creating X categories/products` - Shows progress
- `[Demo Content] Created category/product:` - Shows each item created

### Step 2: Verify What Was Created

Use the verification endpoint to check what was actually created:

```bash
GET /api/themes/verify-installation
```

This will return:
- Total pages, products, and categories
- Count of published/active items
- Sample items with their status
- Homepage information

### Step 3: Check Common Issues

#### Issue: Pages Not Showing

**Possible Causes:**
1. **Status Filter**: Pages list might be filtering by status. Check if status filter is set to "All Statuses"
2. **Cache**: Browser or Next.js cache might be showing old data. Try:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Add `?refresh=true` to the pages URL
3. **Database Issue**: Pages might not have been created. Check server logs for errors

**Solution:**
- Go to Pages → Check status filter (should be "All Statuses" or "Published")
- Try refreshing the page
- Check server logs for `[Theme Install] Homepage created` messages

#### Issue: Products Not Showing

**Possible Causes:**
1. **Status Filter**: Products must have `status: 'active'` to appear
2. **Category Missing**: Products require categories. If category creation failed, products won't be created
3. **Database Constraint**: Foreign key constraint might prevent product creation

**Solution:**
- Check Products page - ensure no status filter is applied
- Verify categories exist first (Products need categories)
- Check server logs for `[Demo Content] Error creating category/product` messages

#### Issue: Categories Not Showing

**Possible Causes:**
1. **Status Filter**: Categories must have `status: 'active'`
2. **Database Error**: Category creation might have failed silently

**Solution:**
- Check Categories page
- Verify in database: `SELECT * FROM categories WHERE tenant_id = 'your-tenant-id'`
- Check server logs for category creation errors

### Step 4: Re-run Demo Content Creation

If content wasn't created, you can manually trigger it:

1. **Via API** (for developers):
   ```typescript
   // Call createDemoContent directly
   import { createDemoContent } from '@/lib/themes/demo-content';
   const result = await createDemoContent(prisma, tenantId, 'grocery');
   ```

2. **Re-install Theme** (for users):
   - Go to Themes page
   - Click "Switch" on the theme (if already installed)
   - Or uninstall and reinstall with demo content option

### Step 5: Check Database Directly

If you have database access, verify content exists:

```sql
-- Check pages
SELECT id, title, slug, status, created_at 
FROM pages 
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC;

-- Check products
SELECT id, name, slug, status, category_id, created_at 
FROM products 
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC;

-- Check categories
SELECT id, name, slug, status, created_at 
FROM categories 
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC;
```

### Common Error Messages

#### "Error creating category: unique constraint violation"
- **Cause**: Category with same slug already exists
- **Solution**: Demo content will skip duplicate categories and continue

#### "Error creating product: foreign key constraint"
- **Cause**: Category doesn't exist (category creation failed)
- **Solution**: Check category creation logs first

#### "Error creating demo content: [database error]"
- **Cause**: Database connection or permission issue
- **Solution**: Check database connection and tenant permissions

### Debugging Tips

1. **Enable Detailed Logging**: Check server console for `[Theme Install]` and `[Demo Content]` messages
2. **Check Response**: After installation, check the API response for:
   - `demo_content_created: true/false`
   - `demo_categories_created: number`
   - `demo_products_created: number`
3. **Verify Tenant Context**: Ensure you're checking content for the correct tenant
4. **Check Status Values**: Ensure pages are `published` and products/categories are `active`

### Expected Results

After successful installation with demo content for **Grocery Theme**, you should have:

- **Pages**: 
  - 1 Homepage (slug: `home`, status: `published`)
  - 3 Additional pages (About, Contact, Shop - all `published`)

- **Categories**: 
  - 6 Categories (Fresh Produce, Dairy & Eggs, Meat & Seafood, Bakery, Beverages, Snacks - all `active`)

- **Products**: 
  - ~12-15 Products (all `active`, assigned to categories)

### Still Not Working?

1. Check server logs for detailed error messages
2. Use the verification endpoint: `/api/themes/verify-installation`
3. Check database directly to see if content exists but isn't visible
4. Try re-installing the theme with demo content
5. Contact support with:
   - Server logs from installation
   - Verification endpoint response
   - Database query results
