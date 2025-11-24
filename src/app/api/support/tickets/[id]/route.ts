/**
 * Support Ticket Detail API Routes
 * 
 * GET: Get ticket details
 * PUT: Update ticket (status, priority, assignment)
 * DELETE: Delete ticket (soft delete - mark as closed)
 * 
 * Day 21.5: Support Ticket System
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { updateTicketSchema } from '@/lib/support/validation';
import { sendTicketStatusUpdateEmail, sendTicketAssignedEmail } from '@/lib/support/emails';

/**
 * GET /api/support/tickets/[id] - Get ticket details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

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
            phone: true,
          },
        },
        support_ticket_messages: {
          orderBy: {
            created_at: 'asc',
          },
          include: {
            // Note: user_id can be customer or admin - we'll handle this in the response
          },
        },
        _count: {
          select: {
            support_ticket_messages: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('Error fetching support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support ticket' },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/support/tickets/[id] - Update ticket
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;
    const body = await request.json();

    // Verify ticket exists
    const existingTicket = await prisma.support_tickets.findFirst({
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

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const validatedData = updateTicketSchema.parse(body);
    const oldStatus = existingTicket.status;
    const oldPriority = existingTicket.priority;

    // Update ticket
    const ticket = await prisma.support_tickets.update({
      where: { id },
      data: {
        ...validatedData,
        updated_at: new Date(),
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

    // Send email notifications for status changes
    if (validatedData.status && validatedData.status !== oldStatus) {
      sendTicketStatusUpdateEmail({
        ticket,
        tenant,
        customer: ticket.customers,
        oldStatus,
        newStatus: validatedData.status,
      }).catch((error) => {
        console.error('Error sending status update email:', error);
      });
    }

    // Send email notification for assignment (if department_id changed)
    if (validatedData.department_id && validatedData.department_id !== existingTicket.department_id) {
      // Note: In a full implementation, you'd fetch the assigned staff member
      // For now, we'll just log it
      console.log('Ticket assigned to department:', validatedData.department_id);
    }

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update support ticket' },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/support/tickets/[id] - Close ticket (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { id } = await params;

    // Verify ticket exists
    const existingTicket = await prisma.support_tickets.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Soft delete: mark as closed
    const ticket = await prisma.support_tickets.update({
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
    console.error('Error closing support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close support ticket' },
      { status: error.status || 500 }
    );
  }
}

