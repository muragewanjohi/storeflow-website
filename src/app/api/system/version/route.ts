/**
 * System Version API Endpoint
 * 
 * Returns version information for the application
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Read version from package.json
    let version = '0.1.0';
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      version = packageJson.version || '0.1.0';
    } catch {
      // Fallback to default version if package.json can't be read
      version = process.env.npm_package_version || '0.1.0';
    }
    
    // Get build time from environment (set during build)
    const buildTime = process.env.BUILD_TIME || new Date().toISOString();
    
    // Get git commit hash if available (set during build)
    const commitHash = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown';
    
    // Get deployment environment
    const environment = process.env.VERCEL_ENV || 'development';
    
    // Get deployment URL
    const deploymentUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : null;

    return NextResponse.json({
      version,
      buildTime,
      commitHash,
      environment,
      deploymentUrl,
      nodeVersion: process.version,
      // Additional metadata
      platform: 'StoreFlow',
      lastUpdated: buildTime,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch version information', message: error.message },
      { status: 500 }
    );
  }
}
