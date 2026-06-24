/**
 * Payments Client Component
 *
 * Client component for displaying payment transactions
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BanknotesIcon,
  BeakerIcon,
  CreditCardIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';

interface Payment {
  id: string;
  tenant_id: string;
  user_id: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  payment_id: string | null;
  transaction_id: string | null;
  metadata: any;
  created_at: Date | null;
  updated_at: Date | null;
  tenants: {
    id: string;
    name: string;
    subdomain: string;
  };
}

interface PaymentsClientProps {
  payments: Payment[];
  pesapalPayments?: Payment[];
  tumiziPayments?: Payment[];
}

type PaymentTab = 'mpesa' | 'pesapal' | 'tumizi';

export default function PaymentsClient({
  payments,
  pesapalPayments = [],
  tumiziPayments = [],
}: Readonly<PaymentsClientProps>) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('mpesa');
  const searchParams = useSearchParams();

  useEffect(() => {
    const pesapal = searchParams.get('pesapal');
    if (pesapal === 'success') {
      setActiveTab('pesapal');
      toast.success('PesaPal test payment completed');
    } else if (pesapal === 'error') {
      setActiveTab('pesapal');
      toast.error('PesaPal payment failed', {
        description: searchParams.get('reason') ?? undefined,
      });
    } else if (pesapal === 'cancelled') {
      toast.info('PesaPal payment was cancelled');
    }
  }, [searchParams]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500">Cancelled</Badge>;
      case 'timeout':
        return <Badge className="bg-orange-500">Timeout</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string | null) => {
    const currencyCode = currency || 'KES';
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  const tabCounts: Record<PaymentTab, number> = {
    mpesa: payments.length,
    pesapal: pesapalPayments.length,
    tumizi: tumiziPayments.length,
  };

  const tabLabels: Record<PaymentTab, string> = {
    mpesa: 'Mpesa',
    pesapal: 'PesaPal',
    tumizi: 'Tumizi',
  };

  const renderPaymentsTable = (rows: Payment[], showPlan = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tenant</TableHead>
          {showPlan ? <TableHead>Plan</TableHead> : null}
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment ID</TableHead>
          <TableHead>Transaction ID</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((payment) => {
          const planName =
            payment.metadata &&
            typeof payment.metadata === 'object' &&
            typeof payment.metadata.plan_name === 'string'
              ? payment.metadata.plan_name
              : null;

          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">
                {payment.tenants.name}
                <br />
                <code className="text-xs text-muted-foreground">
                  {payment.tenants.subdomain}
                </code>
              </TableCell>
              {showPlan ? (
                <TableCell>{planName ?? <span className="text-muted-foreground">—</span>}</TableCell>
              ) : null}
              <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
              <TableCell>{getStatusBadge(payment.status)}</TableCell>
              <TableCell>
                {payment.payment_id ? (
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {payment.payment_id.slice(0, 20)}...
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {payment.transaction_id ? (
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {payment.transaction_id}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {payment.created_at
                  ? new Date(payment.created_at).toLocaleString()
                  : '—'}
              </TableCell>
              <TableCell>
                {payment.updated_at
                  ? new Date(payment.updated_at).toLocaleString()
                  : '—'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const renderEmptyState = (
    message: string,
    action?: { href: string; label: string },
  ) => (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-4">{message}</p>
      {action ? (
        <Button asChild>
          <Link href={action.href}>
            <BeakerIcon className="mr-2 h-4 w-4" />
            {action.label}
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>
              {tabCounts[activeTab]} {tabLabels[activeTab]} transaction
              {tabCounts[activeTab] !== 1 ? 's' : ''}
              {activeTab === 'tumizi' ? ' (subscription)' : ''}
            </CardDescription>
          </div>
          {activeTab === 'mpesa' ? (
            <Button asChild>
              <Link href="/admin/payments/test-mpesa">
                <BeakerIcon className="mr-2 h-4 w-4" />
                Test Mpesa
              </Link>
            </Button>
          ) : null}
          {activeTab === 'pesapal' ? (
            <Button asChild>
              <Link href="/admin/payments/test-pesapal">
                <BeakerIcon className="mr-2 h-4 w-4" />
                Test PesaPal
              </Link>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as PaymentTab)}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="mpesa">
              <BanknotesIcon className="mr-2 h-4 w-4" />
              Mpesa
            </TabsTrigger>
            <TabsTrigger value="pesapal">
              <CreditCardIcon className="mr-2 h-4 w-4" />
              PesaPal
            </TabsTrigger>
            <TabsTrigger value="tumizi">
              <WalletIcon className="mr-2 h-4 w-4" />
              Tumizi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mpesa" className="space-y-4">
            {payments.length === 0
              ? renderEmptyState('No Mpesa transactions found', {
                  href: '/admin/payments/test-mpesa',
                  label: 'Test Mpesa Payment',
                })
              : renderPaymentsTable(payments)}
          </TabsContent>

          <TabsContent value="pesapal" className="space-y-4">
            {pesapalPayments.length === 0
              ? renderEmptyState('No PesaPal transactions found', {
                  href: '/admin/payments/test-pesapal',
                  label: 'Test PesaPal Payment',
                })
              : renderPaymentsTable(pesapalPayments)}
          </TabsContent>

          <TabsContent value="tumizi" className="space-y-4">
            {tumiziPayments.length === 0
              ? renderEmptyState('No Tumizi subscription transactions found')
              : renderPaymentsTable(tumiziPayments, true)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
