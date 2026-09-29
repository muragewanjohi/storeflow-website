import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { hashToken } from '@/lib/proximity/validation';
import { VENDOR_SESSION_COOKIE } from '@/lib/proximity/vendor-auth';

export async function POST(request: NextRequest) {
  const session = request.cookies.get(VENDOR_SESSION_COOKIE)?.value;
  if (session) {
    await prisma.proximity_advertisers.updateMany({
      where: { session_token_hash: hashToken(session) },
      data: { session_token_hash: null, session_expires_at: null, updated_at: new Date() },
    });
  }
  const response = NextResponse.json({ data: { signed_out: true } });
  response.cookies.set(VENDOR_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
