const DEFAULT_REVIEWER_EMAIL = 'playreview@dukanest.com';

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function parseBypassUntil(rawValue: string | undefined): Date | null {
  if (!rawValue || rawValue.trim().length === 0) {
    return null;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function shouldBypassMfaForReviewer(email: string | null | undefined): boolean {
  const bypassEnabled = process.env.PLAY_REVIEW_BYPASS_ENABLED === 'true';
  if (!bypassEnabled) {
    return false;
  }

  const configuredEmail = normalizeEmail(
    process.env.PLAY_REVIEW_BYPASS_EMAIL ?? DEFAULT_REVIEWER_EMAIL,
  );
  const userEmail = normalizeEmail(email);

  if (!userEmail || userEmail !== configuredEmail) {
    return false;
  }

  const bypassUntil = parseBypassUntil(process.env.PLAY_REVIEW_BYPASS_UNTIL);
  if (!bypassUntil) {
    return false;
  }

  return new Date().getTime() <= bypassUntil.getTime();
}
