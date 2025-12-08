#!/usr/bin/env node

/**
 * Generate Prisma Client
 * 
 * This script ensures DATABASE_URL is set before running prisma generate
 * This is needed for Vercel builds where env vars might not be available during postinstall
 */

// Set dummy DATABASE_URL if not provided (only needed for schema validation during generate)
// Must be set before any Prisma code is loaded
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy';
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

// Run prisma generate with the environment variables set
const { execSync } = require('child_process');

try {
  // Pass environment variables explicitly to the child process
  execSync('prisma generate', { 
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
      DIRECT_URL: process.env.DIRECT_URL,
    }
  });
  process.exit(0);
} catch (error) {
  console.error('Failed to generate Prisma client:', error.message);
  // Don't fail the build if prisma generate fails - it will be retried in prebuild
  console.warn('Warning: Prisma generate failed. Will retry in prebuild step.');
  process.exit(0); // Exit with 0 to not fail npm install
}

