# Product Variant System Comparison

## Current StoreFlow Implementation vs Vendure Model

### Current StoreFlow Schema

```prisma
// Attributes (e.g., "Color", "Size", "Weight")
model attributes {
  id        String
  tenant_id String
  name      String  // "Color", "Size", "Weight"
  slug      String?
  type      String? // 'color', 'size', 'text', etc.
}

// Attribute Values (e.g., "Red", "Small", "500g")
model attribute_values {
  id           String
  tenant_id    String
  attribute_id String  // Links to attributes
  value        String  // "Red", "Small", "500g"
  color_code   String? // For color attributes (hex code)
}

// Product Variants
model product_variants {
  id                 String
  tenant_id          String
  product_id         String
  attribute_id       String?  // ⚠️ ONLY ONE attribute per variant
  attribute_value_id String?  // ⚠️ ONLY ONE value per variant
  price              Decimal?
  stock_quantity     Int?
  sku                String?
  image              String?
}
```

### Vendure Model (Reference: https://docs.vendure.io/guides/core-concepts/products/)

```
Product
  └── ProductVariant (has price, stock, SKU)
      └── ProductOptionGroup (e.g., "Size", "Color")
          └── ProductOption (e.g., "Small", "Medium", "Large")
```

**Key Difference:**
- **Vendure**: A variant can have **MULTIPLE** option groups (Size + Color + Weight)
- **StoreFlow**: A variant can have **ONLY ONE** attribute (either Size OR Color, not both)

### Example: T-Shirt Product

#### Vendure Approach ✅
```
Product: "T-Shirt"
  Variant 1: Size=Small, Color=Red, Weight=200g
  Variant 2: Size=Small, Color=Blue, Weight=200g
  Variant 3: Size=Medium, Color=Red, Weight=220g
  Variant 4: Size=Medium, Color=Blue, Weight=220g
```

#### Current StoreFlow Approach ⚠️
```
Product: "T-Shirt"
  Variant 1: attribute="Size", value="Small"     // Can't add Color!
  Variant 2: attribute="Color", value="Red"      // Can't add Size!
  Variant 3: attribute="Weight", value="200g"    // Can't combine!
```

**Problem:** You cannot create a variant that is both "Small" AND "Red" - you'd need separate products or a workaround.

### What's Missing in Current Implementation

1. **Multiple Attributes per Variant**
   - Currently: 1 attribute per variant
   - Needed: Multiple attributes (Size + Color + Weight, etc.)

2. **Variant Display Name**
   - Currently: No way to show "Small - Red" as variant name
   - Needed: Auto-generated variant name from attributes

3. **Attribute Groups/Options**
   - Currently: Flat structure (attributes → values)
   - Vendure: Option Groups → Options (more structured)

4. **Variant Matrix Generation**
   - Currently: Manual creation of each variant
   - Vendure: Can generate all combinations automatically

### Recommended Solution

#### Option 1: Add Variant Attributes Junction Table (Recommended)

```prisma
// New table to support multiple attributes per variant
model product_variant_attributes {
  id                 String
  tenant_id          String
  variant_id         String
  attribute_id       String
  attribute_value_id String
  
  // Relations
  product_variants   product_variants @relation(...)
  attributes         attributes @relation(...)
  attribute_values   attribute_values @relation(...)
  
  @@unique([variant_id, attribute_id]) // One value per attribute per variant
}
```

**Benefits:**
- ✅ Supports multiple attributes per variant
- ✅ Backward compatible (existing variants still work)
- ✅ Flexible (can add/remove attributes per variant)

#### Option 2: JSON Field (Simpler but less queryable)

```prisma
model product_variants {
  // ... existing fields ...
  attributes Json? // [{"attribute_id": "...", "attribute_value_id": "..."}]
}
```

**Benefits:**
- ✅ Quick to implement
- ❌ Harder to query/filter
- ❌ No referential integrity

### Comparison Table

| Feature | Current StoreFlow | Vendure | Recommended Fix |
|---------|------------------|---------|-----------------|
| Attributes per variant | 1 | Multiple | Add junction table |
| Variant name | None | Auto-generated | Generate from attributes |
| Attribute types | Basic (color, size, text) | Structured (OptionGroups) | Keep current, add grouping |
| Variant matrix | Manual | Automatic | Add helper function |
| Query variants by attribute | Limited | Full support | Junction table enables this |

### Example: How It Should Work

#### Creating a Product with Variants

**Step 1: Create Attributes**
```
Attribute: "Size" → Values: ["Small", "Medium", "Large"]
Attribute: "Color" → Values: ["Red", "Blue", "Green"]
```

**Step 2: Create Product**
```
Product: "Hoodie"
```

**Step 3: Create Variants (with multiple attributes)**
```
Variant 1:
  - Size: Small
  - Color: Red
  - Price: $29.99
  - Stock: 10

Variant 2:
  - Size: Small
  - Color: Blue
  - Price: $29.99
  - Stock: 5

Variant 3:
  - Size: Medium
  - Color: Red
  - Price: $31.99
  - Stock: 8
```

**Step 4: Display**
```
Variant name: "Small - Red" (auto-generated)
SKU: "HOODIE-SM-RED" (auto-generated)
```

### Implementation Priority

1. **High Priority:**
   - Add `product_variant_attributes` junction table
   - Update variant creation API to accept multiple attributes
   - Update variant display to show attribute combinations

2. **Medium Priority:**
   - Add variant name generation (e.g., "Small - Red")
   - Add variant matrix generator (create all combinations)
   - Update UI to support multiple attribute selection

3. **Low Priority:**
   - Add attribute grouping (like Vendure's OptionGroups)
   - Add attribute ordering/priority
   - Add variant image per attribute combination

### References

- [Vendure Products Documentation](https://docs.vendure.io/guides/core-concepts/products/)
- Current StoreFlow Schema: `prisma/schema.prisma`
- Current Variant API: `src/app/api/products/[id]/variants/route.ts`

