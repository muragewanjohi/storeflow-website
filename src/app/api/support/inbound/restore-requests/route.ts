import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { sendNewLandlordTicketEmail } from '@/lib/landlord-support/emails';
import { z } from 'zod';

const restoreInboundSchema = z.object({
  from: z.string().email('Invalid sender email'),
  to: z.string().optional(),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  tenantSubdomain: z.string().optional(),
  tenantName: z.string().optional(),
  providerMessageId: z.string().optional(),
});

function verifyInboundSecret(request: NextRequest): boolean {
  const expectedSecret = process.env.SUPPORT_INBOUND_WEBHOOK_SECRET;
  if (!expectedSecret) return false;

  const authHeader = request.headers.get('authorization');
  const headerSecret = request.headers.get('x-support-webhook-secret');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  return headerSecret === expectedSecret || bearerToken === expectedSecret;
}

function extractSubdomainFromSubject(subject: string | undefined): string | null {
  if (!subject) return null;

  // Expected restore subject: "Account Restore Request - Store Name (subdomain)"
  const parenthesized = subject.match(/\(([^)]+)\)\s*$/);
  if (parenthesized?.[1]) {
    return parenthesized[1].trim().toLowerCase();
  }

  return null;
}

function extractSubdomainFromText(text: string | undefined): string | null {
  if (!text) return null;

  const byLabel = text.match(/store subdomain:\s*([a-z0-9-]+)/i);
  if (byLabel?.[1]) {
    return byLabel[1].trim().toLowerCase();
  }

  return null;
}

function extractSubdomainFromRecipient(to: string | undefined): string | null {
  if (!to) return null;
  // Supports aliases like support+myshop@dukanest.com
  const match = to.match(/support\+([a-z0-9-]+)@/i);
  if (match?.[1]) return match[1].toLowerCase();
  return null;
}

async function parseInboundPayload(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return restoreInboundSchema.parse(await request.json());
  }

  if (
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    const formData = await request.formData();
    return restoreInboundSchema.parse({
      from: String(formData.get('from') || ''),
      to: String(formData.get('to') || ''),
      subject: String(formData.get('subject') || ''),
      text: String(formData.get('text') || formData.get('body-plain') || ''),
      html: String(formData.get('html') || formData.get('body-html') || ''),
      tenantSubdomain: String(formData.get('tenantSubdomain') || ''),
      tenantName: String(formData.get('tenantName') || ''),
      providerMessageId: String(formData.get('Message-Id') || formData.get('message_id') || ''),
    });
  }

  throw new Error('Unsupported content type');
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyInboundSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await parseInboundPayload(request);
    const subdomain =
      payload.tenantSubdomain?.trim().toLowerCase() ||
      extractSubdomainFromSubject(payload.subject) ||
      extractSubdomainFromText(payload.text) ||
      extractSubdomainFromRecipient(payload.to) ||
      null;

    const tenant = await prisma.tenants.findFirst({
      where: subdomain
        ? { subdomain }
        : {
            OR: [
              { contact_email: payload.from.toLowerCase() },
              { subdomain: payload.tenantName?.trim().toLowerCase() || '__none__' },
            ],
          },
      select: {
        id: true,
        name: true,
        subdomain: true,
        contact_email: true,
        status: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          error: 'Unable to resolve tenant',
          message: 'No tenant matched the inbound restore request payload.',
        },
        { status: 404 },
      );
    }

    const restoreDescription = `
ACCOUNT RESTORE REQUEST (AUTO-INGESTED)

Tenant:
- Name: ${tenant.name}
- Subdomain: ${tenant.subdomain}
- Current Status: ${tenant.status || 'unknown'}

Inbound Email:
- From: ${payload.from}
- To: ${payload.to || 'support@dukanest.com'}
- Subject: ${payload.subject || '(none)'}
- Provider Message ID: ${payload.providerMessageId || '(none)'}
- Received At: ${new Date().toISOString()}

Email Body (plain text):
${payload.text || '(no plain text body)'}
    `.trim();

    const ticket = await prisma.landlord_support_tickets.create({
      data: {
        tenant_id: tenant.id,
        user_id: null,
        subject: `Restore Request - ${tenant.name} (${tenant.subdomain})`,
        description: restoreDescription,
        priority: 'high',
        category: 'account_restore',
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

    sendNewLandlordTicketEmail({
      ticket,
      tenant: ticket.tenants as any,
    }).catch((error) => {
      console.error('Failed to send landlord restore ticket email notification:', error);
    });

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      tenantId: tenant.id,
      subdomain: tenant.subdomain,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to process inbound restore request' },
      { status: 500 },
    );
  }
}

