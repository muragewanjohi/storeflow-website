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
    
    // Read changelog
    let changelog = null;
    try {
      const changelogPath = join(process.cwd(), 'CHANGELOG.json');
      const changelogContent = readFileSync(changelogPath, 'utf-8');
      changelog = JSON.parse(changelogContent);
    } catch {
      // Changelog file not found or invalid, use empty structure
      changelog = {
        version: version,
        entries: []
      };
    }

    return NextResponse.json({
      version,
      buildTime,
      platform: 'StoreFlow',
      lastUpdated: buildTime,
      changelog: changelog.entries || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch version information', message: error.message },
      { status: 500 }
    );
  }
}
