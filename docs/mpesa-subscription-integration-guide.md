# M-Pesa Buy Goods (Till Number) Integration Guide for Subscription Payments

## Overview

This guide provides a comprehensive implementation plan for integrating Safaricom M-Pesa Buy Goods (Till Number) API for subscription payments in DukaNest. This integration allows tenants to pay for their subscription plans using M-Pesa STK Push.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [M-Pesa API Overview](#mpesa-api-overview)
3. [Architecture & Flow](#architecture--flow)
4. [Implementation Steps](#implementation-steps)
5. [API Endpoints to Create](#api-endpoints-to-create)
6. [Database Schema Updates](#database-schema-updates)
7. [Security Considerations](#security-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Error Handling](#error-handling)
10. [References](#references)

---

## Prerequisites

### 1. Safaricom Developer Account
- Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- Create an app to get Consumer Key and Consumer Secret
- Request for a **Buy Goods Till Number** from Safaricom
- Get your **Passkey** (see [Certificates and Passkey Guide](./mpesa-certificates-and-passkey-guide.md) for details)
  - **Where to get:** Developer Portal → Your App → Complete "Go Live" process
  - **Alternative:** Contact apisupport@safaricom.co.ke with your Till Number
  - **Note:** Passkey is used to generate STK Push password, not sent directly in API calls

### 2. Environment Variables
Add the following to your `.env.local`:

```env
# M-Pesa API Credentials
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=your_till_number_here  # e.g., 300584
MPESA_PASSKEY=your_passkey_here
MPESA_ENVIRONMENT=sandbox  # or 'production' for live

# M-Pesa API URLs
MPESA_BASE_URL_SANDBOX=https://sandbox.safaricom.co.ke
MPESA_BASE_URL_PRODUCTION=https://api.safaricom.co.ke

# Callback URLs (must be publicly accessible)
MPESA_STK_PUSH_CALLBACK_URL=https://yourdomain.com/api/mpesa/subscription/callback
MPESA_STK_PUSH_TIMEOUT_URL=https://yourdomain.com/api/mpesa/subscription/timeout
```

### 3. Required M-Pesa APIs
Based on the Postman collection, you'll need:

1. **OAuth Token API** - Generate access tokens
2. **STK Push API** - Initiate payment requests
3. **STK Push Query API** - Check payment status
4. **Transaction Status Query API** - Verify completed transactions (optional)

---

## M-Pesa API Overview

### 1. OAuth Token Generation
**Endpoint:** `GET /oauth/v1/generate?grant_type=client_credentials`

**Authentication:** Basic Auth (Consumer Key:Consumer Secret)

**Response:**
```json
{
  "access_token": "ABC123...",
  "expires_in": "3599"
}
```

**Token Validity:** 1 hour (3600 seconds)

### 2. STK Push (Lipa na M-Pesa Online)
**Endpoint:** `POST /mpesa/stkpush/v1/processrequest`

**Transaction Type for Buy Goods:** `CustomerBuyGoodsOnline`

**Request Body:**
```json
{
  "BusinessShortCode": "300584",  // Your Till Number
  "Password": "base64_encoded_password",  // See password generation below
  "Timestamp": "20250925124519",  // Format: YYYYMMDDHHmmss
  "TransactionType": "CustomerBuyGoodsOnline",
  "Amount": "100",  // Amount in KES (no decimals)
  "PartyA": "254708374149",  // Customer phone number (format: 254XXXXXXXXX)
  "PartyB": "300584",  // Your Till Number
  "PhoneNumber": "254708374149",  // Customer phone number
  "CallBackURL": "https://yourdomain.com/api/mpesa/subscription/callback",
  "AccountReference": "SUB-12345",  // Unique subscription reference
  "TransactionDesc": "Subscription Payment - Plan Name"
}
```

**Password Generation:**
```typescript
// Password = Base64(SHORTCODE + PASSKEY + TIMESTAMP)
const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
```

**Response:**
```json
{
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_191220231020363123",
  "ResponseCode": "0",
  "ResponseDescription": "Success. Request accepted for processing",
  "CustomerMessage": "Success. Request accepted for processing"
}
```

### 3. STK Push Query
**Endpoint:** `POST /mpesa/stkpushquery/v1/query`

**Request Body:**
```json
{
  "BusinessShortCode": "300584",
  "Password": "base64_encoded_password",
  "Timestamp": "20250925124519",
  "CheckoutRequestID": "ws_CO_191220231020363123"
}
```

**Response:**
```json
{
  "ResponseCode": "0",
  "ResponseDescription": "The service request is processed successfully.",
  "MerchantRequestID": "29115-34620561-1",
  "CheckoutRequestID": "ws_CO_191220231020363123",
  "ResultCode": "0",  // 0 = success, 1032 = cancelled, 1037 = timeout
  "ResultDesc": "The service request is processed successfully."
}
```

### 4. Callback Response (STK Push)
When payment is completed, M-Pesa sends a callback to your `CallBackURL`:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220231020363123",
      "ResultCode": 0,  // 0 = success
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {
            "Name": "Amount",
            "Value": 100
          },
          {
            "Name": "MpesaReceiptNumber",
            "Value": "QGH7H8H8H8"
          },
          {
            "Name": "TransactionDate",
            "Value": 20250925124519
          },
          {
            "Name": "PhoneNumber",
            "Value": 254708374149
          }
        ]
      }
    }
  }
}
```

---

## Architecture & Flow

### Payment Flow Diagram

```
1. Tenant selects subscription plan
   ↓
2. Frontend calls /api/mpesa/subscription/initiate
   ↓
3. Backend generates OAuth token
   ↓
4. Backend initiates STK Push request
   ↓
5. M-Pesa sends STK Push to customer's phone
   ↓
6. Customer enters PIN and confirms
   ↓
7. M-Pesa processes payment
   ↓
8. M-Pesa sends callback to /api/mpesa/subscription/callback
   ↓
9. Backend verifies payment and activates subscription
   ↓
10. Backend sends confirmation email to tenant
```

### State Management

Payment states:
- `pending` - STK Push initiated, waiting for customer
- `processing` - Customer has entered PIN, payment processing
- `completed` - Payment successful, subscription activated
- `failed` - Payment failed or cancelled
- `timeout` - Customer didn't complete payment in time
- `cancelled` - Customer cancelled the payment

---

## Implementation Steps

### Step 1: Create M-Pesa Service Library

Create `src/lib/mpesa/mpesa-service.ts`:

```typescript
/**
 * M-Pesa Service
 * 
 * Handles all M-Pesa API interactions for subscription payments
 * Uses Buy Goods (Till Number) for subscription payments
 */

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortCode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
}

interface StkPushRequest {
  phoneNumber: string; // Format: 254XXXXXXXXX
  amount: number; // Amount in KES
  accountReference: string; // Unique subscription reference
  transactionDesc: string; // Description
  callbackUrl: string;
}

interface StkPushResponse {
  merchantRequestID: string;
  checkoutRequestID: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export class MpesaService {
  private config: MpesaConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: MpesaConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Generate OAuth access token
   * Tokens are valid for 1 hour
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date(Date.now() + 5 * 60 * 1000)) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get M-Pesa access token: ${errorText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Set expiry to 55 minutes (token is valid for 1 hour)
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

    return this.accessToken;
  }

  /**
   * Generate STK Push password
   * Password = Base64(SHORTCODE + PASSKEY + TIMESTAMP)
   */
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, '')
      .slice(0, 14);
    
    const passwordString = `${this.config.shortCode}${this.config.passkey}${timestamp}`;
    const password = Buffer.from(passwordString).toString('base64');

    return { password, timestamp };
  }

  /**
   * Initiate STK Push for subscription payment
   */
  async initiateStkPush(request: StkPushRequest): Promise<StkPushResponse> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    // Format phone number (ensure it starts with 254)
    const phoneNumber = request.phoneNumber.startsWith('254')
      ? request.phoneNumber
      : `254${request.phoneNumber.replace(/^0/, '')}`;

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerBuyGoodsOnline', // Buy Goods transaction type
      Amount: Math.round(request.amount), // M-Pesa requires whole numbers
      PartyA: phoneNumber,
      PartyB: this.config.shortCode, // Till Number
      PhoneNumber: phoneNumber,
      CallBackURL: request.callbackUrl,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    };

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STK Push failed: ${errorText}`);
    }

    const data = await response.json();

    if (data.ResponseCode !== '0') {
      throw new Error(data.ResponseDescription || 'STK Push request failed');
    }

    return {
      merchantRequestID: data.MerchantRequestID,
      checkoutRequestID: data.CheckoutRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage,
    };
  }

  /**
   * Query STK Push status
   */
  async queryStkPushStatus(checkoutRequestID: string): Promise<any> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: this.config.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID,
    };

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STK Push query failed: ${errorText}`);
    }

    return await response.json();
  }
}

// Singleton instance
let mpesaServiceInstance: MpesaService | null = null;

export function getMpesaService(): MpesaService {
  if (!mpesaServiceInstance) {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

    if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
      throw new Error('M-Pesa configuration is missing. Please check environment variables.');
    }

    mpesaServiceInstance = new MpesaService({
      consumerKey,
      consumerSecret,
      shortCode,
      passkey,
      environment,
    });
  }

  return mpesaServiceInstance;
}
```

### Step 2: Create Subscription Payment API Endpoints

#### 2.1 Initiate Payment Endpoint

Create `src/app/api/mpesa/subscription/initiate/route.ts`:

```typescript
/**
 * POST /api/mpesa/subscription/initiate
 * 
 * Initiates M-Pesa STK Push for subscription payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireAnyRole } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';

const initiatePaymentSchema = z.object({
  plan_id: z.string().uuid('Invalid plan ID'),
  phone_number: z.string().regex(/^(?:254|0)[0-9]{9}$/, 'Invalid phone number format'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin']);

    const tenant = await requireTenant();

    // Verify user belongs to tenant
    if (user.tenant_id !== tenant.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { plan_id, phone_number } = initiatePaymentSchema.parse(body);

    // Get plan details
    const plan = await prisma.price_plans.findUnique({
      where: { id: plan_id },
    });

    if (!plan || plan.status !== 'active') {
      return NextResponse.json(
        { error: 'Plan not found or inactive' },
        { status: 404 }
      );
    }

    // Calculate amount (handle proration if upgrading)
    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
        })
      : null;

    let amount = Number(plan.price);
    let proratedAmount = 0;

    // If upgrading, calculate proration
    if (currentPlan && tenant.expire_date && new Date(tenant.expire_date) > new Date()) {
      const currentPrice = Number(currentPlan.price);
      const newPrice = Number(plan.price);
      
      if (newPrice > currentPrice) {
        // Calculate prorated amount for upgrade
        const now = new Date();
        const expireDate = new Date(tenant.expire_date);
        const daysRemaining = Math.ceil(
          (expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysInCycle = 30; // Assuming monthly billing
        
        const prorated = ((newPrice - currentPrice) * daysRemaining) / daysInCycle;
        proratedAmount = Math.max(0, prorated);
        amount = proratedAmount;
      }
    }

    // Generate unique reference
    const accountReference = `SUB-${tenant.id.slice(0, 8)}-${Date.now()}`;

    // Create payment log entry
    const paymentLog = await prisma.payment_logs.create({
      data: {
        tenant_id: tenant.id,
        user_id: user.id,
        gateway: 'mpesa_buy_goods',
        amount: amount,
        currency: 'KES',
        status: 'pending',
        metadata: {
          plan_id,
          plan_name: plan.name,
          phone_number,
          account_reference: accountReference,
          prorated_amount: proratedAmount,
          is_upgrade: !!currentPlan && Number(plan.price) > Number(currentPlan.price),
        },
      },
    });

    // Get M-Pesa service
    const mpesaService = getMpesaService();

    // Get callback URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'https://yourdomain.com';
    const callbackUrl = `${baseUrl}/api/mpesa/subscription/callback`;

    // Initiate STK Push
    const stkResponse = await mpesaService.initiateStkPush({
      phoneNumber: phone_number,
      amount: amount,
      accountReference,
      transactionDesc: `Subscription: ${plan.name}`,
      callbackUrl,
    });

    // Update payment log with M-Pesa request IDs
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        payment_id: stkResponse.checkoutRequestID,
        transaction_id: stkResponse.merchantRequestID,
        metadata: {
          ...(paymentLog.metadata as any),
          checkout_request_id: stkResponse.checkoutRequestID,
          merchant_request_id: stkResponse.merchantRequestID,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: stkResponse.customerMessage,
      checkout_request_id: stkResponse.checkoutRequestID,
      payment_log_id: paymentLog.id,
    });
  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to initiate payment')
          : 'Failed to initiate payment. Please try again.',
      },
      { status: 500 }
    );
  }
}
```

#### 2.2 Callback Endpoint

Create `src/app/api/mpesa/subscription/callback/route.ts`:

```typescript
/**
 * POST /api/mpesa/subscription/callback
 * 
 * M-Pesa callback endpoint for subscription payments
 * This endpoint receives payment confirmations from M-Pesa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import {
  sendSubscriptionActivatedEmail,
  sendPlanUpgradeConfirmationEmail,
} from '@/lib/subscriptions/emails';
import {
  calculateUpgradeProration,
  getPlanChangeType,
} from '@/lib/subscriptions/proration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // M-Pesa callback structure
    const stkCallback = body.Body?.stkCallback;
    
    if (!stkCallback) {
      return NextResponse.json(
        { error: 'Invalid callback format' },
        { status: 400 }
      );
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Find payment log by checkout request ID
    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        payment_id: CheckoutRequestID,
        gateway: 'mpesa_buy_goods',
        status: 'pending',
      },
      include: {
        tenants: {
          include: {
            price_plans: true,
          },
        },
      },
    });

    if (!paymentLog) {
      console.error(`Payment log not found for CheckoutRequestID: ${CheckoutRequestID}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const tenant = paymentLog.tenants;
    const metadata = paymentLog.metadata as any;

    // Check payment result
    if (ResultCode !== 0) {
      // Payment failed, cancelled, or timed out
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: {
          status: ResultCode === 1032 ? 'cancelled' : 
                 ResultCode === 1037 ? 'timeout' : 'failed',
          metadata: {
            ...metadata,
            result_code: ResultCode,
            result_desc: ResultDesc,
            callback_received_at: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Payment status updated',
      });
    }

    // Payment successful - extract transaction details
    const callbackItems = CallbackMetadata?.Item || [];
    const amount = callbackItems.find((item: any) => item.Name === 'Amount')?.Value;
    const mpesaReceiptNumber = callbackItems.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value;
    const transactionDate = callbackItems.find((item: any) => item.Name === 'TransactionDate')?.Value;
    const phoneNumber = callbackItems.find((item: any) => item.Name === 'PhoneNumber')?.Value;

    // Verify amount matches
    if (amount !== Number(paymentLog.amount)) {
      console.error(`Amount mismatch: expected ${paymentLog.amount}, received ${amount}`);
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: {
          status: 'failed',
          metadata: {
            ...metadata,
            error: 'Amount mismatch',
            received_amount: amount,
          },
        },
      });
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
    }

    // Update payment log
    await prisma.payment_logs.update({
      where: { id: paymentLog.id },
      data: {
        status: 'completed',
        transaction_id: mpesaReceiptNumber,
        metadata: {
          ...metadata,
          mpesa_receipt_number: mpesaReceiptNumber,
          transaction_date: transactionDate,
          phone_number: phoneNumber,
          callback_received_at: new Date().toISOString(),
        },
      },
    });

    // Activate subscription
    const planId = metadata.plan_id;
    const plan = await prisma.price_plans.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      console.error(`Plan not found: ${planId}`);
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const currentPlan = tenant.plan_id
      ? await prisma.price_plans.findUnique({
          where: { id: tenant.plan_id },
        })
      : null;

    const now = new Date();
    const currentPlanPrice = currentPlan ? Number(currentPlan.price) : 0;
    const newPlanPrice = Number(plan.price);
    const changeType = getPlanChangeType(currentPlanPrice, newPlanPrice);

    // Calculate expiration date
    let newExpireDate: Date;
    if (currentPlan && tenant.expire_date && new Date(tenant.expire_date) > now) {
      // Extend from current expiration
      newExpireDate = new Date(tenant.expire_date);
      newExpireDate.setMonth(newExpireDate.getMonth() + plan.duration_months);
    } else {
      // New subscription
      newExpireDate = new Date(now);
      newExpireDate.setMonth(newExpireDate.getMonth() + plan.duration_months);
    }

    // Update tenant subscription
    const updatedTenant = await prisma.tenants.update({
      where: { id: tenant.id },
      data: {
        plan_id: planId,
        expire_date: newExpireDate,
        status: 'active',
        scheduled_plan_id: null,
        scheduled_plan_change_date: null,
      },
      include: {
        price_plans: true,
      },
    });

    // Log subscription change
    await prisma.subscription_changes.create({
      data: {
        tenant_id: tenant.id,
        from_plan_id: currentPlan?.id || null,
        to_plan_id: planId,
        change_type: currentPlan ? (changeType === 'upgrade' ? 'upgrade' : 'activation') : 'activation',
        effective_date: now,
        prorated_amount: metadata.prorated_amount || 0,
        status: 'completed',
        metadata: {
          payment_log_id: paymentLog.id,
          mpesa_receipt_number: mpesaReceiptNumber,
        },
      },
    });

    // Send confirmation email
    if (currentPlan && changeType === 'upgrade') {
      sendPlanUpgradeConfirmationEmail({
        tenant: updatedTenant as any,
        oldPlan: {
          name: currentPlan.name,
          price: currentPlanPrice,
        },
        newPlan: {
          name: plan.name,
          price: newPlanPrice,
          duration_months: plan.duration_months,
        },
        expireDate: newExpireDate,
        proratedAmount: metadata.prorated_amount || undefined,
      }).catch(console.error);
    } else {
      sendSubscriptionActivatedEmail({
        tenant: updatedTenant as any,
        plan: {
          name: plan.name,
          price: newPlanPrice,
          duration_months: plan.duration_months,
        },
        expireDate: newExpireDate,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed and subscription activated',
    });
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    // Always return 200 to M-Pesa to prevent retries
    return NextResponse.json({
      success: false,
      error: 'Callback processing failed',
    });
  }
}
```

#### 2.3 Payment Status Query Endpoint

Create `src/app/api/mpesa/subscription/status/route.ts`:

```typescript
/**
 * GET /api/mpesa/subscription/status?checkout_request_id=xxx
 * 
 * Query payment status for a subscription payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { getMpesaService } from '@/lib/mpesa/mpesa-service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const tenant = await requireTenant();

    const searchParams = request.nextUrl.searchParams;
    const checkoutRequestId = searchParams.get('checkout_request_id');

    if (!checkoutRequestId) {
      return NextResponse.json(
        { error: 'checkout_request_id is required' },
        { status: 400 }
      );
    }

    // Find payment log
    const paymentLog = await prisma.payment_logs.findFirst({
      where: {
        payment_id: checkoutRequestId,
        tenant_id: tenant.id,
        gateway: 'mpesa_buy_goods',
      },
    });

    if (!paymentLog) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // If already completed, return status
    if (paymentLog.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        payment_log: {
          id: paymentLog.id,
          amount: paymentLog.amount,
          transaction_id: paymentLog.transaction_id,
          status: paymentLog.status,
        },
      });
    }

    // Query M-Pesa for latest status
    const mpesaService = getMpesaService();
    const queryResult = await mpesaService.queryStkPushStatus(checkoutRequestId);

    // Update payment log if status changed
    if (queryResult.ResultCode === '0' && paymentLog.status !== 'completed') {
      // Payment successful - callback should have been received, but update anyway
      await prisma.payment_logs.update({
        where: { id: paymentLog.id },
        data: {
          status: 'completed',
          metadata: {
            ...(paymentLog.metadata as any),
            query_result: queryResult,
            last_queried_at: new Date().toISOString(),
          },
        },
      });
    } else if (queryResult.ResultCode !== '0') {
      // Payment failed or pending
      const statusMap: Record<string, string> = {
        '1032': 'cancelled',
        '1037': 'timeout',
        '1': 'failed',
      };
      
      const newStatus = statusMap[queryResult.ResultCode] || 'pending';
      
      if (paymentLog.status !== newStatus) {
        await prisma.payment_logs.update({
          where: { id: paymentLog.id },
          data: {
            status: newStatus,
            metadata: {
              ...(paymentLog.metadata as any),
              query_result: queryResult,
              last_queried_at: new Date().toISOString(),
            },
          },
        });
      }
    }

    return NextResponse.json({
      status: paymentLog.status,
      mpesa_result: {
        result_code: queryResult.ResultCode,
        result_desc: queryResult.ResultDesc,
      },
      payment_log: {
        id: paymentLog.id,
        amount: paymentLog.amount,
        transaction_id: paymentLog.transaction_id,
        status: paymentLog.status,
      },
    });
  } catch (error) {
    console.error('Error querying payment status:', error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Failed to query status')
          : 'Failed to query payment status',
      },
      { status: 500 }
    );
  }
}
```

### Step 3: Update Frontend Subscription Component

Update `src/app/dashboard/subscription/tenant-subscription-client.tsx` to add M-Pesa payment option:

```typescript
// Add state for M-Pesa payment
const [showMpesaPayment, setShowMpesaPayment] = useState(false);
const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
const [mpesaLoading, setMpesaLoading] = useState(false);
const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

// Add M-Pesa payment handler
const handleMpesaPayment = async (planId: string) => {
  if (!mpesaPhoneNumber) {
    setUpgradeError('Please enter your M-Pesa phone number');
    return;
  }

  setMpesaLoading(true);
  setUpgradeError(null);

  try {
    const response = await fetch('/api/mpesa/subscription/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        phone_number: mpesaPhoneNumber,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to initiate payment');
    }

    const data = await response.json();
    setCheckoutRequestId(data.checkout_request_id);
    
    // Poll for payment status
    pollPaymentStatus(data.checkout_request_id, data.payment_log_id);
  } catch (error) {
    setUpgradeError(error instanceof Error ? error.message : 'Payment initiation failed');
    setMpesaLoading(false);
  }
};

// Poll payment status
const pollPaymentStatus = async (checkoutRequestId: string, paymentLogId: string) => {
  const maxAttempts = 60; // 5 minutes (5 second intervals)
  let attempts = 0;

  const poll = async () => {
    if (attempts >= maxAttempts) {
      setMpesaLoading(false);
      setUpgradeError('Payment timeout. Please check your M-Pesa and try again.');
      return;
    }

    try {
      const response = await fetch(
        `/api/mpesa/subscription/status?checkout_request_id=${checkoutRequestId}`
      );
      const data = await response.json();

      if (data.status === 'completed') {
        setMpesaLoading(false);
        setShowMpesaPayment(false);
        setUpgradeSuccess('Payment successful! Your subscription has been activated.');
        setTimeout(() => window.location.reload(), 2000);
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        setMpesaLoading(false);
        setUpgradeError('Payment failed or was cancelled. Please try again.');
      } else {
        // Still pending, poll again
        attempts++;
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    } catch (error) {
      attempts++;
      setTimeout(poll, 5000);
    }
  };

  poll();
};

// Add M-Pesa payment UI in the upgrade section
// (Add this in the plan upgrade dialog or button click handler)
```

### Step 4: Database Schema Updates

The existing `payment_logs` table should work, but ensure it has the right structure:

```sql
-- Verify payment_logs table structure
-- Should have:
-- - gateway (VARCHAR) - store 'mpesa_buy_goods'
-- - status (VARCHAR) - 'pending', 'completed', 'failed', 'cancelled', 'timeout'
-- - metadata (JSONB) - store M-Pesa specific data
```

---

## Security Considerations

### 1. Callback URL Security
- **IP Whitelisting:** Safaricom allows IP whitelisting for production callbacks
- **Signature Verification:** Verify callback authenticity (if Safaricom provides signatures)
- **Idempotency:** Handle duplicate callbacks gracefully

### 2. Token Management
- Cache OAuth tokens (valid for 1 hour)
- Implement token refresh before expiry
- Never log or expose tokens

### 3. Phone Number Validation
- Validate phone number format (254XXXXXXXXX)
- Sanitize input to prevent injection

### 4. Amount Verification
- Always verify callback amount matches expected amount
- Handle currency conversion if needed

### 5. Error Handling
- Log all payment attempts
- Implement retry logic for transient failures
- Notify admins of payment failures

---

## Testing Strategy

### Sandbox Testing

1. **Get Sandbox Credentials:**
   - Use Safaricom Developer Portal sandbox credentials
   - Test phone numbers: 254708374149 (and others provided)

2. **Test Scenarios:**
   - ✅ Successful payment
   - ✅ Payment cancellation (user cancels)
   - ✅ Payment timeout (user doesn't respond)
   - ✅ Insufficient funds
   - ✅ Invalid phone number
   - ✅ Duplicate callbacks
   - ✅ Network failures

3. **Test Checklist:**
   - [ ] STK Push received on test phone
   - [ ] Payment completes successfully
   - [ ] Subscription activates after payment
   - [ ] Email confirmation sent
   - [ ] Payment log updated correctly
   - [ ] Callback handled correctly
   - [ ] Status query works

### Production Checklist

- [ ] Update environment variables to production
- [ ] Register production callback URLs with Safaricom
- [ ] Test with real M-Pesa account (small amount)
- [ ] Verify IP whitelisting (if applicable)
- [ ] Monitor logs for first few transactions
- [ ] Set up alerts for payment failures

---

## Error Handling

### Common M-Pesa Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 0 | Success | Process payment |
| 1 | Insufficient funds | Notify user |
| 1032 | Request cancelled by user | Allow retry |
| 1037 | Request timeout | Allow retry |
| 2001 | Invalid phone number | Validate format |
| 2002 | Invalid amount | Verify amount |

### Retry Strategy

- **STK Push Timeout:** Allow user to retry immediately
- **Network Errors:** Retry up to 3 times with exponential backoff
- **Callback Delays:** Poll status if callback not received within 2 minutes

---

## References

### Official Documentation
- [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- [M-Pesa API Documentation](https://developer.safaricom.co.ke/apis)
- [Daraja API Documentation](https://developer.safaricom.co.ke/Documentation)

### Postman Collection
- Use the provided Safaricom APIs Postman collection for testing
- Import into Postman for easy API testing

### Best Practices
- Follow Safaricom's API guidelines
- Implement proper logging and monitoring
- Handle edge cases (network failures, duplicate callbacks)
- Test thoroughly in sandbox before production

---

## Next Steps

1. **Create M-Pesa Service Library** (`src/lib/mpesa/mpesa-service.ts`)
2. **Create API Endpoints:**
   - `/api/mpesa/subscription/initiate`
   - `/api/mpesa/subscription/callback`
   - `/api/mpesa/subscription/status`
3. **Update Frontend** to include M-Pesa payment option
4. **Test in Sandbox** thoroughly
5. **Deploy to Production** after successful sandbox testing

---

## Support

For issues or questions:
- Check Safaricom Developer Portal support
- Review M-Pesa API documentation
- Test with Postman collection first
- Check application logs for detailed error messages
