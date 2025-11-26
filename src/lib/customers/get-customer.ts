/**
 * Get or Create Customer from Auth User
 * 
 * Helper function to get customer record from authenticated user
 * Creates customer if it doesn't exist
 */

import { prisma } from '@/lib/prisma/client';
import type { AuthUser } from '@/lib/auth/types';

export async function getOrCreateCustomer(
  user: AuthUser,
  tenantId: string
): Promise<string> {
  // Use findFirst with explicit where clause - the unique index will make this fast
  // Only select ID field for better performance
  let customer = await prisma.customers.findFirst({
    where: {
      tenant_id: tenantId,
      email: user.email,
    },
    select: {
      id: true, // Only select ID for faster query
    },
  });

  // If customer doesn't exist, create one
  if (!customer) {
    customer = await prisma.customers.create({
      data: {
        tenant_id: tenantId,
        email: user.email,
        name: user.email.split('@')[0], // Use email prefix as default name
        email_verified: true, // Assume verified if coming from auth
      },
      select: {
        id: true, // Only select ID
      },
    });
  }

  return customer.id;
}

