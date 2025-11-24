/**
 * Support Page
 * 
 * Customer-facing page to create a new support ticket
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import CreateTicketClient from './create-ticket-client';
import { prisma } from '@/lib/prisma/client';

export default async function SupportPage() {
  // Require customer authentication
  const user = await requireAuthOrRedirect('/login');
  const tenant = await requireTenant();

  // Verify user is a customer (has customer record)
  const customer = await prisma.customers.findFirst({
    where: {
      id: user.id,
      tenant_id: tenant.id,
    },
  });

  if (!customer) {
    redirect('/login');
  }

  // Fetch departments for the form
  let departments: any[] = [];
  try {
    const deptResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/support/departments`, {
      headers: {
        'Cookie': `auth-token=${user.id}`, // This is a simplified approach
      },
    });
    if (deptResponse.ok) {
      const deptData = await deptResponse.json();
      departments = deptData.departments || [];
    }
  } catch (error) {
    console.error('Error fetching departments:', error);
  }

  return <CreateTicketClient customer={customer} departments={departments} />;
}

