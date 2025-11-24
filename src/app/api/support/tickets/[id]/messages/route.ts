/**
 * Support Ticket Messages API Routes
 * 
 * GET: List messages for a ticket
 * POST: Add message to a ticket
 * 
 * Day 21.5: Support Ticket System
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { createTicketMessageSchema } from '@/lib/support/validation';
import { sendTicketReplyEmail } from '@/lib/support/emails';

/**
 * GET /api/support/tickets/[id]/messages - List messages for a ticket
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.support_tickets.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get messages
    const messages = await prisma.support_ticket_messages.findMany({
      where: {
        ticket_id: id,
        tenant_id: tenant.id,
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
 * POST /api/support/tickets/[id]/messages - Add message to a ticket
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Verify ticket exists and belongs to tenant
    const ticket = await prisma.support_tickets.findFirst({
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
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot add message to closed ticket' },
        { status: 400 }
      );
    }

    const validatedData = createTicketMessageSchema.parse(body);

    // Create message
    const message = await prisma.support_ticket_messages.create({
      data: {
        tenant_id: tenant.id,
        ticket_id: id,
        user_id: user.id, // Can be customer or admin
        message: validatedData.message,
        attachments: validatedData.attachments || [],
      },
    });

    // Update ticket's updated_at timestamp
    await prisma.support_tickets.update({
      where: { id },
      data: {
        updated_at: new Date(),
        // If ticket was resolved, change to in_progress when new message is added
        status: ticket.status === 'resolved' ? 'in_progress' : ticket.status,
      },
    });

    // Determine if message is from customer or admin
    const isFromCustomer = ticket.user_id === user.id;
    const isFromAdmin = !isFromCustomer; // Admin users are not customers

    // Send email notification
    sendTicketReplyEmail({
      ticket,
      tenant,
      message: validatedData.message,
      isFromCustomer,
      customer: ticket.customers,
    }).catch((error) => {
      console.error('Error sending ticket reply email:', error);
      // Don't fail message creation if email fails
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

