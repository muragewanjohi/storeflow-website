/**
 * Landlord Support Ticket Detail Page
 * 
 * Displays ticket details with conversation thread and status updates
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import LandlordTicketDetailClient from './landlord-ticket-detail-client';

export default async function LandlordTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Require authentication and landlord role
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const { id } = await params;

  // Fetch ticket directly from database
  let ticket: any = null;
  let error: string | null = null;

  try {
    const ticketData = await prisma.landlord_support_tickets.findFirst({
      where: { id },
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            contact_email: true,
          },
        },
        landlord_support_ticket_messages: {
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
        category: ticketData.category || 'other',
        tenant: ticketData.tenants,
        messages: ticketData.landlord_support_ticket_messages.map((msg: any) => ({
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

  return <LandlordTicketDetailClient initialTicket={ticket} error={error} currentUserId={user.id} />;
}

