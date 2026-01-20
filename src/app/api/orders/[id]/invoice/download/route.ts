/**
 * Invoice Download API Route
 * 
 * GET: Download invoice PDF for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthOrRedirect } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { generateInvoicePDF } from '@/lib/invoices/generate-pdf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/invoice/download - Download invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication (customer or admin)
    const user = await requireAuthOrRedirect('/login');

    // Get tenant context
    const tenant = await requireTenant();

    const { id } = await params;

    // Fetch order with products
    const orderData = await prisma.orders.findFirst({
      where: {
        id,
        tenant_id: tenant.id,
      },
      include: {
        order_products: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                image: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    if (!orderData) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check authorization: customer can only view their own orders, admin/staff can view any
    if (user.role !== 'tenant_admin' && user.role !== 'tenant_staff' && user.role !== 'landlord') {
      if (orderData.user_id !== user.id) {
        // For guest orders, check email match
        if (!orderData.user_id && orderData.email !== user.email) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
        if (orderData.user_id && orderData.user_id !== user.id) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          );
        }
      }
    }

    // Determine if this should be an invoice or receipt
    const isPaid = orderData.payment_status === 'paid';
    const type = isPaid ? 'receipt' : 'invoice';

    // Format order data for PDF generation
    const order = {
      id: orderData.id,
      order_number: orderData.order_number,
      invoice_number: orderData.invoice_number,
      name: orderData.name,
      email: orderData.email,
      phone: orderData.phone,
      total_amount: orderData.total_amount,
      status: orderData.status,
      payment_status: orderData.payment_status,
      payment_gateway: orderData.payment_gateway,
      transaction_id: orderData.transaction_id,
      shipping_address: orderData.shipping_address,
      billing_address: orderData.billing_address,
      coupon: orderData.coupon,
      coupon_discounted: orderData.coupon_discounted,
      delivery_fee: orderData.delivery_fee,
      created_at: orderData.created_at,
      order_products: orderData.order_products.map((item: any) => ({
        product_name: item.products?.name || 'Unknown Product',
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.total),
        product_sku: item.products?.sku || null,
        variant_sku: null, // Could be added if variants have SKUs
      })),
    };

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(order, tenant, {
      type,
      includePaymentInstructions: type === 'invoice' && orderData.payment_gateway === 'mpesa',
    });

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${orderData.invoice_number || orderData.order_number}-${type}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
