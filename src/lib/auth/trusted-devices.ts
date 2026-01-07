/**
 * Trusted Devices Management
 * 
 * Functions for managing trusted devices (Remember Device feature)
 */

import { prisma } from '@/lib/prisma/client';
import { extractIPPattern, isIPSignificantlyDifferent } from './device-fingerprint';

export interface TrustedDeviceInput {
  userId: string;
  deviceFingerprint: string;
  deviceName: string;
  browserInfo: string;
  osInfo: string;
  ipAddress: string | null;
}

/**
 * Check if a device is trusted for a user
 * Returns the trusted device record if found and valid
 */
export async function isDeviceTrusted(
  userId: string,
  deviceFingerprint: string,
  ipAddress: string | null
): Promise<{ trusted: boolean; device?: any; requiresReauth?: boolean }> {
  // Find active trusted device by fingerprint
  const trustedDevice = await prisma.trusted_devices.findFirst({
    where: {
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      expires_at: {
        gt: new Date(), // Must not be expired
      },
    },
  });

  if (!trustedDevice) {
    return { trusted: false };
  }

  // Check if IP has changed significantly
  // If IP pattern is different, require re-authentication for security
  if (isIPSignificantlyDifferent(trustedDevice.ip_address || null, ipAddress)) {
    // Update last used but don't trust (require 2FA)
    await prisma.trusted_devices.update({
      where: { id: trustedDevice.id },
      data: { last_used_at: new Date() },
    });
    return { trusted: false, requiresReauth: true };
  }

  // Device is trusted - update last used timestamp
  await prisma.trusted_devices.update({
    where: { id: trustedDevice.id },
    data: { last_used_at: new Date() },
  });

  return { trusted: true, device: trustedDevice };
}

/**
 * Create a new trusted device
 * Sets expiration to 30 days from now
 */
export async function createTrustedDevice(input: TrustedDeviceInput): Promise<any> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  const ipPattern = input.ipAddress ? extractIPPattern(input.ipAddress) : null;

  // Check if device already exists for this user
  const existing = await prisma.trusted_devices.findFirst({
    where: {
      user_id: input.userId,
      device_fingerprint: input.deviceFingerprint,
    },
  });

  if (existing) {
    // Update existing device (extend expiration)
    return await prisma.trusted_devices.update({
      where: { id: existing.id },
      data: {
        device_name: input.deviceName,
        browser_info: input.browserInfo,
        os_info: input.osInfo,
        ip_address: input.ipAddress,
        ip_pattern: ipPattern,
        last_used_at: new Date(),
        expires_at: expiresAt,
      },
    });
  }

  // Create new trusted device
  return await prisma.trusted_devices.create({
    data: {
      user_id: input.userId,
      device_fingerprint: input.deviceFingerprint,
      device_name: input.deviceName,
      browser_info: input.browserInfo,
      os_info: input.osInfo,
      ip_address: input.ipAddress,
      ip_pattern: ipPattern,
      expires_at: expiresAt,
    },
  });
}

/**
 * Get all trusted devices for a user
 */
export async function getUserTrustedDevices(userId: string) {
  return await prisma.trusted_devices.findMany({
    where: {
      user_id: userId,
      expires_at: {
        gt: new Date(), // Only active devices
      },
    },
    orderBy: {
      last_used_at: 'desc',
    },
  });
}

/**
 * Revoke a trusted device
 */
export async function revokeTrustedDevice(deviceId: string, userId: string): Promise<boolean> {
  // Verify device belongs to user
  const device = await prisma.trusted_devices.findFirst({
    where: {
      id: deviceId,
      user_id: userId,
    },
  });

  if (!device) {
    return false;
  }

  // Delete the device
  await prisma.trusted_devices.delete({
    where: { id: deviceId },
  });

  return true;
}

/**
 * Revoke all trusted devices for a user
 */
export async function revokeAllTrustedDevices(userId: string): Promise<number> {
  const result = await prisma.trusted_devices.deleteMany({
    where: {
      user_id: userId,
    },
  });

  return result.count;
}

/**
 * Clean up expired trusted devices
 * Should be run periodically (e.g., via cron job)
 */
export async function cleanupExpiredDevices(): Promise<number> {
  const result = await prisma.trusted_devices.deleteMany({
    where: {
      expires_at: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

