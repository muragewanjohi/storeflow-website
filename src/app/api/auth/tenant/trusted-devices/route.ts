/**
 * API Route: Trusted Devices Management
 * 
 * GET /api/auth/tenant/trusted-devices - List user's trusted devices
 * POST /api/auth/tenant/trusted-devices - Create/update trusted device
 * DELETE /api/auth/tenant/trusted-devices/[id] - Revoke trusted device
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getUserTrustedDevices, revokeTrustedDevice, revokeAllTrustedDevices } from '@/lib/auth/trusted-devices';

/**
 * GET /api/auth/tenant/trusted-devices
 * Get all trusted devices for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const devices = await getUserTrustedDevices(user.id);

    return NextResponse.json({
      success: true,
      devices: devices.map((device) => ({
        id: device.id,
        deviceName: device.device_name,
        browserInfo: device.browser_info,
        osInfo: device.os_info,
        lastUsedAt: device.last_used_at,
        expiresAt: device.expires_at,
        createdAt: device.created_at,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching trusted devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trusted devices', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/tenant/trusted-devices
 * Revoke all trusted devices or a specific device
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const revokeAll = searchParams.get('revokeAll') === 'true';

    if (revokeAll) {
      const count = await revokeAllTrustedDevices(user.id);
      return NextResponse.json({
        success: true,
        message: `Revoked ${count} trusted device(s)`,
      });
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const revoked = await revokeTrustedDevice(deviceId, user.id);

    if (!revoked) {
      return NextResponse.json(
        { error: 'Device not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device revoked successfully',
    });
  } catch (error: any) {
    console.error('Error revoking trusted device:', error);
    return NextResponse.json(
      { error: 'Failed to revoke device', message: error.message },
      { status: 500 }
    );
  }
}

