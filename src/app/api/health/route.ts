/**
 * Health Check API Route
 * 
 * Used by Vercel and monitoring tools to check application health
 * GET /api/health
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: string; duration?: number; error?: string }> = {};

  try {
    // Check database connection
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        duration: Date.now() - dbStart,
      };
    } catch (error: any) {
      checks.database = {
        status: 'unhealthy',
        duration: Date.now() - dbStart,
        error: error.message,
      };
    }

    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_BASE_DOMAIN',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      error: missingEnvVars.length > 0 
        ? `Missing: ${missingEnvVars.join(', ')}` 
        : undefined,
    };

    // Determine overall health
    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy'
    );

    const totalDuration = Date.now() - startTime;

    return NextResponse.json(
      {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
        duration: totalDuration,
        version: process.env.npm_package_version || '0.1.0',
      },
      {
        status: allHealthy ? 200 : 503,
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks,
      },
      { status: 503 }
    );
  }
}
