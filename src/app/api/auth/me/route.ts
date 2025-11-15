/**
 * API Route: Get Current User
 * 
 * GET /api/auth/me
 * 
 * Get current authenticated user information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Not authenticated',
          message: 'Please log in to access this resource'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        // Don't expose sensitive metadata
      },
    });
  } catch (error: any) {
    console.error('Error getting user:', error);
    
    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Failed to get user',
        ...(isDevelopment && { details: error.message })
      },
      { status: 500 }
    );
  }
}

