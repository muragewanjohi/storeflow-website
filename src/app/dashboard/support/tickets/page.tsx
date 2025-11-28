/**
 * Support Tickets Management Page
 * 
 * Lists all support tickets for the tenant with filtering and search
 * Only accessible to tenant_admin and tenant_staff
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import TicketsListClient from './tickets-list-client';

export const dynamic = 'force-dynamic';

export default async function SupportTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and tenant_admin or tenant_staff role
  const user = await requireAuthOrRedirect('/login');
  await requireAnyRoleOrRedirect(user, ['tenant_admin', 'tenant_staff'], '/login');

  // Get tenant context
  const tenant = await requireTenant();

  // Verify user belongs to tenant (unless landlord)
  if (user.role !== 'landlord' && user.tenant_id !== tenant.id) {
    redirect('/login');
  }

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const priority = typeof params.priority === 'string' ? params.priority : undefined;
  const department_id = typeof params.department_id === 'string' ? params.department_id : undefined;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    tenant_id: tenant.id,
  };

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (department_id) {
    where.department_id = department_id;
  }

  // Search filter
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' as const } },
      { description: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  let tickets: any[] = [];
  let total = 0;
  let dbError: string | null = null;

  try {
    // Get total count
    total = await prisma.support_tickets.count({ where });

    // Get tickets
    tickets = await prisma.support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            support_ticket_messages: true,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    dbError = error.message || 'Failed to fetch support tickets';
  }

  // Format tickets for client component
  const formattedTickets = tickets.map((ticket: any) => ({
    id: ticket.id,
    subject: ticket.subject || 'No Subject',
    description: ticket.description || '',
    status: ticket.status || 'open',
    priority: ticket.priority || 'medium',
    department_id: ticket.department_id,
    customer_name: ticket.customers?.name || ticket.customers?.email || 'Unknown',
    customer_email: ticket.customers?.email || null,
    message_count: ticket._count.support_ticket_messages,
    created_at: ticket.created_at?.toISOString() || new Date().toISOString(),
    updated_at: ticket.updated_at?.toISOString() || new Date().toISOString(),
  }));

  return (
    <TicketsListClient
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
        search: search || '',
        status: status || 'all',
        priority: priority || 'all',
        department_id: department_id || '',
      }}
    />
  );
}

