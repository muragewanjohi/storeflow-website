/**
 * Link Orders to Customer Account
 * 
 * Links orders to a customer account by matching email addresses and tenant_id.
 * This works for both guest orders (user_id: null) and orders that may have been
 * incorrectly assigned to another customer.
 * 
 * IMPORTANT: We match by email + tenant_id ONLY, not by user_id.
 * This allows us to link orders regardless of their current user_id status.
 */

import { prisma } from '@/lib/prisma/client';

/**
 * Link orders to customer account
 * 
 * Finds all orders that match the customer's email and tenant_id
 * and updates them to have user_id: customerId
 * 
 * @param customerId - The customer ID to link orders to
 * @param customerEmail - The customer's email address
 * @param tenantId - The tenant ID
 * @returns Number of orders linked
 */
export async function linkGuestOrdersToCustomer(
  customerId: string,
  customerEmail: string,
  tenantId: string
): Promise<number> {
  // Normalize email (trim and lowercase for comparison)
  const normalizedEmail = customerEmail.trim().toLowerCase();

  // Find all orders that match email and tenant_id (regardless of current user_id)
  // Using raw SQL for more reliable case-insensitive matching
  const matchingOrders = await prisma.$queryRaw<Array<{ id: string; user_id: string | null }>>`
    SELECT id, user_id
    FROM orders
    WHERE tenant_id = ${tenantId}::uuid
      AND LOWER(TRIM(email)) = LOWER(TRIM(${normalizedEmail}))
      AND (user_id IS NULL OR user_id != ${customerId}::uuid)
  `;

  if (matchingOrders.length === 0) {
    return 0;
  }

  // Update all matching orders to link them to the customer account
  const orderIds = matchingOrders.map((order: any) => order.id);
  
  await prisma.orders.updateMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    data: {
      user_id: customerId,
      updated_at: new Date(),
    },
  });

  // Also update order_products to link them to the customer
  // Update all order_products for these orders, regardless of current user_id
  await prisma.order_products.updateMany({
    where: {
      order_id: {
        in: orderIds,
      },
    },
    data: {
      user_id: customerId,
    },
  });

  return matchingOrders.length;
}

