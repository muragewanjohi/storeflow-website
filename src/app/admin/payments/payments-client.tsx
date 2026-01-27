/**
 * Payments Client Component
 * 
 * Client component for displaying payment transactions
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import { BanknotesIcon, BeakerIcon } from '@heroicons/react/24/outline';

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
}

export default function PaymentsClient({ payments }: Readonly<PaymentsClientProps>) {
  const [activeTab, setActiveTab] = useState<string>('mpesa');

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Payment Transactions</CardTitle>
            <CardDescription>
              {activeTab === 'mpesa' && `${payments.length} Mpesa transaction${payments.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/payments/test-mpesa">
              <BeakerIcon className="mr-2 h-4 w-4" />
              Test Mpesa
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="mpesa">
              <BanknotesIcon className="mr-2 h-4 w-4" />
              Mpesa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mpesa" className="space-y-4">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No Mpesa transactions found
                </p>
                <Button asChild>
                  <Link href="/admin/payments/test-mpesa">
                    <BeakerIcon className="mr-2 h-4 w-4" />
                    Test Mpesa Payment
                  </Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.tenants.name}
                        <br />
                        <code className="text-xs text-muted-foreground">
                          {payment.tenants.subdomain}
                        </code>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
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
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
