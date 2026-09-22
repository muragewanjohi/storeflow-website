import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function secretsEqual(plain: string, hash: string): boolean {
  const hashed = hashSecret(plain);
  const a = Buffer.from(hashed);
  const b = Buffer.from(hash);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function generateAccessToken(prefix: string): { token: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString('base64url');
  const token = `${prefix}_${raw}`;
  return { token, prefix: token.slice(0, 20), hash: hashSecret(token) };
}

export function generateClaimCode(campaignName: string): string {
  const tag = campaignName.replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase() || 'OFFER';
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `${tag}-${suffix}`;
}
