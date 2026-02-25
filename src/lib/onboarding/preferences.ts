import crypto from 'crypto';

export interface EmailPreferences {
  onboarding_opt_out?: boolean;
}

const EMAIL_PREF_TOKEN_SECRET = process.env.EMAIL_PREF_TOKEN_SECRET || process.env.CRON_SECRET || 'fallback-secret-change-me';

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', EMAIL_PREF_TOKEN_SECRET).update(payload).digest('base64url');
}

export function createOnboardingUnsubscribeToken(tenantId: string, email: string): string {
  const payload = JSON.stringify({
    tenantId,
    email: email.toLowerCase().trim(),
    type: 'onboarding',
  });
  const encoded = toBase64Url(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyOnboardingUnsubscribeToken(token: string): { tenantId: string; email: string } | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  if (signature !== expected) return null;

  try {
    const raw = fromBase64Url(encoded);
    const parsed = JSON.parse(raw);
    if (!parsed?.tenantId || !parsed?.email || parsed?.type !== 'onboarding') return null;
    return {
      tenantId: String(parsed.tenantId),
      email: String(parsed.email).toLowerCase().trim(),
    };
  } catch {
    return null;
  }
}

export function getEmailPreferences(tenantData: any): EmailPreferences {
  const data = tenantData || {};
  const prefs = data.email_preferences || {};
  return {
    onboarding_opt_out: prefs.onboarding_opt_out === true,
  };
}

export function canSendOnboardingEmail(tenantData: any): boolean {
  const prefs = getEmailPreferences(tenantData);
  return !prefs.onboarding_opt_out;
}

