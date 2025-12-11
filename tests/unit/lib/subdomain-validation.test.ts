/**
 * Unit Tests: Subdomain Validation
 */

import { validateSubdomain, isReservedSubdomain } from '@/lib/subdomain-validation';

describe('validateSubdomain', () => {
  it('should accept valid subdomains', () => {
    expect(validateSubdomain('mystore').isValid).toBe(true);
    expect(validateSubdomain('my-store').isValid).toBe(true);
    expect(validateSubdomain('my123store').isValid).toBe(true);
    expect(validateSubdomain('abc').isValid).toBe(true); // Min length
    expect(validateSubdomain('a'.repeat(63)).isValid).toBe(true); // Max length
  });

  it('should reject empty subdomains', () => {
    const result = validateSubdomain('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject subdomains that are too short', () => {
    const result1 = validateSubdomain('ab');
    expect(result1.isValid).toBe(false);
    expect(result1.error).toContain('at least');
    
    const result2 = validateSubdomain('a');
    expect(result2.isValid).toBe(false);
  });

  it('should reject subdomains that are too long', () => {
    const result = validateSubdomain('a'.repeat(64));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('no more than');
  });

  it('should reject invalid characters', () => {
    expect(validateSubdomain('my store').isValid).toBe(false); // Spaces
    expect(validateSubdomain('my_store').isValid).toBe(false); // Underscores
    expect(validateSubdomain('my.store').isValid).toBe(false); // Dots
    expect(validateSubdomain('my@store').isValid).toBe(false); // Special chars
  });

  it('should reject subdomains starting or ending with hyphen', () => {
    expect(validateSubdomain('-mystore').isValid).toBe(false);
    expect(validateSubdomain('mystore-').isValid).toBe(false);
  });

  it('should reject consecutive hyphens', () => {
    const result = validateSubdomain('my--store');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('consecutive hyphens');
  });

  it('should reject reserved subdomains', () => {
    const reserved = ['www', 'admin', 'api', 'app', 'mail', 'ftp'];
    reserved.forEach((subdomain) => {
      const result = validateSubdomain(subdomain);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved');
    });
  });

  it('should be case-insensitive for reserved words', () => {
    expect(validateSubdomain('WWW').isValid).toBe(false);
    expect(validateSubdomain('Admin').isValid).toBe(false);
    expect(validateSubdomain('API').isValid).toBe(false);
  });
});

describe('isReservedSubdomain', () => {
  it('should identify reserved subdomains', () => {
    expect(isReservedSubdomain('www')).toBe(true);
    expect(isReservedSubdomain('admin')).toBe(true);
    expect(isReservedSubdomain('api')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isReservedSubdomain('WWW')).toBe(true);
    expect(isReservedSubdomain('Admin')).toBe(true);
  });

  it('should return false for non-reserved subdomains', () => {
    expect(isReservedSubdomain('mystore')).toBe(false);
    expect(isReservedSubdomain('my-store')).toBe(false);
  });
});

