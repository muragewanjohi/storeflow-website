/**
 * Landlord Support Tickets Management Page
 * 
 * Lists all support tickets from tenants to the landlord
 * Only accessible to landlord/admin users
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import LandlordTicketsListClient from './landlord-tickets-list-client';

export default async function LandlordSupportTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Require authentication and landlord role
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Parse search params
  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page, 10) : 1;
  const limit = typeof params.limit === 'string' ? parseInt(params.limit, 10) : 20;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const priority = typeof params.priority === 'string' ? params.priority : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const tenant_id = typeof params.tenant_id === 'string' ? params.tenant_id : undefined;

  const skip = (page - 1) * limit;

  // Build where clause
  // TODO: Replace with actual query once landlord_support_tickets table exists
  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  if (category) {
    where.category = category;
  }

  if (tenant_id) {
    where.tenant_id = tenant_id;
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
    total = await prisma.landlord_support_tickets.count({ where });

    tickets = await prisma.landlord_support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            contact_email: true,
          },
        },
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
    description: ticket.description || '',
    status: ticket.status || 'open',
    priority: ticket.priority || 'medium',
    category: ticket.category || 'other',
    tenant_name: ticket.tenants?.name || ticket.tenants?.subdomain || 'Unknown',
    tenant_subdomain: ticket.tenants?.subdomain || null,
    message_count: ticket._count?.landlord_support_ticket_messages || 0,
    created_at: ticket.created_at?.toISOString() || new Date().toISOString(),
    updated_at: ticket.updated_at?.toISOString() || new Date().toISOString(),
  }));

  return (
    <LandlordTicketsListClient
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
        category: category || 'all',
        tenant_id: tenant_id || '',
      }}
    />
  );
}

