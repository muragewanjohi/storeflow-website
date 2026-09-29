import { createVendorSessionToken, hashVendorPassword, vendorPasswordMatches } from '../vendor-auth';

describe('vendor portal passwords', () => {
  it('accepts the password that was set and rejects a different one', async () => {
    const hash = await hashVendorPassword('store-portal-1');
    expect(hash).not.toContain('store-portal-1');
    await expect(vendorPasswordMatches('store-portal-1', hash)).resolves.toBe(true);
    await expect(vendorPasswordMatches('wrong-password', hash)).resolves.toBe(false);
  });

  it('issues a session token that is not the same as its stored hash', () => {
    const session = createVendorSessionToken();
    expect(session.token).toHaveLength(64);
    expect(session.hash).not.toBe(session.token);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
