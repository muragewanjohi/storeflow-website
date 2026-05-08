import { buildTumiziAccountReference } from '@/lib/tumizi/references';

describe('buildTumiziAccountReference', () => {
  it('uses full store+invoice when length fits limit', () => {
    const ref = buildTumiziAccountReference('Store', '01');
    expect(ref).toBe('STORE01');
  });

  it('prefers store name and preserves invoice tail when too long', () => {
    const ref = buildTumiziAccountReference('Something My Store', 'INV-78256231');
    expect(ref.startsWith('SOMETHINGM')).toBe(true);
    expect(ref.endsWith('31')).toBe(true);
    expect(ref.length).toBe(12);
  });

  it('never includes spaces or special characters', () => {
    const ref = buildTumiziAccountReference('My Store Ltd', 'INV 77/88');
    expect(/^[A-Z0-9]+$/.test(ref)).toBe(true);
  });

  it('is capped at 12 characters', () => {
    const ref = buildTumiziAccountReference('Very Long Store Name Here', 'INV-1234567890-ABCD');
    expect(ref.length).toBeLessThanOrEqual(12);
  });
});
