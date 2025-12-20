/**
 * Tests for Subscription Expiry Checker
 * 
 * Tests the expiry checker cron job that:
 * - Checks for expired subscriptions
 * - Applies grace period logic (2 days)
 * - Updates tenant status (expired -> suspended)
 * - Sends expired email notifications
 */

import { NextRequest } from 'next/server';
import { GET } from '../expiry-checker/route';
import { prisma } from '@/lib/prisma/client';
import { sendSubscriptionExpiredEmail } from '@/lib/subscriptions/emails';

// Mock dependencies
jest.mock('@/lib/prisma/client', () => ({
  prisma: {
    tenants: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/subscriptions/emails', () => ({
  sendSubscriptionExpiredEmail: jest.fn(),
}));

jest.mock('@/lib/subscriptions/pricing', () => ({
  getTenantSubscriptionPricing: jest.fn((tenant, plan, isKES) => ({
    planName: plan.name,
    price: plan.price,
    currency: isKES ? 'KES' : 'USD',
    currencySymbol: isKES ? 'Ksh' : '$',
  })),
}));

describe('Subscription Expiry Checker', () => {
  const mockRequest = (token?: string) => {
    const headers = new Headers();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return {
      headers,
    } as NextRequest;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET_TOKEN = 'test-secret-token';
    process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS = '2';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET_TOKEN;
    delete process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS;
  });

  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      const request = mockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should reject requests with invalid token', async () => {
      const request = mockRequest('wrong-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.message).toBe('Unauthorized');
    });

    it('should accept requests with valid token', async () => {
      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([]);
      const request = mockRequest('test-secret-token');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Grace Period Logic', () => {
    it('should mark tenant as expired if within grace period (1 day expired)', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const mockTenant = {
        id: 'tenant-1',
        name: 'Test Tenant',
        expire_date: oneDayAgo,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: 'expired',
      });

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.expired).toBe(1);
      expect(data.results.gracePeriod).toBe(1);
      expect(data.results.suspended).toBe(0);

      expect(prisma.tenants.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { status: 'expired' },
      });
    });

    it('should suspend tenant if past grace period (3 days expired)', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const mockTenant = {
        id: 'tenant-2',
        name: 'Expired Tenant',
        expire_date: threeDaysAgo,
        status: 'expired',
        plan_id: 'plan-1',
        data: {},
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: 'suspended',
      });

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.expired).toBe(0);
      expect(data.results.gracePeriod).toBe(0);
      expect(data.results.suspended).toBe(1);

      expect(prisma.tenants.update).toHaveBeenCalledWith({
        where: { id: 'tenant-2' },
        data: { status: 'suspended' },
      });
    });

    it('should not process tenants without expire_date', async () => {
      const mockTenant = {
        id: 'tenant-3',
        name: 'Lifetime Tenant',
        expire_date: null,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        price_plans: null,
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.expired).toBe(0);
      expect(data.results.suspended).toBe(0);
      expect(prisma.tenants.update).not.toHaveBeenCalled();
    });

    it('should not process deleted tenants', async () => {
      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.checked).toBe(0);
    });
  });

  describe('Email Notifications', () => {
    it('should send expired email when tenant enters grace period', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const mockTenant = {
        id: 'tenant-4',
        name: 'Test Tenant',
        expire_date: oneDayAgo,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        status: 'expired',
      });
      (sendSubscriptionExpiredEmail as jest.Mock).mockResolvedValue(undefined);

      const request = mockRequest('test-secret-token');
      await GET(request);

      expect(sendSubscriptionExpiredEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: expect.objectContaining({ id: 'tenant-4' }),
          plan: expect.objectContaining({ name: 'Basic Plan' }),
        })
      );
    });

    it('should not send email if tenant already expired', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const mockTenant = {
        id: 'tenant-5',
        name: 'Already Expired',
        expire_date: oneDayAgo,
        status: 'expired', // Already expired
        plan_id: 'plan-1',
        data: {},
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);

      const request = mockRequest('test-secret-token');
      await GET(request);

      // Should not update or send email if already expired
      expect(prisma.tenants.update).not.toHaveBeenCalled();
      expect(sendSubscriptionExpiredEmail).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple tenants correctly', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const mockTenants = [
        {
          id: 'tenant-6',
          name: 'In Grace Period',
          expire_date: oneDayAgo,
          status: 'active',
          plan_id: 'plan-1',
          data: {},
          price_plans: {
            id: 'plan-1',
            name: 'Basic Plan',
            price: '29.99',
            duration_months: 1,
          },
        },
        {
          id: 'tenant-7',
          name: 'Past Grace Period',
          expire_date: threeDaysAgo,
          status: 'expired',
          plan_id: 'plan-1',
          data: {},
          price_plans: {
            id: 'plan-1',
            name: 'Basic Plan',
            price: '29.99',
            duration_months: 1,
          },
        },
      ];

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue(mockTenants);
      (prisma.tenants.update as jest.Mock).mockImplementation((args) => {
        if (args.where.id === 'tenant-6') {
          return Promise.resolve({ ...mockTenants[0], status: 'expired' });
        }
        return Promise.resolve({ ...mockTenants[1], status: 'suspended' });
      });

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.checked).toBe(2);
      expect(data.results.expired).toBe(1);
      expect(data.results.suspended).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      // Set NODE_ENV to development to get detailed error messages
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      (prisma.tenants.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      // In development mode, should contain the actual error message
      expect(data.message).toContain('Database error');

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });
});
