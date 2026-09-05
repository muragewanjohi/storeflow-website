/**
 * Create Support Ticket Page (Landlord → Tenant)
 * 
 * Allows the landlord to create a support ticket directed at a specific tenant.
 * The tenant will receive a notification and can reply via their dashboard.
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import CreateTicketForm from './create-ticket-form';

export const dynamic = 'force-dynamic';

export default async function CreateLandlordTicketPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const allTenants = await prisma.tenants.findMany({
    where: {
      status: 'active',
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      data: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Exclude demo stores
  const tenants = allTenants
    .filter((t) => {
      const d = t.data as Record<string, unknown> | null;
      return !(d?.is_demo === true || d?.isDemo === true);
    })
    .map(({ data, ...rest }) => rest);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create Support Ticket</h1>
        <p className="text-muted-foreground mt-2">
          Send a message to a tenant. They will be notified and can reply from their dashboard.
        </p>
      </div>
      <CreateTicketForm tenants={tenants} />
    </div>
  );
}
