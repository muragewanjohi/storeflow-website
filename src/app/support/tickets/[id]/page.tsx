/**
 * Customer Support Ticket Detail Page
 * 
 * Displays ticket details with conversation thread for customers
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import CustomerTicketDetailClient from './customer-ticket-detail-client';

export default async function CustomerTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch ticket directly from database
  let ticket: any = null;
  let error: string | null = null;

  try {
    const ticketData = await prisma.support_tickets.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
        user_id: customer.id, // Ensure customer can only see their own tickets
      },
      include: {
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

  return <CustomerTicketDetailClient initialTicket={ticket} error={error} customerId={customer.id} />;
}

