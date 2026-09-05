/**
 * Invoice Number Generation Utility
 * 
 * Generates sequential invoice numbers per tenant
 * Format: INV-YYYY-NNN (e.g., INV-2024-001)
 */

import { prisma } from '@/lib/prisma/client';

/**
 * Generate the next invoice number for a tenant
 * Format: INV-YYYY-NNN (e.g., INV-2024-001)
 */
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  // Find the highest invoice number for this tenant in the current year
  const lastInvoice = await prisma.orders.findFirst({
    where: {
      tenant_id: tenantId,
      invoice_number: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoice_number: 'desc',
    },
    select: {
      invoice_number: true,
    },
  });

  let nextNumber = 1;

  if (lastInvoice?.invoice_number) {
    // Extract the number part (e.g., "001" from "INV-2024-001")
    const numberPart = lastInvoice.invoice_number.replace(prefix, '');
    const lastNumber = parseInt(numberPart, 10);
    
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format with leading zeros (001, 002, etc.)
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  
  return `${prefix}${formattedNumber}`;
}

/**
 * Validate invoice number format
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  const pattern = /^INV-\d{4}-\d{3}$/;
  return pattern.test(invoiceNumber);
}
