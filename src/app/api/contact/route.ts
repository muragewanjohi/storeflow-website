/**
 * Contact Form API Route
 * 
 * POST /api/contact
 * Handles contact form submissions and sends email to support@dukanest.com
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendUnifiedEmail } from '@/lib/email/service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = contactFormSchema.parse(body);

    // Get client IP and user agent for logging
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create email HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0025cc 0%, #001a99 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #374151; margin-bottom: 5px; display: block; }
            .value { color: #111827; padding: 8px; background: white; border-radius: 4px; border: 1px solid #d1d5db; }
            .footer { background: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Contact Form Submission</h2>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Name:</span>
                <div class="value">${escapeHtml(validatedData.name)}</div>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <div class="value">${escapeHtml(validatedData.email)}</div>
              </div>
              <div class="field">
                <span class="label">Subject:</span>
                <div class="value">${escapeHtml(validatedData.subject)}</div>
              </div>
              <div class="field">
                <span class="label">Message:</span>
                <div class="value" style="white-space: pre-wrap;">${escapeHtml(validatedData.message)}</div>
              </div>
              <div class="field" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <span class="label" style="font-size: 12px; color: #6b7280;">Technical Details:</span>
                <div style="font-size: 11px; color: #9ca3af; margin-top: 5px;">
                  IP Address: ${escapeHtml(ipAddress)}<br>
                  User Agent: ${escapeHtml(userAgent.substring(0, 100))}${userAgent.length > 100 ? '...' : ''}
                </div>
              </div>
            </div>
            <div class="footer">
              This email was sent from the DukaNest contact form. Please reply directly to ${escapeHtml(validatedData.email)} to respond.
            </div>
          </div>
        </body>
      </html>
    `;

    // Create plain text version
    const textContent = `
New Contact Form Submission

Name: ${validatedData.name}
Email: ${validatedData.email}
Subject: ${validatedData.subject}

Message:
${validatedData.message}

---
Technical Details:
IP Address: ${ipAddress}
User Agent: ${userAgent}

This email was sent from the DukaNest contact form. Please reply directly to ${validatedData.email} to respond.
    `.trim();

    // Send email to support@dukanest.com
    const emailResult = await sendUnifiedEmail({
      to: 'support@dukanest.com',
      subject: `Contact Form: ${validatedData.subject}`,
      html: htmlContent,
      text: textContent,
      fromName: 'DukaNest Contact Form',
      replyTo: validatedData.email, // Set reply-to to the sender's email
    });

    if (!emailResult.success) {
      console.error('Failed to send contact form email:', emailResult.error);
      return NextResponse.json(
        {
          error: 'Failed to send message. Please try again later.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Message sent successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid form data',
          errors: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'development'
            ? (error instanceof Error ? error.message : 'Failed to process contact form')
            : 'Failed to send message. Please try again later.',
      },
      { status: 500 }
    );
  }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
