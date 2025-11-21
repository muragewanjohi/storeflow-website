# Variant Images Best Practices

## Overview

This document explains how variant images work in StoreFlow and why they are stored at the variant level rather than the attribute value level.

## The Problem

**Incorrect Approach (What we initially had):**
- Store images in `attribute_values.image`
- Problem: A "Black" color attribute would have one image
- But a black T-shirt image is different from a black shoe image
- This makes attributes non-reusable across products

**Correct Approach (Current Implementation):**
- Store images in `product_variants.image`
- Attributes are reusable (e.g., "Black" color can be used for T-shirts, pants, shoes)
- Each variant has its own product-specific image

## How It Works

### 1. Attributes are Reusable

**Example:**
- Create "Color" attribute with value "Black"
- This "Black" can be used for:
  - T-shirt product → Black T-shirt variant
  - Shoe product → Black shoe variant
  - Pants product → Black pants variant

### 2. Variant Images are Product-Specific

**Example:**
- Product: "T-Shirt"
  - Variant: Size=Large, Color=Black
    - **Image**: `tshirt-black-large.jpg` (shows the actual black T-shirt)
  
- Product: "Sneakers"
  - Variant: Size=10, Color=Black
    - **Image**: `sneakers-black-size10.jpg` (shows the actual black sneakers)

**Same color attribute, different product images!**

## Database Schema

```prisma
// Attribute values - reusable across products
model attribute_values {
  id           String
  value        String        // "Black"
  color_code   String?       // "#000000" (for color swatches)
  image        String?       // NOT USED - kept for backward compatibility only
}

// Product variants - product-specific
model product_variants {
  id            String
  product_id    String
  image         String?      // ✅ Variant image stored here
  variant_attributes product_variant_attributes[]
}
```

## How Vendure Handles This

Based on [Vendure's documentation](https://docs.vendure.io/guides/core-concepts/products/):

1. **ProductOptionGroups** (like our Attributes) define reusable options
2. **ProductVariants** have their own images
3. Variant images are product-specific, not option-specific

**Vendure Structure:**
```
Product: "Hoodie"
  ProductVariant: Size=Small, Color=Red
    - Image: hoodie-small-red.jpg (product-specific)
  ProductVariant: Size=Small, Color=Blue
    - Image: hoodie-small-blue.jpg (product-specific)
```

## How Other Platforms Handle This

### Shopify
- **Product Options**: Reusable (Color, Size, etc.)
- **Variant Images**: Stored per variant
- Each variant can have its own image

### WooCommerce
- **Attributes**: Reusable
- **Variation Images**: Stored per variation
- Product-specific images for each variation

### Magento
- **Product Attributes**: Reusable
- **Product Images**: Stored per product/variant
- Variant images are product-specific

## Implementation in StoreFlow

### Creating a Variant with Image

1. **Create Product**: "T-Shirt"
2. **Add Variant**:
   - Select attributes: Size=Large, Color=Black
   - **Upload variant image**: `tshirt-black-large.jpg`
   - Set price, stock, SKU
3. **Result**: Variant has product-specific image

### Attribute Value Images (Deprecated)

The `image` field in `attribute_values` exists in the schema but **should not be used** for variant images. It's kept for:
- Backward compatibility
- Potential future use as reference/fallback images
- But the primary image should always be on the variant

## Best Practices

### ✅ DO:
- Store variant images in `product_variants.image`
- Make attributes reusable across products
- Upload product-specific images for each variant
- Use color codes for simple color swatches in attribute values

### ❌ DON'T:
- Store product images in attribute values
- Use the same image for all products with the same color
- Mix attribute-level images with variant-level images

## Example Workflow

### Step 1: Create Reusable Attributes
```
Attribute: "Color"
  Values:
    - Black (#000000)
    - Red (#FF0000)
    - Blue (#0000FF)
```

### Step 2: Create Products with Variants

**Product 1: "T-Shirt"**
```
Variant 1: Color=Black
  - Image: tshirt-black.jpg (T-shirt in black)
  - Price: $29.99
  - Stock: 10

Variant 2: Color=Red
  - Image: tshirt-red.jpg (T-shirt in red)
  - Price: $29.99
  - Stock: 5
```

**Product 2: "Sneakers"**
```
Variant 1: Color=Black
  - Image: sneakers-black.jpg (Sneakers in black)
  - Price: $99.99
  - Stock: 8

Variant 2: Color=Red
  - Image: sneakers-red.jpg (Sneakers in red)
  - Price: $99.99
  - Stock: 3
```

**Same "Black" and "Red" attributes, different product images!**

## UI Implementation

### Variant Form
- **Attributes Section**: Select reusable attributes (Size, Color, etc.)
- **Variant Image Section**: Upload product-specific image for this variant
- **Details Section**: Price, Stock, SKU

### Variant Display
- Shows variant image (from `product_variants.image`)
- Shows attribute badges with color swatches (from `attribute_values.color_code`)
- Variant name auto-generated from attributes

## Migration Notes

If you have existing data with images in `attribute_values.image`:
1. These images can serve as reference/fallback
2. But new variant images should be uploaded per variant
3. Consider migrating: Copy attribute value images to variants if needed

## Summary

- **Attributes**: Reusable, tenant-specific, define variant options
- **Variant Images**: Product-specific, stored per variant
- **Color Codes**: For simple swatches in attribute values
- **Best Practice**: Always upload variant images when creating variants

This approach matches how Vendure, Shopify, WooCommerce, and other major e-commerce platforms handle variant images.

