/**
 * Tenant Landlord Support Ticket Detail Page
 * 
 * Displays ticket details with conversation thread for tenant viewing their tickets to landlord
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireAnyRoleOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import TenantLandlordTicketDetailClient from './tenant-landlord-ticket-detail-client';

export default async function TenantLandlordTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;

  // Fetch ticket directly from database
  let ticket: any = null;
  let error: string | null = null;

  try {
    const ticketData = await prisma.landlord_support_tickets.findFirst({
      where: {
        id,
        tenant_id: tenant.id, // Ensure tenant can only see their own tickets
      },
      include: {
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

  return <TenantLandlordTicketDetailClient initialTicket={ticket} error={error} tenantId={tenant.id} currentUserId={user.id} />;
}

