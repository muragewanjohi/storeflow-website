/**
 * Support Ticket Detail Page
 * 
 * Displays ticket details with conversation thread and status updates
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import TicketDetailClient from './ticket-detail-client';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch ticket directly from database
  let ticket: any = null;
  let error: string | null = null;

  try {
    const ticketData = await prisma.support_tickets.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        support_ticket_messages: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    if (!ticketData) {
      error = 'Ticket not found';
    } else {
      ticket = {
        id: ticketData.id,
        subject: ticketData.subject || 'No Subject',
        description: ticketData.description || '',
        status: ticketData.status || 'open',
        priority: ticketData.priority || 'medium',
        department_id: ticketData.department_id,
        customer: ticketData.customers,
        messages: ticketData.support_ticket_messages.map((msg: any) => ({
          id: msg.id,
          message: msg.message || '',
          attachments: msg.attachments || [],
          user_id: msg.user_id,
          created_at: msg.created_at?.toISOString() || new Date().toISOString(),
        })),
        created_at: ticketData.created_at?.toISOString() || new Date().toISOString(),
        updated_at: ticketData.updated_at?.toISOString() || new Date().toISOString(),
      };
    }
  } catch (err: any) {
    console.error('Error fetching ticket:', err);
    error = err.message || 'Failed to fetch ticket';
  }

  return <TicketDetailClient initialTicket={ticket} error={error} currentUserId={user.id} />;
}

