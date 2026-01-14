# Sales Price Behavior Documentation

## Overview
This document explains how sale prices work in StoreFlow, including what happens when sales end.

## How Sale Prices Work

### 1. **Sale Price Sources**
Products can have sale prices from two sources:
- **Product's own `sale_price` field**: A general sale price set directly on the product
- **Sale-specific pricing (`product_sales.sale_price`)**: Pricing from active sales campaigns

### 2. **Priority Order**
When displaying prices, the system uses this priority:
1. **Sale-specific price** (`product_sales.sale_price`) - if product is in an active sale
2. **Product's sale_price** - if product has a general sale price set
3. **Regular price** (`product.price`) - default price

### 3. **What Happens When a Sale Ends**

When a sale reaches its `end_date`:

1. **Sale Status Changes**:
   - The sale's `status` is automatically changed from `'active'` to `'ended'` by the automation cron job
   - This happens within 15 minutes of the sale's end date (cron runs every 15 minutes)

2. **Sale Price Display**:
   - Products **automatically stop showing sale prices** because:
     - The product detail page only queries **active sales** when fetching sale pricing
     - Once a sale is `'ended'`, it's no longer considered active
     - The product reverts to showing its regular price (or product's own `sale_price` if set)

3. **Data Persistence**:
   - `product_sales` records **remain in the database** for historical purposes
   - Sale prices are **NOT automatically deleted** - they remain for:
     - Historical records
     - Future sales (can reuse the same sale)
     - Analytics and reporting
   - The product's own `sale_price` field (if set) **remains unchanged**

4. **Automatic Behavior**:
   - No manual intervention needed
   - Products automatically show correct prices based on active sales
   - Sale prices "disappear" from the storefront when sales end

## Example Scenarios

### Scenario 1: Product in Active Sale
- Product regular price: $100
- Product in "Black Friday" sale with sale price: $80
- **Displayed price**: $80 (sale price)
- **Original price**: $100 (shown with strikethrough)

### Scenario 2: Sale Ends
- Sale status changes to `'ended'`
- Product detail page queries only active sales
- **Displayed price**: $100 (regular price)
- Sale price is no longer shown

### Scenario 3: Product with Both Sale Price and Active Sale
- Product regular price: $100
- Product's own `sale_price`: $90
- Product in active sale with `sale_price`: $80
- **Displayed price**: $80 (sale-specific price takes priority)
- **Original price**: $100 (shown with strikethrough)

### Scenario 4: Product with Sale Price but No Active Sale
- Product regular price: $100
- Product's own `sale_price`: $90
- No active sales
- **Displayed price**: $90 (product's sale price)
- **Original price**: $100 (shown with strikethrough)

## Technical Implementation

### Product Detail Page
The product detail page (`/products/[slug]`) fetches active sales for the product:

```typescript
// Fetches active sales for product
const activeProductSales = await prisma.product_sales.findFirst({
  where: {
    product_id: product.id,
    sales: {
      status: 'active',
      // Check dates to ensure sale is currently active
    },
  },
});

// Uses sale price if available, otherwise falls back to product.sale_price
const effectiveSalePrice = activeProductSales?.sale_price || product.sale_price;
```

### Automation Cron Job
The sales automation cron job (`/api/admin/sales/automate`) runs every 15 minutes:
- Activates sales when `start_date` is reached
- Deactivates sales when `end_date` is passed
- Updates sale status to `'ended'`

## Best Practices

1. **Use Sale-Specific Pricing**: Prefer adding products to sales rather than setting product `sale_price` directly
   - Allows multiple sales with different prices
   - Automatic expiration when sale ends
   - Better organization and tracking

2. **Set Clear End Dates**: Always set `end_date` for time-limited sales
   - Ensures sales automatically end
   - Prevents accidental long-running sales

3. **Monitor Active Sales**: Regularly check active sales in the dashboard
   - Ensure sales end as expected
   - Verify products show correct prices

4. **Historical Records**: Keep `product_sales` records for analytics
   - Track which products were in which sales
   - Analyze sale performance
   - Reuse sale configurations

## FAQ

**Q: Do I need to manually remove products from ended sales?**
A: No. Products automatically stop showing sale prices when sales end. The records remain for historical purposes but don't affect pricing.

**Q: What if I want to clear sale prices after a sale ends?**
A: Currently, sale prices remain in the database. If you need to clear them, you can:
- Manually remove products from ended sales in the dashboard
- Or create a cleanup script to remove `product_sales` records for ended sales

**Q: Can a product be in multiple active sales?**
A: Yes, but the system will use the most recent sale price (ordered by `created_at`).

**Q: What happens to the product's own `sale_price` field?**
A: It remains unchanged. It's separate from sale-specific pricing and can be used for general sales or as a fallback.
