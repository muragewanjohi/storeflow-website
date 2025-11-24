/**
 * Tenant Support Tickets to Landlord Page
 * 
 * Lists all support tickets created by this tenant for the landlord
 * Only accessible to tenant admin/staff
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import TenantLandlordTicketsListClient from './tenant-landlord-tickets-list-client';

export default async function TenantLandlordTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const status = typeof params.status === 'string' ? params.status : undefined;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    tenant_id: tenant.id,
  };

  if (status) {
    where.status = status;
  }

  let tickets: any[] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    total = await prisma.landlord_support_tickets.count({ where });

    tickets = await prisma.landlord_support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        _count: {
          select: {
            landlord_support_ticket_messages: true,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching landlord support tickets:', error);
    dbError = error.message || 'Failed to fetch landlord support tickets';
  }

  // Format tickets for client component
  const formattedTickets = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject || 'No Subject',
    status: ticket.status || 'open',
    priority: ticket.priority || 'medium',
    category: ticket.category || 'other',
    message_count: ticket._count?.landlord_support_ticket_messages || 0,
    created_at: ticket.created_at?.toISOString() || new Date().toISOString(),
    updated_at: ticket.updated_at?.toISOString() || new Date().toISOString(),
  }));

  return (
    <TenantLandlordTicketsListClient
      initialTickets={formattedTickets}
      initialPagination={{
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      }}
      dbError={dbError}
      currentSearchParams={{
        page,
        limit,
        status: status || 'all',
      }}
    />
  );
}

