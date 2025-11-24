/**
 * Landlord Support Ticket Messages API Routes
 * 
 * GET: List messages for a ticket
 * POST: Add message to a ticket
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireAnyRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createLandlordTicketMessageSchema } from '@/lib/landlord-support/validation';
import { sendLandlordTicketReplyEmail } from '@/lib/landlord-support/emails';

/**
 * GET /api/admin/support/tickets/[id]/messages - List messages for a ticket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    // Allow both landlord and tenant_admin to view messages
    requireAnyRole(user, ['landlord', 'tenant_admin']);
    const { id } = await params;

    // Build where clause - tenant admins can only see their own tenant's tickets
    const ticketWhere: any = { id };
    if (user.role === 'tenant_admin' && user.tenant_id) {
      ticketWhere.tenant_id = user.tenant_id;
    }

    const ticket = await prisma.landlord_support_tickets.findFirst({
      where: ticketWhere,
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const messages = await prisma.landlord_support_ticket_messages.findMany({
      where: {
        ticket_id: id,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.error('Error fetching ticket messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ticket messages' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/support/tickets/[id]/messages - Add message to a ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['landlord', 'tenant_admin']); // Ensure proper role check
    const { id } = await params;
    const body = await request.json();

    // Build where clause - tenant admins can only reply to their own tenant's tickets
    const ticketWhere: any = { id };
    if (user.role === 'tenant_admin' && user.tenant_id) {
      ticketWhere.tenant_id = user.tenant_id;
    }

    const ticket = await prisma.landlord_support_tickets.findFirst({
      where: ticketWhere,
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

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot add message to closed ticket' },
        { status: 400 }
      );
    }

    const validatedData = createLandlordTicketMessageSchema.parse(body);

    const message = await prisma.landlord_support_ticket_messages.create({
      data: {
        ticket_id: id,
        user_id: user.id,
        message: validatedData.message,
        attachments: validatedData.attachments || [],
      },
    });

    await prisma.landlord_support_tickets.update({
      where: { id },
      data: {
        updated_at: new Date(),
        status: ticket.status === 'resolved' ? 'in_progress' : ticket.status,
      },
    });

    // Determine if message is from tenant or landlord
    const isFromTenant = ticket.user_id === user.id;
    const isFromLandlord = user.role === 'landlord';

    // Send email notification
    sendLandlordTicketReplyEmail({
      ticket,
      tenant: ticket.tenants,
      message: validatedData.message,
      isFromTenant,
    }).catch((error) => {
      console.error('Error sending ticket reply email:', error);
    });

    return NextResponse.json(
      { success: true, message },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating ticket message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create ticket message' },
      { status: error.status || 500 }
    );
  }
}

