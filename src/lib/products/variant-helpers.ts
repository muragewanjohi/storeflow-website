/**
 * Variant Helper Functions
 * 
 * Utilities for working with product variants and their attributes
 */

interface VariantAttribute {
  attribute_id: string;
  attribute_value_id: string;
  attribute_name?: string;
  attribute_value?: string;
}

/**
 * Generate a variant name from its attributes
 * Example: "Small - Red - 200g" or "Medium - Blue"
 */
export function generateVariantName(attributes: VariantAttribute[]): string {
  if (!attributes || attributes.length === 0) {
    return 'Default';
  }

  // Sort attributes by name for consistent ordering
  const sorted = [...attributes].sort((a, b) => {
    const nameA = a.attribute_name || '';
    const nameB = b.attribute_name || '';
    return nameA.localeCompare(nameB);
  });

  // Join attribute values with " - "
  return sorted
    .map((attr) => attr.attribute_value || '')
    .filter((val) => val.length > 0)
    .join(' - ') || 'Default';
}

/**
 * Generate a variant SKU from product name and attributes
 * Example: "HOODIE-SM-RED" or "TSHIRT-M-BLUE-200G"
 */
export function generateVariantSKU(
  productName: string,
  attributes: VariantAttribute[],
  tenantId: string
): string {
  // Get product prefix (first 3-4 letters, uppercase)
  const productPrefix = productName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4);

  // Get attribute value codes (first 2-3 letters, uppercase)
  const attributeCodes = attributes
    .map((attr) => {
      const value = attr.attribute_value || '';
      return value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 3);
    })
    .filter((code) => code.length > 0);

  // Combine: PRODUCT-ATTR1-ATTR2-ATTR3
  const parts = [productPrefix, ...attributeCodes];
  const sku = parts.join('-');

  // Add tenant ID suffix for uniqueness (first 4 chars)
  const tenantSuffix = tenantId.substring(0, 4).toUpperCase();

  return `${sku}-${tenantSuffix}`;
}

/**
 * Format variant attributes for display
 * Returns an array of "Attribute: Value" strings
 */
export function formatVariantAttributes(attributes: VariantAttribute[]): string[] {
  if (!attributes || attributes.length === 0) {
    return [];
  }

  return attributes.map((attr) => {
    const name = attr.attribute_name || 'Attribute';
    const value = attr.attribute_value || 'Unknown';
    return `${name}: ${value}`;
  });
}

