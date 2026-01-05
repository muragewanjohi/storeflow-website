/**
 * Analytics Tracking API
 * 
 * Stores analytics events in the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const headersList = request.headers;
    
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

    // Validate user_id exists in admins table before using it
    // This prevents foreign key constraint violations
    let validUserId: string | null = null;
    if (userId) {
      try {
        const admin = await prisma.admins.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (admin) {
          validUserId = userId;
        } else {
          // User ID provided but doesn't exist in admins table
          // Log warning but continue without user_id
          console.warn(`Analytics tracking: user_id ${userId} not found in admins table, tracking without user_id`);
        }
      } catch (error) {
        // If validation fails, just log and continue without user_id
        console.warn('Error validating user_id for analytics tracking:', error);
      }
    }

    // Create data object, only include country if column exists
    const trackingData: any = {
      user_id: validUserId,
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
    
    // Provide more detailed error information in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to store analytics',
        ...(isDevelopment && { details: errorMessage }),
      },
      { status: 500 }
    );
  }
}

