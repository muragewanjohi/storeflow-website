import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { validateSubdomain } from '@/lib/subdomain-validation';

export async function GET(request: NextRequest) {
  try {
    const subdomain = (request.nextUrl.searchParams.get('subdomain') || '')
      .trim()
      .toLowerCase();

    if (!subdomain) {
      return NextResponse.json(
        { available: false, message: 'Subdomain is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const validation = validateSubdomain(subdomain);
    if (!validation.isValid) {
      return NextResponse.json(
        { available: false, message: validation.error || 'Invalid subdomain' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const existingTenant = await prisma.tenants.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    return NextResponse.json(
      { available: !existingTenant, subdomain },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { available: false, message: 'Failed to check subdomain availability' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
