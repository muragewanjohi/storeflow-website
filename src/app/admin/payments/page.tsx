/**
 * Payments Page
 * 
 * Displays payment transactions for the landlord admin
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import { TUMIZI_SUBSCRIPTION_GATEWAY } from '@/lib/subscriptions/tumizi-subscription';
import PaymentsClient from './payments-client';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  const select = {
    id: true,
    tenant_id: true,
    user_id: true,
    amount: true,
    currency: true,
    status: true,
    payment_id: true,
    transaction_id: true,
    metadata: true,
    created_at: true,
    updated_at: true,
    gateway: true,
    tenants: {
      select: {
        id: true,
        name: true,
        subdomain: true,
      },
    },
  };

  const [mpesaPayments, pesapalPayments, tumiziPayments] = await Promise.all([
    prisma.payment_logs.findMany({
      where: { gateway: 'mpesa_buy_goods' },
      orderBy: { created_at: 'desc' },
      select,
      take: 100,
    }),
    prisma.payment_logs.findMany({
      where: { gateway: 'pesapal' },
      orderBy: { created_at: 'desc' },
      select,
      take: 100,
    }),
    prisma.payment_logs.findMany({
      where: { gateway: TUMIZI_SUBSCRIPTION_GATEWAY },
      orderBy: { created_at: 'desc' },
      select,
      take: 100,
    }),
  ]);

  const payments = mpesaPayments.map((payment) => ({
    ...payment,
    amount: Number(payment.amount),
  }));
  const pesapalPaymentsList = pesapalPayments.map((payment) => ({
    ...payment,
    amount: Number(payment.amount),
  }));
  const tumiziPaymentsList = tumiziPayments.map((payment) => ({
    ...payment,
    amount: Number(payment.amount),
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-2">
          View and manage payment transactions
        </p>
      </div>
      <PaymentsClient
        payments={payments}
        pesapalPayments={pesapalPaymentsList}
        tumiziPayments={tumiziPaymentsList}
      />
    </div>
  );
}
