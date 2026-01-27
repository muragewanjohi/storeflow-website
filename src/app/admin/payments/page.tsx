/**
 * Payments Page
 * 
 * Displays payment transactions for the landlord admin
 */

import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import PaymentsClient from './payments-client';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Fetch all Mpesa payment logs
  const mpesaPayments = await prisma.payment_logs.findMany({
    where: {
      gateway: 'mpesa_buy_goods',
    },
    orderBy: {
      created_at: 'desc',
    },
    select: {
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
      tenants: {
        select: {
          id: true,
          name: true,
          subdomain: true,
        },
      },
    },
    take: 100, // Limit to recent 100 transactions
  });

  // Convert Prisma Decimal to number for client component
  const payments = mpesaPayments.map((payment: any) => ({
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
      <PaymentsClient payments={payments} />
    </div>
  );
}
