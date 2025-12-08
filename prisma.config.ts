import { defineConfig } from "prisma/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file (Next.js convention) - only if it exists
// During build on Vercel, env vars are already set, so this is optional
try {
  config({ path: resolve(process.cwd(), ".env.local") });
} catch (error) {
  // Ignore if .env.local doesn't exist (e.g., on Vercel)
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

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: databaseUrl, // Pooled connection for queries
    directUrl: directUrl, // Direct connection for migrations
  },
});
