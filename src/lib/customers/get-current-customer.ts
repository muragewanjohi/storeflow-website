/**
 * Get Current Customer from Session
 * 
 * Retrieves the current authenticated customer from the session cookie
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma/client';
import { requireTenant } from '@/lib/tenant-context/server';

/**
 * Get current customer from session cookie
 * Returns null if not authenticated
 */
export async function getCurrentCustomer() {
  try {
    const tenant = await requireTenant();
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('customer_session')?.value;
    const customerEmail = cookieStore.get('customer_email')?.value;

    // Only allow customers who logged in via customer login system
    // Check for customer session cookie (set during customer login)
    if (!sessionToken || !customerEmail) {
      return null; // No customer session - must login via /customer-login
    }

    // Look up customer by email from session cookie
    const customer = await prisma.customers.findFirst({
      where: {
        tenant_id: tenant.id,
        email: customerEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        mobile: true,
        company: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postal_code: true,
        image: true,
        email_verified: true,
        created_at: true,
      },
    });
    
    return customer;
  } catch (error) {
    console.error('Error getting current customer:', error);
    return null;
  }
}

/**
 * Require customer authentication
 * Throws error if not authenticated
 */
export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  
  if (!customer) {
    throw new Error('Customer authentication required');
  }
  
  return customer;
}

