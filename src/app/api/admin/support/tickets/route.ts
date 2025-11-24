/**
 * Landlord Support Tickets API Routes
 * 
 * GET: List landlord support tickets (from tenants to landlord)
 * POST: Create new landlord support ticket (tenant creates ticket for landlord)
 * 
 * Note: This requires landlord_support_tickets and landlord_support_ticket_messages tables.
 * These tickets are from tenants to the landlord/platform admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { createLandlordTicketSchema, landlordTicketQuerySchema } from '@/lib/landlord-support/validation';
import { sendNewLandlordTicketEmail } from '@/lib/landlord-support/emails';

/**
 * GET /api/admin/support/tickets - List landlord support tickets
 * 
 * Only accessible to landlord/admin users
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    await requireRoleOrRedirect(user, 'landlord', '/admin/login');
    
    const { searchParams } = new URL(request.url);
    
    // Convert null to undefined for optional fields
    const getParam = (key: string) => {
      const value = searchParams.get(key);
      return value === null ? undefined : value;
    };

    const query = landlordTicketQuerySchema.parse({
      page: getParam('page'),
      limit: getParam('limit'),
      search: getParam('search'),
      status: getParam('status'),
      priority: getParam('priority'),
      category: getParam('category'),
      tenant_id: getParam('tenant_id'),
      sort_by: getParam('sort_by'),
      sort_order: getParam('sort_order'),
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    // Note: This assumes landlord_support_tickets table exists
    // For now, we'll use a placeholder query structure
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.tenant_id) {
      where.tenant_id = query.tenant_id;
    }

    // Search filter (subject or description)
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' as const } },
        { description: { contains: query.search, mode: 'insensitive' as const } },
      ];
    }

    const total = await prisma.landlord_support_tickets.count({ where });

    const tickets = await prisma.landlord_support_tickets.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [query.sort_by || 'created_at']: query.sort_order || 'desc',
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
            landlord_support_ticket_messages: true,
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
    console.error('Error fetching landlord support tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch landlord support tickets' },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin/support/tickets - Create new landlord support ticket
 * 
 * Can be called by tenant admins to create tickets for the landlord
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validatedData = createLandlordTicketSchema.parse(body);

    // Get tenant context (tenant creating the ticket)
    const tenant = await prisma.tenants.findFirst({
      where: {
        id: user.tenant_id || '',
      },
    });

    if (!tenant && user.role !== 'landlord') {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const ticket = await prisma.landlord_support_tickets.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id, // Tenant admin user (from Supabase auth)
        subject: validatedData.subject,
        description: validatedData.description,
        priority: validatedData.priority,
        category: validatedData.category || 'other',
        status: 'open',
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
      },
    });

    // Send email notification to landlord admin
    sendNewLandlordTicketEmail({
      ticket,
      tenant,
    }).catch((error) => {
      console.error('Error sending new landlord ticket email:', error);
    });

    return NextResponse.json(
      { success: true, ticket },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating landlord support ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create landlord support ticket' },
      { status: error.status || 500 }
    );
  }
}

