/**
 * Device Fingerprinting Utilities
 * 
 * Creates a unique fingerprint for devices to enable "Remember Device" functionality
 * Uses browser characteristics, screen resolution, and other non-PII data
 */

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  browserInfo: string;
  osInfo: string;
}

/**
 * Simple hash function for client-side use
 * Uses a simple string hash (not cryptographically secure, but sufficient for fingerprinting)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate a device fingerprint from browser characteristics
 * This is called client-side and sent to the server
 */
export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') {
    throw new Error('generateDeviceFingerprint must be called client-side');
  }

  // Collect browser characteristics (non-PII)
  const nav = navigator as any; // Type assertion for optional properties
  const characteristics = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(','),
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.hardwareConcurrency || 0,
    nav.deviceMemory || 0, // Optional property
    window.devicePixelRatio || 1,
  ].filter(Boolean).join('|');

  // Create hash of characteristics (client-side compatible)
  return simpleHash(characteristics);
}

/**
 * Parse user agent to extract browser and OS info
 */
export function parseUserAgent(userAgent: string): { browser: string; os: string } {
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    const match = userAgent.match(/Firefox\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    const match = userAgent.match(/Version\/(\d+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (userAgent.includes('Edg')) {
    const match = userAgent.match(/Edg\/(\d+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (userAgent.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (userAgent.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (userAgent.includes('Windows NT 6.1')) os = 'Windows 7';
    else os = 'Windows';
  } else if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) {
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    const match = userAgent.match(/Android (\d+\.\d+)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    os = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
  }

  return { browser, os };
}

/**
 * Generate device name from browser and OS info
 */
export function generateDeviceName(userAgent: string): string {
  const { browser, os } = parseUserAgent(userAgent);
  return `${browser} on ${os}`;
}

/**
 * Extract IP pattern (first 3 octets) for pattern matching
 * This allows some IP variation (e.g., dynamic IPs from same network)
 */
export function extractIPPattern(ipAddress: string): string | null {
  if (!ipAddress) return null;

  // IPv4: Extract first 3 octets (e.g., "192.168.1" from "192.168.1.100")
  const ipv4Match = ipAddress.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (ipv4Match) {
    return ipv4Match[1];
  }

  // IPv6: Extract first 3 groups (e.g., "2001:0db8:85a3" from "2001:0db8:85a3:0000:0000:8a2e:0370:7334")
  const ipv6Match = ipAddress.match(/^([0-9a-fA-F:]+:[0-9a-fA-F:]+:[0-9a-fA-F:]+)/);
  if (ipv6Match) {
    return ipv6Match[1];
  }

  return null;
}

/**
 * Check if IP addresses are significantly different
 * Returns true if IPs are from different networks (different first 3 octets for IPv4)
 */
export function isIPSignificantlyDifferent(ip1: string | null, ip2: string | null): boolean {
  if (!ip1 || !ip2) return true; // If either is missing, consider it different

  const pattern1 = extractIPPattern(ip1);
  const pattern2 = extractIPPattern(ip2);

  if (!pattern1 || !pattern2) return true; // If we can't extract patterns, consider different

  return pattern1 !== pattern2;
}

