/**
 * Analytics Tracking API
 * 
 * Stores analytics events in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headersList = await headers();
    
    const {
      userId,
      pagePath,
      pageTitle,
      eventName,
      eventCategory,
      eventLabel,
      eventValue,
      metadata = {},
    } = body;

    // Get IP address and user agent
    const ipAddress = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    
    // Get country from headers (if available from CDN/proxy)
    // Format: ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "KE")
    const country = headersList.get('cf-ipcountry') || 
                    headersList.get('x-vercel-ip-country') || 
                    headersList.get('x-country-code') ||
                    null;

    // Create data object, only include country if column exists
    const trackingData: any = {
      user_id: userId || null,
      page_path: pagePath || '/',
      page_title: pageTitle || null,
      event_name: eventName || null,
      event_category: eventCategory || null,
      event_label: eventLabel || null,
      event_value: eventValue ? parseFloat(String(eventValue)) : null,
      metadata: metadata,
      ip_address: ipAddress,
      user_agent: userAgent,
    };

    // Only add country if it's available (column exists in DB)
    if (country) {
      trackingData.country = country;
    }

    await prisma.analytics_tracking.create({
      data: trackingData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing analytics:', error);
    return NextResponse.json(
      { error: 'Failed to store analytics' },
      { status: 500 }
    );
  }
}

