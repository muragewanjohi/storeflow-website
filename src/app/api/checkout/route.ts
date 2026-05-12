/**
 * Checkout API Route
 * 
 * POST: Create order from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { checkoutSchema } from '@/lib/orders/validation';
import { generateOrderNumber } from '@/lib/orders/utils';
import { getOrCreateCustomer } from '@/lib/customers/get-customer';
import { sendOrderPlacedEmail, sendNewOrderAlertEmail } from '@/lib/orders/emails';
import { canCreateOrder } from '@/lib/subscriptions/limits';
import { syncProductStockFromVariants } from '@/lib/inventory/sync-product-stock';
import { requireNotDemoStore } from '@/lib/demo-store/restrictions';
import { getSessionId } from '@/lib/cart/session';
import { getStaticOptions } from '@/lib/settings/static-options';
import { getTenantAccessRestriction } from '@/lib/tenant-context/access-control';
import { getCheckoutShippingContext } from '@/lib/checkout/effective-shipping';
import { sendTikTokServerEvent } from '@/lib/analytics/tiktok-events-api';
import { dispatchNotificationToTenantDevices } from '@/lib/notifications/mobile-push';
import { getTenantStoreUrl } from '@/lib/subscriptions/tenant-url';
import { getTumiziTenantConfigByTenantId } from '@/lib/tumizi/config';
import { normalizeKenyaMsisdnForTumizi } from '@/lib/tumizi/phone';
import { initiateTumiziCustomerPaymentForOrder } from '@/lib/tumizi/initiate-order-payment';
import { rollbackCheckoutAfterFailedTumizi } from '@/lib/checkout/rollback-after-failed-tumizi';

/**
 * POST /api/checkout - Create order from cart
 * 
 * Supports both authenticated users and guest checkout
 * Guest checkout requires email in shipping_address
 */
export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    
    const validatedData = checkoutSchema.parse(body);

    const checkoutPaySettings = await getStaticOptions(tenant.id, [
      'payment_cash_enabled',
      'payment_mpesa_enabled',
    ]);
    const tumiziCfgCheckout = await getTumiziTenantConfigByTenantId(tenant.id);
    const tumiziCheckoutLive =
      tumiziCfgCheckout?.enabled === true && !!tumiziCfgCheckout?.merchantExternalId;

    const cashAllowed =
      checkoutPaySettings.payment_cash_enabled === 'true' ||
      checkoutPaySettings.payment_cash_enabled === null;
    const mpesaAllowed = checkoutPaySettings.payment_mpesa_enabled === 'true';

    if (validatedData.payment_method === 'cash' && !cashAllowed) {
      return NextResponse.json(
        { error: 'Cash payments are not enabled for this store.' },
        { status: 400 },
      );
    }
    if (validatedData.payment_method === 'mpesa' && !mpesaAllowed) {
      return NextResponse.json(
        { error: 'M-Pesa is not enabled for this store.' },
        { status: 400 },
      );
    }
    if (validatedData.payment_method === 'tumizi' && !tumiziCheckoutLive) {
      return NextResponse.json(
        {
          error:
            'Automatic M-Pesa checkout is not ready for this store yet. Choose another payment method or try again later.',
        },
        { status: 400 },
      );
    }

    // Check tenant access level - block checkout for expired/suspended tenants
    const accessRestriction = getTenantAccessRestriction(tenant);
    if (!accessRestriction.canProcessOrders) {
      return NextResponse.json(
        { 
          error: 'Store temporarily unavailable',
          message: accessRestriction.reason || 'This store is currently unable to process orders. Please try again later or contact the store owner.',
        },
        { status: 403 }
      );
    }

    // Prevent purchases on demo stores
    await requireNotDemoStore(tenant.id, 'Purchases');

    // Check plan limits before creating order
    const limitCheck = await canCreateOrder(tenant);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.reason || 'Order limit reached' },
        { status: 403 }
      );
    }

    // Try to get authenticated user (optional for guest checkout)
    const user = await getUser();
    let customerId: string | null = null;
    let sessionId: string | null = null;
    
    if (user) {
      // Authenticated user - get or create customer record
      customerId = await getOrCreateCustomer(user, tenant.id);
    } else {
      // Guest checkout - use session ID for cart clearing
      sessionId = await getSessionId();
      
      // For guest checkout, we can optionally create a customer record from email
      // This allows linking orders if they register later
      // For now, we'll leave customerId as null for guest orders
    }

    // Get cart items from the request (validated)
    const cartItems = validatedData.items;

    // Validate all items exist and have sufficient stock
    const orderItems: Array<{
      product_id: string;
      variant_id: string | null;
      quantity: number;
      price: number;
      unit_cost_at_sale: number;
      cogs_total: number;
      total: number;
    }> = [];
    let totalAmount = 0;

    for (const item of cartItems) {
      const product = await prisma.products.findFirst({
        where: {
          id: item.product_id,
          tenant_id: tenant.id,
        },
        select: {
          id: true,
          name: true,
          price: true,
          cost_price: true,
          sale_price: true,
          stock_quantity: true,
          metadata: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found` },
          { status: 404 }
        );
      }

      const productMetadata = (product.metadata ?? {}) as Record<string, unknown>;
      const isDemoProduct =
        productMetadata.is_demo === true ||
        productMetadata.is_demo === 'true' ||
        productMetadata.source === 'starter_pack_ai';

      if (isDemoProduct) {
        return NextResponse.json(
          { error: `${product.name} is a demo product and cannot be purchased` },
          { status: 400 },
        );
      }

      let variant: { id: string; price: any; cost_price: any; stock_quantity: number | null } | null = null;
      let finalPrice = Number(product.sale_price || product.price);
      let unitCostAtSale = Number(product.cost_price || 0);
      let stockQuantity = product.stock_quantity;

      if (item.variant_id) {
        variant = await prisma.product_variants.findFirst({
          where: {
            id: item.variant_id,
            product_id: item.product_id,
            tenant_id: tenant.id,
          },
          select: {
            id: true,
            price: true,
            cost_price: true,
            stock_quantity: true,
          },
        });

        if (!variant) {
          return NextResponse.json(
            { error: `Variant ${item.variant_id} not found` },
            { status: 404 }
          );
        }

        finalPrice = variant.price ? Number(variant.price) : finalPrice;
        unitCostAtSale = variant.cost_price != null ? Number(variant.cost_price) : unitCostAtSale;
        stockQuantity = variant.stock_quantity;
      }

      // Check stock availability
      if (stockQuantity !== null && stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${stockQuantity}` },
          { status: 400 }
        );
      }

      const itemTotal = finalPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product_id: product.id,
        variant_id: variant?.id || null,
        quantity: item.quantity,
        price: finalPrice,
        unit_cost_at_sale: unitCostAtSale,
        cogs_total: unitCostAtSale * item.quantity,
        total: itemTotal,
      });
    }

    // Apply coupon discount if provided (placeholder - implement coupon logic later)
    let couponDiscounted = null;
    if (validatedData.coupon_code) {
      // TODO: Implement coupon validation and discount calculation
      // For now, we'll skip coupon logic
    }

    // Generate order number
    let orderNumber = generateOrderNumber();
    
    // Ensure order number is unique
    let existingOrder = await prisma.orders.findUnique({
      where: { order_number: orderNumber },
    });
    
    while (existingOrder) {
      orderNumber = generateOrderNumber();
      existingOrder = await prisma.orders.findUnique({
        where: { order_number: orderNumber },
      });
    }

    // Determine delivery method and address
    const deliveryMethod = validatedData.delivery_method || 'delivery';
    const isPickup = deliveryMethod === 'pickup';

    const shippingOpts = await getStaticOptions(tenant.id, ['shipping_method_type', 'flat_rate_amount', 'shipping_enabled']);
    const shippingEnabled = shippingOpts.shipping_enabled !== 'false';
    if (!isPickup && !shippingEnabled) {
      return NextResponse.json(
        { error: 'Delivery is not available for this store. Choose store pickup if offered, or contact the store.' },
        { status: 400 },
      );
    }

    const activeDeliveryZoneCount = await prisma.delivery_zones.count({
      where: { tenant_id: tenant.id, is_active: true },
    });
    const shippingCtx = getCheckoutShippingContext({
      shippingMethodTypeStored: shippingOpts.shipping_method_type,
      activeDeliveryZoneCount,
      flatRateAmountRaw: shippingOpts.flat_rate_amount,
    });

    let resolvedDeliveryFee: number | null = null;
    let resolvedDeliveryZoneId: string | null = null;
    let resolvedDeliveryZoneName: string | null = null;
    let resolvedDeliveryFeeStatus: 'pending' | 'quoted' | 'approved' | 'rejected' | null = null;

    if (!isPickup) {
      if (shippingCtx.effectiveMethod === 'flat_rate') {
        if (shippingCtx.flatRateAmount != null) {
          resolvedDeliveryFee = shippingCtx.flatRateAmount;
          resolvedDeliveryFeeStatus = 'approved';
        } else {
          resolvedDeliveryFee =
            validatedData.delivery_fee != null && validatedData.delivery_fee > 0
              ? validatedData.delivery_fee
              : null;
          resolvedDeliveryFeeStatus = 'pending';
        }
        resolvedDeliveryZoneId = null;
        resolvedDeliveryZoneName = null;
      } else {
        if (validatedData.delivery_zone_id) {
          const zone = await prisma.delivery_zones.findFirst({
            where: {
              id: validatedData.delivery_zone_id,
              tenant_id: tenant.id,
              is_active: true,
            },
          });
          if (!zone) {
            return NextResponse.json(
              { error: 'Selected delivery zone is not valid for this store.' },
              { status: 400 },
            );
          }
          resolvedDeliveryFee = Number(zone.price);
          resolvedDeliveryZoneId = zone.id;
          resolvedDeliveryZoneName = zone.name;
          resolvedDeliveryFeeStatus = 'approved';
        } else {
          resolvedDeliveryFee =
            validatedData.delivery_fee != null && validatedData.delivery_fee > 0
              ? validatedData.delivery_fee
              : null;
          resolvedDeliveryZoneId = null;
          resolvedDeliveryZoneName = validatedData.delivery_zone_name ?? null;
          resolvedDeliveryFeeStatus = 'pending';
        }
      }
    }
    
    // Get customer info from appropriate address
    const customerInfo = isPickup && validatedData.pickup_address
      ? validatedData.pickup_address
      : validatedData.shipping_address
        ? validatedData.shipping_address
        : { name: '', email: '', phone: '' };

    let tumiziPayerPhone: string | null = null;
    if (validatedData.payment_method === 'tumizi') {
      tumiziPayerPhone = normalizeKenyaMsisdnForTumizi(customerInfo.phone);
      if (!tumiziPayerPhone) {
        return NextResponse.json(
          {
            error:
              'Enter a valid Kenya M-Pesa mobile number in your contact details for payment.',
          },
          { status: 400 },
        );
      }
    }

    // Get tax settings
    const taxSettings = await getStaticOptions(tenant.id, [
      'tax_enabled',
      'default_tax_rate',
      'tax_pricing_type',
      'tax_included_in_price', // Keep for backward compatibility
    ]);
    
    const taxEnabled = taxSettings.tax_enabled === 'true';
    const taxRate = taxSettings.default_tax_rate ? parseFloat(taxSettings.default_tax_rate) : null;
    const taxPricingType = taxSettings.tax_pricing_type || (taxSettings.tax_included_in_price === 'true' ? 'inclusive' : 'exclusive');
    
    // Calculate subtotal (before tax and delivery)
    let subtotal = totalAmount - (couponDiscounted || 0);
    
    // Calculate tax
    let taxAmount = 0;
    if (taxEnabled && taxRate) {
      const taxRateDecimal = taxRate / 100;
      if (taxPricingType === 'inclusive') {
        // Tax is included in price, calculate what portion is tax
        taxAmount = subtotal - (subtotal / (1 + taxRateDecimal));
      } else {
        // Tax is added on top
        taxAmount = subtotal * taxRateDecimal;
      }
    }
    
    // Calculate total with tax and delivery fee
    let finalTotal = subtotal;
    if (taxEnabled && taxRate && taxPricingType === 'exclusive') {
      finalTotal += taxAmount; // Add tax if exclusive
    }
    // If inclusive, tax is already in subtotal
    
    if (!isPickup && resolvedDeliveryFee != null && resolvedDeliveryFee > 0) {
      finalTotal += resolvedDeliveryFee;
    }

    // Generate invoice number
    const { generateInvoiceNumber } = await import('@/lib/invoices/generate-invoice-number');
    const invoiceNumber = await generateInvoiceNumber(tenant.id);

    // Create order
    // For guest orders, user_id will be null (order tracked by email + order_number)
    const order = await prisma.orders.create({
      data: {
        tenant_id: tenant.id,
        order_number: orderNumber,
        invoice_number: invoiceNumber,
        user_id: customerId, // null for guest orders
        name: customerInfo.name,
        email: customerInfo.email,
        phone: customerInfo.phone,
        total_amount: finalTotal,
        status: 'pending',
        // Never trust client-submitted payment verification payloads for paid status.
        // Payment state is promoted to "paid" only from verified provider callbacks.
        payment_status: 'pending',
        payment_gateway:
          validatedData.payment_method === 'tumizi'
            ? 'tumizi'
            : validatedData.payment_method,
        transaction_id:
          validatedData.payment_method === 'tumizi'
            ? null
            : validatedData.payment_verification?.transaction_id || null,
        payment_meta:
          validatedData.payment_method === 'tumizi'
            ? null
            : validatedData.payment_verification
              ? JSON.parse(JSON.stringify({
                  transaction_id: validatedData.payment_verification.transaction_id,
                  reference: validatedData.payment_verification.reference,
                  notes: validatedData.payment_verification.notes,
                  submitted_at: new Date().toISOString(),
                  verification_status: 'pending', // pending, verified, rejected
                }))
              : null,
        shipping_address: isPickup 
          ? (validatedData.pickup_address as any)
          : (validatedData.shipping_address as any),
        billing_address: (validatedData.billing_address || validatedData.shipping_address || validatedData.pickup_address) as any,
        coupon: validatedData.coupon_code || null,
        coupon_discounted: couponDiscounted,
        message: validatedData.notes || null,
        checkout_type: isPickup ? 'pickup' : 'delivery',
        delivery_zone_id: resolvedDeliveryZoneId,
        delivery_zone_name: resolvedDeliveryZoneName,
        delivery_fee: resolvedDeliveryFee,
        delivery_fee_status: resolvedDeliveryFeeStatus,
        order_products: {
          create: orderItems.map((item: any) => ({
            tenant_id: tenant.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            user_id: customerId, // null for guest orders
            quantity: item.quantity,
            price: item.price,
            unit_cost_at_sale: item.unit_cost_at_sale,
            cogs_total: item.cogs_total,
            total: item.total,
          })),
        },
      },
      include: {
        order_products: {
          include: {
            products: {
              select: {
                id: true,
                name: true,
                image: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    // Update inventory (decrease stock)
    // Track which products have variants so we can sync product-level stock
    const productsWithVariants = new Set<string>();
    
    for (const item of orderItems) {
      if (item.variant_id) {
        // Update variant stock
        await prisma.product_variants.update({
          where: { id: item.variant_id },
          data: {
            stock_quantity: {
              decrement: item.quantity,
            },
          },
        });
        // Mark this product as having variants (for later sync)
        productsWithVariants.add(item.product_id);
      } else {
        // Update product stock (only when no variants exist)
        await prisma.products.update({
          where: { id: item.product_id },
          data: {
            stock_quantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // Sync product-level stock for products with variants
    // Product-level stock should equal the sum of all variant stocks
    for (const productId of productsWithVariants) {
      await syncProductStockFromVariants(productId, tenant.id);
    }

    if (validatedData.payment_method === 'tumizi' && tumiziPayerPhone) {
      try {
        await initiateTumiziCustomerPaymentForOrder({
          tenantId: tenant.id,
          tenantName: tenant.name,
          order: {
            id: order.id,
            order_number: order.order_number,
            invoice_number: order.invoice_number,
            total_amount: order.total_amount,
            name: order.name,
            email: order.email,
          },
          phoneNumber: tumiziPayerPhone,
          userId: customerId,
        });
      } catch (tumiziError: unknown) {
        console.error('[Checkout] Tumizi initiate failed:', tumiziError);
        await rollbackCheckoutAfterFailedTumizi({
          tenantId: tenant.id,
          orderId: order.id,
          orderItems: orderItems.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
        });
        const message =
          tumiziError instanceof Error
            ? tumiziError.message
            : 'Could not start M-Pesa payment. Please try again or choose another payment method.';
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    // Clear cart items from database
    if (customerId) {
      // Authenticated user - clear by user_id
      await prisma.cart_items.deleteMany({
        where: {
          tenant_id: tenant.id,
          user_id: customerId,
        },
      });
    } else if (sessionId) {
      // Guest user - clear by session_id
      await prisma.cart_items.deleteMany({
        where: {
          tenant_id: tenant.id,
          session_id: sessionId,
        },
      });
    }
    
    // Dispatch cart updated event (for header cart count)
    // This will be handled by the client-side event listener

    // Send email notifications (async, don't wait)
    const emailPromises = [
      sendOrderPlacedEmail({
        order: order as any, // Type assertion - order includes order_products from Prisma include
        tenant,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
      }),
      sendNewOrderAlertEmail({
        order: order as any, // Type assertion - order includes order_products from Prisma include
        tenant,
      }),
    ];

    // Send invoice email for M-Pesa orders (with payment instructions)
    if (validatedData.payment_method === 'mpesa') {
      emailPromises.push(
        (async () => {
          const { sendInvoiceEmail } = await import('@/lib/orders/invoice-email');
          return sendInvoiceEmail({
            order: order as any,
            tenant,
            customerEmail: customerInfo.email,
            customerName: customerInfo.name,
          });
        })()
      );
    }


    Promise.all(emailPromises).catch((error) => {
      console.error('Error sending order emails:', error);
      // Don't fail the order creation if emails fail
    });

    const { sendNewOrderSmsToMerchant } = await import('@/lib/sms/tenant-notifications');
    const currencyCode = ((tenant as any).currency || 'KES').toUpperCase();
    const amount = Number(order.total_amount);
    const totalLabel = currencyCode === 'KES'
      ? `KSh ${new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 }).format(amount)}`
      : `${currencyCode} ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;

    void sendNewOrderSmsToMerchant({
      tenantId: tenant.id,
      countryIso2: tenant.country,
      orderNumber: order.order_number,
      storeName: tenant.name || tenant.subdomain || 'your store',
      totalLabel,
      ordersUrl: getTenantStoreUrl(tenant as any, '/orders'),
    }).catch((error) => {
      console.error('[Checkout] Failed to send new-order SMS:', error);
    });

    // Send immediate notification email separately (different return type)
    (async () => {
      try {
        const { sendImmediateNotificationEmail } = await import('@/lib/notifications/email');
        const paymentStatusLabel = order.payment_status === 'pending' ? 'Pending payment' : 'Paid';
        const notification = {
          id: `order-${order.id}`,
          type: 'new_order' as const,
          title: 'New Order',
          message: `Order ${order.order_number} - $${Number(order.total_amount).toFixed(2)} (${paymentStatusLabel})`,
          link: `/dashboard/orders/${order.id}`,
          created_at: order.created_at || new Date(),
          read: false,
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            amount: Number(order.total_amount),
          },
        };

        await sendImmediateNotificationEmail({
          tenant,
          notification,
        });

        await dispatchNotificationToTenantDevices({
          tenantId: tenant.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
        });
      } catch (error) {
        console.error('Error sending notification email:', error);
      }
    })();

    const checkoutEventId = `order_${order.id}`;
    const checkoutProperties = {
      value: Number(order.total_amount),
      currency: ((tenant as any).currency || 'KES').toUpperCase(),
      content_type: 'product',
      contents: orderItems.map((item) => ({
        content_id: item.product_id,
        content_type: 'product',
        content_name:
          (order as any).order_products?.find((p: any) => p.product_id === item.product_id)?.products?.name ||
          item.product_id,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    sendTikTokServerEvent({
      request,
      event: 'PlaceAnOrder',
      eventId: checkoutEventId,
      email: customerInfo.email || null,
      phoneNumber: customerInfo.phone || null,
      externalId: customerId ?? sessionId ?? order.id,
      properties: checkoutProperties,
    }).catch((error) => {
      console.error('Error sending TikTok checkout event:', error);
    });

    if (order.payment_status === 'paid') {
      sendTikTokServerEvent({
        request,
        event: 'Purchase',
        eventId: `${checkoutEventId}_purchase`,
        email: customerInfo.email || null,
        phoneNumber: customerInfo.phone || null,
        externalId: customerId ?? sessionId ?? order.id,
        properties: checkoutProperties,
      }).catch((error) => {
        console.error('Error sending TikTok purchase event:', error);
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: Number(order.total_amount),
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error during checkout:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', issues: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout' },
      { status: error.status || 500 }
    );
  }
}

