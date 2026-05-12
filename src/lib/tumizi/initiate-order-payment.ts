import { prisma } from '@/lib/prisma/client';
import { tumiziClient } from '@/lib/tumizi/client';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { buildTumiziAccountReference } from '@/lib/tumizi/references';

export async function initiateTumiziCustomerPaymentForOrder(params: {
  tenantId: string;
  tenantName: string;
  order: {
    id: string;
    order_number: string;
    invoice_number: string | null;
    total_amount: unknown;
    name: string | null;
    email: string | null;
  };
  phoneNumber: string;
  userId?: string | null;
  narration?: string;
}): Promise<{
  externalReference: string;
  accountReference: string;
  response: Record<string, unknown>;
}> {
  const { tenantId, tenantName, order, phoneNumber, userId, narration } = params;

  const tumiziConfig = await getTumiziTenantConfigByTenantId(tenantId);
  if (!tumiziConfig?.enabled || !tumiziConfig.merchantExternalId) {
    throw new Error('Tumizi is not enabled for this store');
  }

  const amount = Number(order.total_amount);
  const externalReference = `order-${order.id}-${Date.now()}`;
  const invoiceOrOrder = order.invoice_number || order.order_number;
  const accountReference = buildTumiziAccountReference(tenantName, invoiceOrOrder);

  const response = await tumiziClient.createCustomerPayment({
    merchant_external_id: tumiziConfig.merchantExternalId,
    external_reference: externalReference,
    account_reference: accountReference,
    phone_number: phoneNumber,
    amount,
    currency: 'KES',
    description: narration || `Payment for order ${order.order_number}`,
    payer: {
      name: order.name || 'Store Customer',
      email: order.email || undefined,
      phone_number: phoneNumber,
    },
  });

  const paymentReference =
    (response?.data as Record<string, unknown> | undefined)?.payment_reference ||
    (response as Record<string, unknown>)['payment_reference'];

  await prisma.payment_logs.create({
    data: {
      tenant_id: tenantId,
      user_id: userId ?? null,
      gateway: 'tumizi_customer_payment',
      amount,
      currency: 'KES',
      status: 'pending',
      payment_id: externalReference,
      transaction_id: typeof paymentReference === 'string' ? paymentReference : null,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        account_reference: accountReference,
        source: 'tumizi_order_payment',
        external_reference: externalReference,
        response,
      } as any,
    },
  });

  await prisma.orders.update({
    where: { id: order.id },
    data: {
      payment_gateway: 'tumizi',
      payment_track: externalReference,
      payment_status: 'pending',
    },
  });

  return { externalReference, accountReference, response };
}
