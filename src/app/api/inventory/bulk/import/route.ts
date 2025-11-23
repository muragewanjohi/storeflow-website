/**
 * Bulk Inventory CSV Import API Route
 * 
 * Parses and validates CSV file for bulk inventory updates
 * 
 * Day 17: Inventory & Stock Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const csvRowSchema = z.object({
  type: z.enum(['product', 'variant']),
  sku: z.string().min(1),
  adjustment_type: z.enum(['increase', 'decrease', 'set', 'reduce']).transform((val) => {
    // Map 'reduce' to 'decrease' for backward compatibility
    return val === 'reduce' ? 'decrease' : val;
  }),
  quantity: z.coerce.number().int().min(0),
  reason: z.string().optional(),
});

/**
 * POST /api/inventory/bulk/import
 * 
 * Parse and validate CSV file for bulk inventory updates
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a CSV file.' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse CSV (simple parser - handles quoted fields)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Parse header
    const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
    const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase().trim());

    // Validate headers
    const requiredHeaders = ['type', 'sku', 'adjustment type', 'quantity'];
    const missingHeaders = requiredHeaders.filter(
      (req) => !headers.some((h) => h.includes(req.toLowerCase()))
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingHeaders.join(', ')}`,
          expectedHeaders: ['Type', 'SKU', 'Adjustment Type', 'Quantity', 'Reason (optional)'],
        },
        { status: 400 }
      );
    }

    // Find column indices
    const typeIndex = headers.findIndex((h) => h.includes('type') && !h.includes('adjustment'));
    const skuIndex = headers.findIndex((h) => h.includes('sku'));
    const adjustmentTypeIndex = headers.findIndex((h) => h.includes('adjustment'));
    const quantityIndex = headers.findIndex((h) => h.includes('quantity'));
    const reasonIndex = headers.findIndex((h) => h.includes('reason'));

    // Validate that required columns were found
    if (typeIndex === -1 || skuIndex === -1 || adjustmentTypeIndex === -1 || quantityIndex === -1) {
      return NextResponse.json(
        {
          error: 'Missing required columns in CSV header',
          foundHeaders: headers,
          expectedHeaders: ['Type', 'SKU', 'Adjustment Type', 'Quantity', 'Reason (optional)'],
        },
        { status: 400 }
      );
    }

    // Parse data rows
    const parsedRows: any[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = parseCSVLine(line);

        const rowData = {
          type: values[typeIndex]?.toLowerCase().trim() || '',
          sku: values[skuIndex]?.trim() || '',
          adjustment_type: values[adjustmentTypeIndex]?.toLowerCase().trim() || '',
          quantity: values[quantityIndex]?.trim() || '',
          reason: reasonIndex >= 0 ? values[reasonIndex]?.trim() : undefined,
        };

        // Validate row
        const validated = csvRowSchema.parse(rowData);
        parsedRows.push(validated);
      } catch (error) {
        let errorMessage = 'Invalid row format';
        if (error instanceof z.ZodError && error.errors && error.errors.length > 0) {
          errorMessage = error.errors[0].message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        errors.push({
          row: i + 1,
          error: errorMessage,
          data: parseCSVLine(line),
        });
      }
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid rows found in CSV file',
          errors,
        },
        { status: 400 }
      );
    }

    // Helper function to check if a string is a valid UUID
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Resolve SKUs to IDs
    const updates: any[] = [];
    const resolutionErrors: Array<{ row: number; sku: string; error: string }> = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        if (row.type === 'product') {
          // Build where clause - try SKU first, then ID if it looks like a UUID
          const whereClause: any = {
            tenant_id: tenant.id,
          };

          if (isValidUUID(row.sku)) {
            // If it's a UUID, try both SKU and ID
            whereClause.OR = [{ sku: row.sku }, { id: row.sku }];
          } else {
            // If it's not a UUID, only try SKU
            whereClause.sku = row.sku;
          }

          const product = await prisma.products.findFirst({
            where: whereClause,
          });

          if (!product) {
            resolutionErrors.push({
              row: i + 2, // +2 because header is row 1, and we're 0-indexed
              sku: row.sku,
              error: 'Product not found',
            });
            continue;
          }

          updates.push({
            product_id: product.id,
            variant_id: null,
            adjustment_type: row.adjustment_type,
            quantity: row.quantity,
            reason: row.reason || null,
          });
        } else if (row.type === 'variant') {
          // Build where clause - try SKU first, then ID if it looks like a UUID
          const whereClause: any = {
            tenant_id: tenant.id,
          };

          if (isValidUUID(row.sku)) {
            // If it's a UUID, try both SKU and ID
            whereClause.OR = [{ sku: row.sku }, { id: row.sku }];
          } else {
            // If it's not a UUID, only try SKU
            whereClause.sku = row.sku;
          }

          const variant = await prisma.product_variants.findFirst({
            where: whereClause,
          });

          if (!variant) {
            resolutionErrors.push({
              row: i + 2,
              sku: row.sku,
              error: 'Variant not found',
            });
            continue;
          }

          updates.push({
            product_id: null,
            variant_id: variant.id,
            adjustment_type: row.adjustment_type,
            quantity: row.quantity,
            reason: row.reason || null,
          });
        }
      } catch (error) {
        resolutionErrors.push({
          row: i + 2,
          sku: row.sku,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Parsed ${parsedRows.length} rows, ${updates.length} valid updates`,
      updates,
      errors: errors.length > 0 || resolutionErrors.length > 0 ? [...errors, ...resolutionErrors] : undefined,
      summary: {
        totalRows: parsedRows.length,
        validUpdates: updates.length,
        parseErrors: errors.length,
        resolutionErrors: resolutionErrors.length,
      },
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return NextResponse.json(
      { error: 'Failed to parse CSV file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

