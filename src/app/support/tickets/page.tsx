/**
 * Customer Support Tickets Page
 * 
 * Lists all support tickets for the logged-in customer
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CustomerTicketsListClient from './customer-tickets-list-client';

export const dynamic = 'force-dynamic';

export default async function CustomerTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require customer authentication
  const user = await requireAuthOrRedirect('/login');
  const tenant = await requireTenant();

  // Verify user is a customer
  const customer = await prisma.customers.findFirst({
    where: {
      id: user.id,
      tenant_id: tenant.id,
    },
  });

  if (!customer) {
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
    user_id: customer.id,
  };

  if (status) {
    where.status = status;
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
    status: ticket.status || 'open',
    priority: ticket.priority || 'medium',
    message_count: ticket._count.support_ticket_messages,
    created_at: ticket.created_at?.toISOString() || new Date().toISOString(),
    updated_at: ticket.updated_at?.toISOString() || new Date().toISOString(),
  }));

  return (
    <CustomerTicketsListClient
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

