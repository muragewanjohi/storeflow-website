/**
 * Subdomain Validation Utilities
 * 
 * Validates subdomain names for tenant creation
 * Enforces naming rules and reserved word restrictions
 */

/**
 * List of reserved subdomain names that cannot be used by tenants
 * These are typically system routes, common services, or security-sensitive names
 */
export const RESERVED_SUBDOMAINS = [
  // System & admin
  'www',
  'admin',
  'api',
  'app',
  'dashboard',
  'landlord',
  'system',
  'root',
  
  // Common services
  'mail',
  'email',
  'smtp',
  'pop',
  'imap',
  'ftp',
  'sftp',
  'ssh',
  'dns',
  'ns1',
  'ns2',
  'mx',
  
  // Security & infrastructure
  'secure',
  'ssl',
  'tls',
  'vpn',
  'proxy',
  'gateway',
  'firewall',
  
  // Common web services
  'cdn',
  'static',
  'assets',
  'media',
  'images',
  'uploads',
  'files',
  'downloads',
  
  // Application routes
  'blog',
  'forum',
  'shop',
  'store',
  'cart',
  'checkout',
  'payment',
  'billing',
  'invoice',
  'account',
  'profile',
  'settings',
  'help',
  'support',
  'docs',
  'documentation',
  
  // Authentication
  'login',
  'logout',
  'signin',
  'signout',
  'signup',
  'register',
  'auth',
  'oauth',
  'sso',
  
  // Developer tools
  'dev',
  'development',
  'staging',
  'test',
  'testing',
  'demo',
  'sandbox',
  'preview',
  
  // Monitoring & analytics
  'status',
  'health',
  'metrics',
  'analytics',
  'stats',
  'monitoring',
  
  // Misc
  'blog',
  'news',
  'about',
  'contact',
  'terms',
  'privacy',
  'legal',
];

/**
 * Validation rules for subdomains
 */
export const SUBDOMAIN_RULES = {
  minLength: 3,
  maxLength: 63,
  pattern: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
};

/**
 * Validate subdomain name
 * @param subdomain - The subdomain to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSubdomain(subdomain: string): {
  isValid: boolean;
  error?: string;
} {
  // Check if subdomain is provided
  if (!subdomain || subdomain.trim() === '') {
    return {
      isValid: false,
      error: 'Subdomain is required',
    };
  }

  // Normalize to lowercase
  const normalizedSubdomain = subdomain.toLowerCase().trim();

  // Check length
  if (normalizedSubdomain.length < SUBDOMAIN_RULES.minLength) {
    return {
      isValid: false,
      error: `Subdomain must be at least ${SUBDOMAIN_RULES.minLength} characters`,
    };
  }

  if (normalizedSubdomain.length > SUBDOMAIN_RULES.maxLength) {
    return {
      isValid: false,
      error: `Subdomain must be no more than ${SUBDOMAIN_RULES.maxLength} characters`,
    };
  }

  // Check pattern (lowercase alphanumeric and hyphens, can't start/end with hyphen)
  if (!SUBDOMAIN_RULES.pattern.test(normalizedSubdomain)) {
    return {
      isValid: false,
      error: 'Subdomain can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.',
    };
  }

  // Check if subdomain is reserved
  if (RESERVED_SUBDOMAINS.includes(normalizedSubdomain)) {
    return {
      isValid: false,
      error: 'This subdomain is reserved and cannot be used',
    };
  }

  // Check for consecutive hyphens
  if (normalizedSubdomain.includes('--')) {
    return {
      isValid: false,
      error: 'Subdomain cannot contain consecutive hyphens',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Check if a subdomain is reserved
 * @param subdomain - The subdomain to check
 * @returns true if the subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase().trim());
}

