/**
 * Customer Logout API Route
 * 
 * POST: Logout customer and clear session
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/customers/auth/logout - Logout customer
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Clear customer session cookies
    cookieStore.delete('customer_session');
    cookieStore.delete('customer_email');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Error logging out customer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: error.status || 500 }
    );
  }
}

