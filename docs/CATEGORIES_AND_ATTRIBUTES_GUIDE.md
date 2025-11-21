# Categories and Attributes Management Guide

## Overview

This guide explains how categories and attributes work in StoreFlow, and how they relate to products and tenants.

## Categories

### What are Categories?

Categories are used to organize products into groups. Examples:
- **Electronics** → **Laptops**, **Phones**, **Accessories**
- **Clothing** → **Men's**, **Women's**, **Kids'**
- **Food** → **Beverages**, **Snacks**, **Dairy**

### Are Categories Tenant-Specific?

**Yes!** Categories are **tenant-specific**. Each tenant has their own set of categories.

- **Database Schema**: Categories have a `tenant_id` field
- **Isolation**: Each tenant can only see and manage their own categories
- **Independence**: Tenant A's categories are completely separate from Tenant B's categories

### Where to Manage Categories

1. **Navigate to Categories:**
   - Go to Dashboard → **Categories** (in the sidebar)
   - Or visit: `/dashboard/categories`

2. **Create a Category:**
   - Click **"Add Category"** button
   - Fill in:
     - Category Name (required)
     - Parent Category (optional - for subcategories)
     - Status (Active/Inactive)
     - Category Image (optional)

3. **Edit a Category:**
   - Click the edit icon (pencil) next to a category
   - Update the information
   - Save changes

4. **Delete a Category:**
   - Click the delete icon (trash) next to a category
   - Confirm deletion
   - **Note**: Cannot delete if category has subcategories or is used by products

### Category Hierarchy

Categories support parent-child relationships:
- **Top-level categories**: No parent (e.g., "Electronics")
- **Subcategories**: Have a parent (e.g., "Laptops" under "Electronics")

Example structure:
```
Electronics (top-level)
  └── Laptops (subcategory)
  └── Phones (subcategory)
      └── Smartphones (sub-subcategory)
```

## Attributes

### What are Attributes?

Attributes define product variant options. Examples:
- **Size**: Small, Medium, Large, XL
- **Color**: Red, Blue, Green (with color swatches or images)
- **Weight**: 200g, 500g, 1kg
- **Material**: Cotton, Polyester, Silk

### Are Attributes Tenant-Specific?

**Yes!** Attributes are **tenant-specific**, just like categories.

- **Database Schema**: Attributes have a `tenant_id` field
- **Isolation**: Each tenant manages their own attributes
- **Reusability**: Once created, attributes can be used across multiple products

### Where to Manage Attributes

1. **Navigate to Attributes:**
   - Go to Dashboard → **Settings** → **Attributes**
   - Or visit: `/dashboard/settings/attributes`

2. **Create an Attribute:**
   - Click **"Add Attribute"** button
   - Fill in:
     - Attribute Name (e.g., "Size", "Color")
     - Attribute Type (Text, Color, Size, Number)
   - Add Attribute Values (e.g., "Small", "Medium", "Large")
   - For Color attributes:
     - Add color code (hex: #FF0000)
     - Upload color image (optional - for product images in that color)

3. **Edit an Attribute:**
   - Click the edit icon (pencil) next to an attribute
   - Update name, type, or values
   - Save changes

4. **Delete an Attribute:**
   - Click the delete icon (trash) next to an attribute
   - Confirm deletion
   - **Warning**: This will remove all attribute values and variant associations

### Color Attributes with Images

For color attributes, you can add:
1. **Color Code** (hex): `#FF0000` for red
2. **Color Image** (optional): Upload an image showing the product in that color

**Best Practice:**
- Use color code for simple color swatches
- Use images for complex colors or when you want to show the actual product in that color
- Images are particularly useful for fashion/apparel where color can vary

**Example:**
- Color: "Navy Blue"
- Color Code: `#000080`
- Image: `navy-blue-hoodie.jpg` (shows the hoodie in navy blue)

### Using Attributes in Product Variants

1. **Create a Product**
2. **Add Variants** section
3. **Add Attributes** to each variant:
   - Click **"Add Attribute"** button
   - Select an attribute (e.g., "Size")
   - Select a value (e.g., "Large")
   - Repeat for multiple attributes (e.g., Size + Color + Weight)
4. **Variant Name** auto-generates: "Large - Red - 500g"

## Comparison: Categories vs Attributes

| Feature | Categories | Attributes |
|---------|-----------|------------|
| **Purpose** | Organize products | Define variant options |
| **Scope** | Product-level | Variant-level |
| **Example** | "Electronics" → "Laptops" | "Size: Large", "Color: Red" |
| **Hierarchy** | Yes (parent-child) | No (flat list) |
| **Tenant-specific** | Yes | Yes |
| **Used in** | Product classification | Variant creation |

## Workflow Example

### Step 1: Create Categories
1. Go to **Categories**
2. Create "Clothing" (top-level)
3. Create "Men's T-Shirts" (parent: "Clothing")

### Step 2: Create Attributes
1. Go to **Settings** → **Attributes**
2. Create "Size" attribute:
   - Type: Size
   - Values: Small, Medium, Large, XL
3. Create "Color" attribute:
   - Type: Color
   - Values: Red (#FF0000), Blue (#0000FF), Green (#00FF00)
   - Add images for each color (optional)

### Step 3: Create Product
1. Go to **Products** → **Add Product**
2. Select category: "Men's T-Shirts"
3. Add variants:
   - Variant 1: Size=Large, Color=Red
   - Variant 2: Size=Large, Color=Blue
   - Variant 3: Size=XL, Color=Red

## API Endpoints

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/categories/[id]` - Get category
- `PUT /api/categories/[id]` - Update category
- `DELETE /api/categories/[id]` - Delete category

### Attributes
- `GET /api/attributes` - List attributes
- `POST /api/attributes` - Create attribute
- `GET /api/attributes/[id]` - Get attribute
- `PUT /api/attributes/[id]` - Update attribute
- `DELETE /api/attributes/[id]` - Delete attribute
- `GET /api/attributes/[id]/values` - List attribute values
- `POST /api/attributes/[id]/values` - Create attribute value
- `PUT /api/attributes/[id]/values/[valueId]` - Update attribute value
- `DELETE /api/attributes/[id]/values/[valueId]` - Delete attribute value

## Troubleshooting

### "Add Attribute" button is disabled
**Solution**: No attributes exist yet. Click the "Go to Attributes Settings" button to create attributes first.

### Cannot delete category
**Reasons:**
- Category has subcategories (move or delete them first)
- Category is used by products (reassign products first)

### Color attribute not showing image
**Check:**
- Image was uploaded successfully
- Image URL is valid
- Attribute type is set to "color"

## Summary

- **Categories**: Tenant-specific, hierarchical, used for product organization
- **Attributes**: Tenant-specific, flat list, used for variant options
- **Both**: Managed through dedicated UI pages in the dashboard
- **Color Images**: Supported for color attributes to show products in specific colors

