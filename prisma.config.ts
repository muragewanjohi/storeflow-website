import { defineConfig } from "prisma/config";
import { resolve } from "path";

// Load .env.local file (Next.js convention) - only if it exists
// During build on Vercel, env vars are already set, so this is optional
try {
  // Try to load dotenv - it should be available as a dependency
  const dotenv = require("dotenv");
  if (dotenv && typeof dotenv.config === 'function') {
    dotenv.config({ path: resolve(process.cwd(), ".env.local") });
  }
} catch (error) {
  // Ignore if dotenv is not available or .env.local doesn't exist (e.g., on Vercel)
  // Environment variables are already set by Vercel during builds
  // This is expected and safe to ignore
}

// For prisma generate, we don't need a real DATABASE_URL
// Use a dummy URL if not provided (only needed for schema validation during generate)
// The actual DATABASE_URL will be used at runtime
// IMPORTANT: Set these BEFORE defineConfig is called to ensure they're available
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost:5432/dummy";
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;

// Debug: Log which URLs are being used (remove in production)
if (process.env.NODE_ENV !== 'production') {
  console.log('[Prisma Config] DATABASE_URL port:', databaseUrl?.match(/:(\d+)\//)?.[1] || 'unknown');
  console.log('[Prisma Config] DIRECT_URL port:', directUrl?.match(/:(\d+)\//)?.[1] || 'unknown');
  console.log('[Prisma Config] DIRECT_URL set:', !!directUrl);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl, // Connection URL for queries
    // Note: directUrl is set via DIRECT_URL env var in schema.prisma
  },
});
