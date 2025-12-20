/**
 * Tests for Payment Reminders
 * 
 * Tests the payment reminders cron job that:
 * - Sends renewal reminders daily for 7 days before expiry (if unpaid)
 * - Sends payment due reminders daily during grace period (2 days after expiry)
 * - Tracks reminder dates to prevent duplicates
 * - Checks payment status before sending reminders
 */

import { NextRequest } from 'next/server';
import { GET } from '../payment-reminders/route';
import { prisma } from '@/lib/prisma/client';
import { sendPaymentDueReminderEmail } from '@/lib/subscriptions/emails';
import { sendSubscriptionRenewalReminderEmail } from '@/lib/subscriptions/emails';

// Mock dependencies
jest.mock('@/lib/prisma/client', () => ({
  prisma: {
    tenants: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment_logs: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/subscriptions/emails', () => ({
  sendPaymentDueReminderEmail: jest.fn(),
  sendSubscriptionRenewalReminderEmail: jest.fn(),
}));

describe('Payment Reminders', () => {
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

    it('should accept requests with valid token', async () => {
      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]);
      const request = mockRequest('test-secret-token');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Renewal Reminders (7 days before expiry)', () => {
    it('should send renewal reminder daily for 7 days before expiry if payment is unpaid', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const mockTenant = {
        id: 'tenant-1',
        name: 'Unpaid Tenant',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {}, // No previous reminders
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      // No payment logs (unpaid)
      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        data: {
          subscription: {
            last_renewal_reminder_date: now.toISOString().split('T')[0],
            renewal_reminder_count: 1,
          },
        },
      });

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.renewal_reminders_sent).toBe(1);
      expect(sendSubscriptionRenewalReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: expect.objectContaining({ id: 'tenant-1' }),
          expireDate: fiveDaysFromNow,
        })
      );
    });

    it('should NOT send renewal reminder if payment is paid', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const mockTenant = {
        id: 'tenant-2',
        name: 'Paid Tenant',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      // Payment is complete (paid)
      const mockPayment = {
        tenant_id: 'tenant-2',
        status: 'complete',
        isPaid: true,
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([
        {
          tenant_id: 'tenant-2',
          status: 'complete',
        },
      ]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.renewal_reminders_sent).toBe(0);
      expect(sendSubscriptionRenewalReminderEmail).not.toHaveBeenCalled();
    });

    it('should send renewal reminder daily (not just once)', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockTenant = {
        id: 'tenant-3',
        name: 'Daily Reminder Tenant',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {
          subscription: {
            last_renewal_reminder_date: yesterday.toISOString().split('T')[0], // Sent yesterday
            renewal_reminder_count: 1,
          },
        },
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]); // Unpaid
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        data: {
          subscription: {
            last_renewal_reminder_date: now.toISOString().split('T')[0],
            renewal_reminder_count: 2,
          },
        },
      });

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.renewal_reminders_sent).toBe(1);
      // Should send again today (yesterday was different day)
      expect(sendSubscriptionRenewalReminderEmail).toHaveBeenCalled();
    });

    it('should NOT send duplicate reminder on same day', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      
      // Use today's date in YYYY-MM-DD format (same format stored in database)
      const todayStr = now.toISOString().split('T')[0];

      const mockTenant = {
        id: 'tenant-4',
        name: 'Already Reminded Today',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {
          subscription: {
            last_renewal_reminder_date: todayStr, // Sent today (YYYY-MM-DD format)
            renewal_reminder_count: 1,
          },
        },
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.renewal_reminders_sent).toBe(0);
      // Should not send again today
      expect(sendSubscriptionRenewalReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('Payment Due Reminders (Grace Period)', () => {
    it('should send payment due reminder daily during grace period if unpaid', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const mockTenant = {
        id: 'tenant-5',
        name: 'Expired Unpaid Tenant',
        expire_date: oneDayAgo,
        status: 'expired',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]); // Unpaid
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        data: {
          subscription: {
            last_payment_reminder_date: now.toISOString().split('T')[0],
            payment_reminder_count: 1,
          },
        },
      });

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.payment_reminders_sent).toBe(1);
      expect(sendPaymentDueReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant: expect.objectContaining({ id: 'tenant-5' }),
          amount: 29.99,
        })
      );
    });

    it('should NOT send payment reminder if payment is paid', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const mockTenant = {
        id: 'tenant-6',
        name: 'Expired Paid Tenant',
        expire_date: oneDayAgo,
        status: 'expired',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      // Payment is complete
      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([
        {
          tenant_id: 'tenant-6',
          status: 'complete',
        },
      ]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.payment_reminders_sent).toBe(0);
      expect(sendPaymentDueReminderEmail).not.toHaveBeenCalled();
    });

    it('should stop sending after grace period (2 days)', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const mockTenant = {
        id: 'tenant-7',
        name: 'Past Grace Period',
        expire_date: threeDaysAgo,
        status: 'suspended', // Already suspended
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([]); // Suspended tenants not included

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.checked).toBe(0);
      expect(sendPaymentDueReminderEmail).not.toHaveBeenCalled();
    });
  });

  describe('Payment Status Detection', () => {
    it('should detect unpaid status when no payment logs exist', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const mockTenant = {
        id: 'tenant-8',
        name: 'No Payment Logs',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]); // No payments
      (prisma.tenants.update as jest.Mock).mockResolvedValue(mockTenant);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should send reminder because unpaid
      expect(data.results.renewal_reminders_sent).toBe(1);
    });

    it('should detect paid status when payment is complete', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const mockTenant = {
        id: 'tenant-9',
        name: 'Paid Tenant',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([
        {
          tenant_id: 'tenant-9',
          status: 'complete',
          created_at: new Date(),
        },
      ]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should NOT send reminder because paid
      expect(data.results.renewal_reminders_sent).toBe(0);
    });

    it('should detect paid status when payment is trial', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const mockTenant = {
        id: 'tenant-10',
        name: 'Trial Tenant',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([
        {
          tenant_id: 'tenant-10',
          status: 'trial',
          created_at: new Date(),
        },
      ]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should NOT send reminder because trial is considered paid
      expect(data.results.renewal_reminders_sent).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tenants without expire_date', async () => {
      const mockTenant = {
        id: 'tenant-11',
        name: 'Lifetime Tenant',
        expire_date: null,
        status: 'active',
        plan_id: 'plan-1',
        data: {},
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([]); // Won't be included in query
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]);

      const request = mockRequest('test-secret-token');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results.checked).toBe(0);
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

    it('should track reminder counts correctly', async () => {
      const now = new Date();
      const fiveDaysFromNow = new Date(now);
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const mockTenant = {
        id: 'tenant-12',
        name: 'Tracking Tenant',
        expire_date: fiveDaysFromNow,
        status: 'active',
        plan_id: 'plan-1',
        data: {
          subscription: {
            renewal_reminder_count: 2,
          },
        },
        contact_email: 'tenant@example.com',
        price_plans: {
          id: 'plan-1',
          name: 'Basic Plan',
          price: '29.99',
          duration_months: 1,
        },
      };

      (prisma.tenants.findMany as jest.Mock).mockResolvedValue([mockTenant]);
      (prisma.payment_logs.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.tenants.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        data: {
          subscription: {
            last_renewal_reminder_date: now.toISOString().split('T')[0],
            renewal_reminder_count: 3,
          },
        },
      });

      const request = mockRequest('test-secret-token');
      await GET(request);

      expect(prisma.tenants.update).toHaveBeenCalledWith({
        where: { id: 'tenant-12' },
        data: {
          data: expect.objectContaining({
            subscription: expect.objectContaining({
              renewal_reminder_count: 3,
            }),
          }),
        },
      });
    });
  });
});
