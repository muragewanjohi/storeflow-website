/**
 * Support Tickets API Routes
 * 
 * GET: List support tickets (with filtering, search, pagination)
 * POST: Create new support ticket
 * 
 * Day 21.5: Support Ticket System
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { createTicketSchema, ticketQuerySchema } from '@/lib/support/validation';
import { sendNewTicketEmail } from '@/lib/support/emails';

/**
 * GET /api/support/tickets - List support tickets
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);
    
    // Convert null to undefined for optional fields
    const getParam = (key: string) => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };

    const query = ticketQuerySchema.parse({
      page: getParam('page'),
      limit: getParam('limit'),
      search: getParam('search'),
      status: getParam('status'),
      priority: getParam('priority'),
      department_id: getParam('department_id'),
      user_id: getParam('user_id'),
      sort_by: getParam('sort_by'),
      sort_order: getParam('sort_order'),
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.department_id) {
      where.department_id = query.department_id;
    }

    if (query.user_id) {
      where.user_id = query.user_id;
    }

    // Search filter (subject or description)
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' as const } },
        { description: { contains: query.search, mode: 'insensitive' as const } },
      ];
    }

    // Get total count
    const total = await prisma.support_tickets.count({ where });

    // Get tickets
    const tickets = await prisma.support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [query.sort_by || 'created_at']: query.sort_order || 'desc',
      },
      include: {
        customers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        support_ticket_messages: {
          take: 1,
          orderBy: {
            created_at: 'desc',
          },
          select: {
            id: true,
            message: true,
            created_at: true,
          },
        },
        _count: {
          select: {
            support_ticket_messages: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support tickets' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/support/tickets - Create new support ticket
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();
    const body = await request.json();

    const validatedData = createTicketSchema.parse(body);

    // Create ticket
    const ticket = await prisma.support_tickets.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id, // Customer ID (from auth)
        subject: validatedData.subject,
        description: validatedData.description,
        priority: validatedData.priority,
        department_id: validatedData.department_id || null,
        status: 'open',
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

    // Send email notification to tenant admin
    sendNewTicketEmail({
      ticket,
      tenant,
      customer: ticket.customers,
    }).catch((error) => {
      console.error('Error sending new ticket email:', error);
      // Don't fail ticket creation if email fails
    });

    return NextResponse.json(
      { success: true, ticket },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create support ticket' },
      { status: error.status || 500 }
    );
  }
}

