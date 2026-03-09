/**
 * Account Notifications Page
 *
 * Shows customer-facing notifications, especially delivery quote actions.
 */

import Link from 'next/link';
import { requireTenant } from '@/lib/tenant-context/server';
import { getCurrentCustomer } from '@/lib/customers/get-current-customer';
import { prisma } from '@/lib/prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

function getDeliveryStatusMeta(status: string | null) {
  switch (status) {
    case 'quoted':
      return {
        label: 'Action Required',
        className: 'bg-yellow-100 text-yellow-900',
        title: 'Delivery fee quote received',
        description: 'A delivery fee quote is waiting for your approval or rejection.',
      };
    case 'approved':
      return {
        label: 'Approved',
        className: 'bg-green-100 text-green-900',
        title: 'Delivery fee quote approved',
        description: 'You approved this delivery fee quote.',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        className: 'bg-red-100 text-red-900',
        title: 'Delivery fee quote rejected',
        description: 'You rejected this delivery fee quote.',
      };
    default:
      return {
        label: 'Update',
        className: 'bg-gray-100 text-gray-800',
        title: 'Order update',
        description: 'There is an update on your order.',
      };
  }
}

export default async function AccountNotificationsPage() {
  const tenant = await requireTenant();
  const customer = await getCurrentCustomer();

  if (!customer) {
    return null;
  }

  const deliveryQuoteNotifications = await prisma.orders.findMany({
    where: {
      tenant_id: tenant.id,
      OR: [
        { user_id: customer.id },
        {
          user_id: null,
          email: {
            equals: customer.email,
            mode: 'insensitive',
          },
        },
      ],
      delivery_fee_status: {
        in: ['quoted', 'approved', 'rejected'],
      },
    },
    select: {
      id: true,
      order_number: true,
      delivery_fee_status: true,
      delivery_fee_quote: true,
      delivery_fee_notes: true,
      updated_at: true,
      created_at: true,
    },
    orderBy: {
      updated_at: 'desc',
    },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Important updates that need your attention.
        </p>
      </div>

      {deliveryQuoteNotifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deliveryQuoteNotifications.map((notification: any) => {
            const meta = getDeliveryStatusMeta(notification.delivery_fee_status);
            const timestamp = notification.updated_at || notification.created_at;

            return (
              <Card key={notification.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{meta.title}</CardTitle>
                    <Badge className={meta.className}>{meta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <p className="text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                  <div className="text-sm">
                    <p>
                      <span className="font-medium">Order:</span>{' '}
                      #{notification.order_number}
                    </p>
                    {notification.delivery_fee_quote && (
                      <p>
                        <span className="font-medium">Delivery quote:</span>{' '}
                        {Number(notification.delivery_fee_quote).toFixed(2)}
                      </p>
                    )}
                    {notification.delivery_fee_notes && (
                      <p className="line-clamp-2">
                        <span className="font-medium">Notes:</span>{' '}
                        {notification.delivery_fee_notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(timestamp || Date.now()).toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-1">
                    <Link href={`/orders/${notification.id}`}>
                      <Button size="sm" variant="outline">
                        View Order
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
