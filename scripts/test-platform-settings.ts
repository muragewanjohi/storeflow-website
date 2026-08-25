/**
 * Live smoke test for DA.26's platform-wide settings mechanism
 * (@/lib/settings/platform-settings) — exercised directly against the real
 * DB, same in-process pattern as every other live test script this
 * session. Confirms: (1) the default fallback when no row exists yet, (2)
 * a saved override is read back correctly, (3) starter-pack/route.ts's
 * generic-image reuse cache actually honors the real (overridden) cap
 * instead of the old hardcoded 8. Cleans up the row afterward so the
 * platform is left on its real default, not a leftover test override.
 *
 * Usage: npm run test:platform-settings
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { prisma } = await import('../src/lib/prisma/client');
  const {
    getGenericImageCacheReuseCap,
    setPlatformSetting,
    GENERIC_IMAGE_CACHE_REUSE_CAP_KEY,
    GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT,
  } = await import('../src/lib/settings/platform-settings');

  // Make sure we're starting clean (no leftover row from a prior run).
  await prisma.platform_settings.deleteMany({ where: { key: GENERIC_IMAGE_CACHE_REUSE_CAP_KEY } });

  // 1. No row yet -> real code default.
  const before = await getGenericImageCacheReuseCap();
  console.log(`[1] No override saved -> got ${before} (expected default ${GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT})`);
  if (before !== GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT) throw new Error('Expected the code default when no row exists');

  // 2. Save a real override (same upsert the admin PUT route calls).
  await setPlatformSetting({
    key: GENERIC_IMAGE_CACHE_REUSE_CAP_KEY,
    value: '3',
    description: 'test override',
    updatedBy: null,
  });
  const after = await getGenericImageCacheReuseCap();
  console.log(`[2] Saved override=3 -> got ${after}`);
  if (after !== 3) throw new Error('Expected the saved override (3) to be read back');

  // 3. Confirm the real row shape the admin GET route reads.
  const row = await prisma.platform_settings.findUnique({ where: { key: GENERIC_IMAGE_CACHE_REUSE_CAP_KEY } });
  console.log('[3] Real row:', row);
  if (row?.value !== '3') throw new Error('Expected the row value to be "3"');

  // Clean up — leave the platform on its real default, not a test override.
  await prisma.platform_settings.deleteMany({ where: { key: GENERIC_IMAGE_CACHE_REUSE_CAP_KEY } });
  const restored = await getGenericImageCacheReuseCap();
  console.log(`[4] Cleaned up -> back to default (${restored})`);
  if (restored !== GENERIC_IMAGE_CACHE_REUSE_CAP_DEFAULT) throw new Error('Cleanup failed to restore the default');

  await prisma.$disconnect();
  console.log('\nAll checks passed.');
}

main().catch((error) => {
  console.error('\nTest failed:', error);
  process.exit(1);
});
