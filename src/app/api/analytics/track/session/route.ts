/**
 * Session Tracking API Route
 * 
 * Creates or updates a session for analytics tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    
    const {
      sessionId,
      referrer,
      deviceType,
      browser,
      os,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get IP address and user agent from headers
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Check if session exists
    const existingSession = await prisma.$queryRaw<Array<any>>`
      SELECT id FROM analytics_sessions
      WHERE tenant_id = ${tenant.id}::uuid
        AND session_id = ${sessionId}
      LIMIT 1
    `;

    if (existingSession.length > 0) {
      // Update existing session
      await prisma.$executeRaw`
        UPDATE analytics_sessions
        SET last_activity_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = ${tenant.id}::uuid
          AND session_id = ${sessionId}
      `;
    } else {
      // Create new session
      await prisma.$executeRaw`
        INSERT INTO analytics_sessions (
          tenant_id,
          session_id,
          ip_address,
          user_agent,
          referrer,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          device_type,
          browser,
          os,
          started_at,
          last_activity_at
        ) VALUES (
          ${tenant.id}::uuid,
          ${sessionId},
          ${ipAddress},
          ${userAgent},
          ${referrer || null},
          ${utm_source || null},
          ${utm_medium || null},
          ${utm_campaign || null},
          ${utm_term || null},
          ${utm_content || null},
          ${deviceType || null},
          ${browser || null},
          ${os || null},
          NOW(),
          NOW()
        )
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track session' },
      { status: 500 }
    );
  }
}
