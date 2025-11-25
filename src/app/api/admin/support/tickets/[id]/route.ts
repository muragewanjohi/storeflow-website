/**
 * Landlord Support Ticket Detail API Routes
 * 
 * GET: Get ticket details
 * PUT: Update ticket (status, priority, assignment)
 * DELETE: Close ticket (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireAnyRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { updateLandlordTicketSchema } from '@/lib/landlord-support/validation';
import { sendLandlordTicketStatusUpdateEmail, sendLandlordTicketReplyEmail } from '@/lib/landlord-support/emails';

/**
 * GET /api/admin/support/tickets/[id] - Get ticket details
 * 
 * Accessible to:
 * - Landlord admins (can view all tickets)
 * - Tenant admins (can only view their own tenant's tickets)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['landlord', 'tenant_admin']); // Use requireAnyRole for API routes
    const { id } = await params;

    // Build where clause - tenant admins can only see their own tenant's tickets
    const where: any = { id };
    if (user.role === 'tenant_admin' && user.tenant_id) {
      where.tenant_id = user.tenant_id;
    }

    const ticket = await prisma.landlord_support_tickets.findFirst({
      where,
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
        _count: {
          select: {
            landlord_support_ticket_messages: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Transform ticket to match client component expectations
    const transformedTicket = {
      id: ticket.id,
      subject: ticket.subject || 'No Subject',
      description: ticket.description || '',
      status: ticket.status || 'open',
      priority: ticket.priority || 'medium',
      category: ticket.category || 'other',
      tenant: ticket.tenants, // Map tenants to tenant
      messages: ticket.landlord_support_ticket_messages.map((msg: any) => ({
        id: msg.id,
        message: msg.message || '',
        attachments: msg.attachments || [],
        user_id: msg.user_id,
        created_at: msg.created_at?.toISOString() || new Date().toISOString(),
      })),
      created_at: ticket.created_at?.toISOString() || new Date().toISOString(),
      updated_at: ticket.updated_at?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      ticket: transformedTicket,
    });
  } catch (error: any) {
    console.error('Error fetching landlord support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch landlord support ticket' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/admin/support/tickets/[id] - Update ticket
 * 
 * Accessible to:
 * - Landlord admins (can update any ticket)
 * - Tenant admins (can only update their own tenant's tickets, but limited fields)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['landlord', 'tenant_admin']); // Use requireAnyRole for API routes
    const { id } = await params;
    const body = await request.json();

    // Build where clause - tenant admins can only update their own tenant's tickets
    const where: any = { id };
    if (user.role === 'tenant_admin' && user.tenant_id) {
      where.tenant_id = user.tenant_id;
    }

    const existingTicket = await prisma.landlord_support_tickets.findFirst({
      where,
      include: {
        tenants: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            contact_email: true,
          },
        },
      },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const validatedData = updateLandlordTicketSchema.parse(body);
    const oldStatus = existingTicket.status;

    // Tenant admins can't update status/priority (only landlord can)
    if (user.role === 'tenant_admin') {
      // Remove status and priority from update data for tenant admins
      delete validatedData.status;
      delete validatedData.priority;
    }

    const ticket = await prisma.landlord_support_tickets.update({
      where: { id },
      data: {
        ...validatedData,
        updated_at: new Date(),
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
        landlord_support_ticket_messages: {
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    });

    // Send email notifications for status changes
    if (validatedData.status && validatedData.status !== oldStatus) {
      sendLandlordTicketStatusUpdateEmail({
        ticket,
        tenant: ticket.tenants as any,
        oldStatus,
        newStatus: validatedData.status,
      }).catch((error) => {
        console.error('Error sending status update email:', error);
      });
    }

    // Transform ticket to match client component expectations
    const transformedTicket = {
      id: ticket.id,
      subject: ticket.subject || 'No Subject',
      description: ticket.description || '',
      status: ticket.status || 'open',
      priority: ticket.priority || 'medium',
      category: ticket.category || 'other',
      tenant: ticket.tenants, // Map tenants to tenant
      messages: ticket.landlord_support_ticket_messages.map((msg: any) => ({
        id: msg.id,
        message: msg.message || '',
        attachments: msg.attachments || [],
        user_id: msg.user_id,
        created_at: msg.created_at?.toISOString() || new Date().toISOString(),
      })),
      created_at: ticket.created_at?.toISOString() || new Date().toISOString(),
      updated_at: ticket.updated_at?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      ticket: transformedTicket,
    });
  } catch (error: any) {
    console.error('Error updating landlord support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update landlord support ticket' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin/support/tickets/[id] - Close ticket (soft delete)
 * 
 * Accessible to:
 * - Landlord admins (can close any ticket)
 * - Tenant admins (can only close their own tenant's tickets)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['landlord', 'tenant_admin']); // Use requireAnyRole for API routes
    const { id } = await params;

    // Build where clause - tenant admins can only close their own tenant's tickets
    const where: any = { id };
    if (user.role === 'tenant_admin' && user.tenant_id) {
      where.tenant_id = user.tenant_id;
    }

    const existingTicket = await prisma.landlord_support_tickets.findFirst({
      where,
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = await prisma.landlord_support_tickets.update({
      where: { id },
      data: {
        status: 'closed',
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket closed successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Error closing landlord support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close landlord support ticket' },
      { status: error.status || 500 }
    );
  }
}

