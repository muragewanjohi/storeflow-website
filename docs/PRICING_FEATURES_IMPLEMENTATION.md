# Pricing Plan Features Implementation Guide

## Overview

This document outlines:
1. **Unimplemented features** from pricing plans that need to be added to the roadmap
2. **Best practices** for storing and differentiating plan features in the database
3. **Implementation recommendations** for each feature

---

## 📋 Unimplemented Features Analysis

### Current Pricing Plan Features

Based on `src/components/marketing/pricing.tsx`, the following features are listed:

#### Basic Plan
- ✅ Staff Users: 1 (Implemented - `max_staff_users` limit)
- ✅ Products: 100 (Implemented - `max_products` limit)
- ✅ Orders: 500/month (Implemented - `max_orders` limit)
- ✅ Storage: 5 GB (Implemented - `max_storage_mb` limit)
- ✅ Customers: 1,000 (Implemented - `max_customers` limit)
- ✅ Custom Pages: 10 (Implemented - `max_pages` limit)
- ✅ Blog Posts: Unlimited (Implemented - `max_blogs` limit)
- ✅ Languages: 2 (Backend implemented, frontend pending)
- ✅ Advanced Reports (Implemented - Analytics dashboard exists)
- ✅ Email Support (Implemented - Support ticket system exists)

#### Standard Plan
- ✅ Staff Users: 5 (Implemented)
- ✅ Products: 1,000 (Implemented)
- ✅ Orders: 5,000/month (Implemented)
- ✅ Storage: 25 GB (Implemented)
- ✅ Customers: 10,000 (Implemented)
- ✅ Custom Pages: 50 (Implemented)
- ✅ Blog Posts: 100 (Implemented)
- ✅ Languages: 4 (Backend implemented, frontend pending)
- ✅ Advanced Reports (Implemented)
- ❌ **Abandoned Cart Recovery** (NOT IMPLEMENTED)
- ❌ **Gift Cards** (NOT IMPLEMENTED)
- ✅ Priority Support (Implemented - Support ticket system exists)
- ⏳ **Automatic payment verification (Mpesa, Stripe) - Coming Soon** (NOT IMPLEMENTED)
- ⏳ **Add and buy custom domain - Coming Soon** (NOT IMPLEMENTED)

#### Premium Plan
- ✅ Staff Users: 10 (Implemented)
- ✅ Products: Unlimited (Implemented)
- ✅ Orders: Unlimited (Implemented)
- ✅ Storage: 200 GB (Implemented)
- ✅ Customers: Unlimited (Implemented)
- ✅ Custom Pages: Unlimited (Implemented)
- ✅ Blog Posts: Unlimited (Implemented)
- ✅ Languages: Unlimited (Backend implemented, frontend pending)
- ❌ **Advanced Analytics** (Basic analytics exists, but "Advanced" features not fully implemented)
- ❌ **Abandoned Cart Recovery** (NOT IMPLEMENTED)
- ❌ **Gift Cards** (NOT IMPLEMENTED)
- ❌ **API Access** (API routes exist, but no dedicated API key management/access control)
- ✅ Priority Support (Email + Chat) (Implemented - Support ticket system exists)
- ⏳ **Automatic payment verification (Mpesa, Stripe) - Coming Soon** (NOT IMPLEMENTED)
- ⏳ **Add and buy custom domain - Coming Soon** (NOT IMPLEMENTED)

---

## 🗄️ Database Schema for Plan Features

### Current Implementation

The `price_plans` table currently stores features as a JSON field:

```sql
CREATE TABLE price_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_months INTEGER NOT NULL,
  features JSONB DEFAULT '{}',  -- Current: stores limits only
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Current `features` JSON structure:**
```json
{
  "max_products": 100,
  "max_orders": 500,
  "max_storage_mb": 5120,
  "max_customers": 1000,
  "max_pages": 10,
  "max_blogs": -1,
  "max_staff_users": 1
}
```

### Recommended Enhanced Schema

**Best Practice:** Store both **limits** (numeric) and **feature flags** (boolean) in the same JSON field:

```json
{
  // Limits (numeric, -1 = unlimited)
  "max_products": 100,
  "max_orders": 500,
  "max_storage_mb": 5120,
  "max_customers": 1000,
  "max_pages": 10,
  "max_blogs": -1,
  "max_staff_users": 1,
  "max_languages": 2,
  
  // Feature Flags (boolean)
  "features": {
    "abandoned_cart_recovery": false,
    "gift_cards": false,
    "advanced_analytics": false,
    "api_access": false,
    "automatic_payment_verification": false,
    "custom_domain_purchase": false,
    "priority_support": false,
    "email_support": true
  }
}
```

### Alternative: Separate Feature Flags Table (Advanced)

For more complex feature management, consider a separate table:

```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES price_plans(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,  -- e.g., 'abandoned_cart_recovery'
  enabled BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',  -- Additional config for feature
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(plan_id, feature_key)
);

CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);
```

**Pros:**
- More normalized
- Easier to query "which plans have feature X"
- Can add feature-specific metadata

**Cons:**
- More complex queries
- Requires joins

**Recommendation:** Start with JSON approach, migrate to separate table if needed.

---

## 🎯 Feature Implementation Roadmap

### Priority 1: High-Value Features (Standard & Premium)

#### 1. Abandoned Cart Recovery

**Status:** ❌ Not Implemented  
**Plans:** Standard, Premium  
**Priority:** High (conversion optimization)

**Implementation:**
1. **Database Schema:**
   ```sql
   CREATE TABLE abandoned_carts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     customer_id UUID REFERENCES customers(id),
     session_id VARCHAR(255),
     cart_items JSONB NOT NULL,
     email VARCHAR(255),
     last_activity TIMESTAMP DEFAULT NOW(),
     reminder_sent BOOLEAN DEFAULT false,
     reminder_count INTEGER DEFAULT 0,
     recovered BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE INDEX idx_abandoned_carts_tenant_id ON abandoned_carts(tenant_id);
   CREATE INDEX idx_abandoned_carts_email ON abandoned_carts(email);
   CREATE INDEX idx_abandoned_carts_last_activity ON abandoned_carts(last_activity);
   ```

2. **Features:**
   - Track carts abandoned for 1+ hour
   - Send email reminders (1 hour, 24 hours, 72 hours)
   - Include discount codes in reminders
   - Track recovery rate
   - Admin dashboard for abandoned carts

3. **API Endpoints:**
   - `POST /api/abandoned-carts/track` - Track abandoned cart
   - `GET /api/abandoned-carts` - List abandoned carts (admin)
   - `POST /api/abandoned-carts/:id/recover` - Mark as recovered
   - `GET /api/abandoned-carts/stats` - Recovery statistics

4. **Cron Job:**
   - Daily job to identify abandoned carts
   - Send reminder emails based on plan feature flag

**Estimated Time:** 16-20 hours

---

#### 2. Gift Cards

**Status:** ❌ Not Implemented  
**Plans:** Standard, Premium  
**Priority:** High (revenue generation)

**Implementation:**
1. **Database Schema:**
   ```sql
   CREATE TABLE gift_cards (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     code VARCHAR(50) UNIQUE NOT NULL,
     amount DECIMAL(10,2) NOT NULL,
     balance DECIMAL(10,2) NOT NULL,
     currency VARCHAR(10) DEFAULT 'USD',
     customer_id UUID REFERENCES customers(id),  -- Purchaser
     recipient_email VARCHAR(255),
     recipient_name VARCHAR(255),
     message TEXT,
     expires_at TIMESTAMP,
     status VARCHAR(50) DEFAULT 'active',  -- active, used, expired, cancelled
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE gift_card_transactions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
     order_id UUID REFERENCES orders(id),
     amount DECIMAL(10,2) NOT NULL,
     transaction_type VARCHAR(50) NOT NULL,  -- 'purchase', 'usage', 'refund'
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE INDEX idx_gift_cards_tenant_id ON gift_cards(tenant_id);
   CREATE INDEX idx_gift_cards_code ON gift_cards(code);
   CREATE INDEX idx_gift_cards_customer_id ON gift_cards(customer_id);
   ```

2. **Features:**
   - Purchase gift cards
   - Apply gift card at checkout
   - Partial usage (remaining balance)
   - Email delivery to recipient
   - Gift card management (admin)
   - Expiration dates
   - Usage tracking

3. **API Endpoints:**
   - `POST /api/gift-cards` - Purchase gift card
   - `GET /api/gift-cards/:code/validate` - Validate gift card code
   - `POST /api/gift-cards/:code/apply` - Apply to cart
   - `GET /api/gift-cards` - List gift cards (admin)
   - `GET /api/gift-cards/my-cards` - Customer's gift cards

**Estimated Time:** 20-24 hours

---

#### 3. Advanced Analytics

**Status:** ⚠️ Partially Implemented  
**Plans:** Premium  
**Priority:** Medium (enhancement)

**Current State:**
- Basic analytics dashboard exists (`/dashboard/analytics`)
- Revenue, sales, customer, inventory reports
- Export functionality

**Missing "Advanced" Features:**
1. **Cohort Analysis**
   - Customer retention cohorts
   - Revenue cohorts
   - Product performance cohorts

2. **Funnel Analysis**
   - Conversion funnel (visitor → cart → checkout → purchase)
   - Drop-off points
   - Optimization suggestions

3. **Predictive Analytics**
   - Sales forecasting
   - Inventory predictions
   - Customer lifetime value (CLV)

4. **Custom Reports Builder**
   - Drag-and-drop report builder
   - Custom metrics
   - Scheduled reports

5. **A/B Testing Integration**
   - Test product pages
   - Test pricing strategies
   - Conversion rate optimization

**Implementation:**
- Enhance existing analytics dashboard
- Add new API endpoints for advanced metrics
- Create cohort analysis queries
- Build funnel visualization

**Estimated Time:** 32-40 hours

---

#### 4. API Access

**Status:** ⚠️ Partially Implemented  
**Plans:** Premium  
**Priority:** Medium (developer feature)

**Current State:**
- API routes exist (`/api/*`)
- Authentication via Supabase JWT
- No dedicated API key management

**Missing Features:**
1. **API Key Management**
   - Generate API keys per tenant
   - Revoke/regenerate keys
   - Key permissions/scopes
   - Rate limiting per key

2. **API Documentation**
   - OpenAPI/Swagger spec
   - Interactive API docs
   - Code examples

3. **Webhook Support**
   - Configure webhook URLs
   - Event subscriptions (order.created, product.updated, etc.)
   - Webhook retry logic
   - Webhook logs

**Implementation:**
1. **Database Schema:**
   ```sql
   CREATE TABLE api_keys (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     name VARCHAR(255) NOT NULL,
     key_hash VARCHAR(255) UNIQUE NOT NULL,  -- Hashed API key
     scopes JSONB DEFAULT '[]',  -- ['products:read', 'orders:write', etc.]
     rate_limit INTEGER DEFAULT 1000,  -- Requests per hour
     last_used_at TIMESTAMP,
     expires_at TIMESTAMP,
     status VARCHAR(50) DEFAULT 'active',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE webhooks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     url VARCHAR(500) NOT NULL,
     events JSONB NOT NULL,  -- ['order.created', 'product.updated']
     secret VARCHAR(255),  -- For webhook signature verification
     status VARCHAR(50) DEFAULT 'active',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   
   CREATE TABLE webhook_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
     event_type VARCHAR(100) NOT NULL,
     payload JSONB NOT NULL,
     response_status INTEGER,
     response_body TEXT,
     error_message TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. **API Endpoints:**
   - `POST /api/admin/api-keys` - Create API key
   - `GET /api/admin/api-keys` - List API keys
   - `DELETE /api/admin/api-keys/:id` - Revoke API key
   - `POST /api/admin/webhooks` - Create webhook
   - `GET /api/admin/webhooks` - List webhooks
   - `GET /api/admin/webhooks/:id/logs` - Webhook logs

3. **Middleware:**
   - API key authentication middleware
   - Rate limiting middleware
   - Scope checking middleware

**Estimated Time:** 24-32 hours

---

### Priority 2: Coming Soon Features

#### 5. Automatic Payment Verification (Mpesa, Stripe)

**Status:** ⏳ Coming Soon  
**Plans:** Standard, Premium  
**Priority:** Medium (payment optimization)

**Implementation:**
1. **Mpesa Integration:**
   - STK Push API integration
   - Payment status polling
   - Automatic order confirmation on payment
   - Payment verification webhook

2. **Stripe Integration:**
   - Stripe webhook for payment confirmation
   - Automatic order status updates
   - Payment intent verification

3. **Database:**
   - Add `auto_verify_payment` flag to payment gateways
   - Track verification attempts
   - Store verification results

**Estimated Time:** 16-20 hours

---

#### 6. Custom Domain Purchase

**Status:** ⏳ Coming Soon  
**Plans:** Standard, Premium  
**Priority:** Low (nice-to-have)

**Implementation:**
1. **Domain Provider Integration:**
   - Integrate with domain registrar API (Namecheap, GoDaddy, etc.)
   - Domain search and availability check
   - Domain purchase flow
   - DNS configuration automation

2. **Database:**
   ```sql
   CREATE TABLE domain_purchases (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
     domain_name VARCHAR(255) NOT NULL,
     provider VARCHAR(100) NOT NULL,
     purchase_price DECIMAL(10,2) NOT NULL,
     renewal_price DECIMAL(10,2),
     expires_at TIMESTAMP,
     status VARCHAR(50) DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Features:**
   - Domain search
   - Purchase domain
   - Auto-renewal
   - DNS management
   - SSL certificate automation (via Vercel)

**Estimated Time:** 24-32 hours

---

## 🔧 Implementation Best Practices

### 1. Feature Flag Checking

Create a utility function to check if a plan has a feature:

```typescript
// src/lib/subscriptions/features.ts
import { prisma } from '@/lib/prisma/client';
import type { Tenant } from '@/lib/tenant-context';

export interface PlanFeatures {
  abandoned_cart_recovery: boolean;
  gift_cards: boolean;
  advanced_analytics: boolean;
  api_access: boolean;
  automatic_payment_verification: boolean;
  custom_domain_purchase: boolean;
  priority_support: boolean;
  email_support: boolean;
}

export async function hasFeature(
  tenant: Tenant,
  feature: keyof PlanFeatures
): Promise<boolean> {
  if (!tenant.plan_id) {
    return false;
  }

  const plan = await prisma.price_plans.findUnique({
    where: { id: tenant.plan_id },
  });

  if (!plan || !plan.features) {
    return false;
  }

  const features = plan.features as any;
  return features.features?.[feature] === true;
}

// Usage in API routes
export async function requireFeature(
  tenant: Tenant,
  feature: keyof PlanFeatures
): Promise<void> {
  const hasAccess = await hasFeature(tenant, feature);
  if (!hasAccess) {
    throw new Error(`Feature '${feature}' is not available on your plan. Please upgrade.`);
  }
}
```

### 2. Middleware for Feature Gating

```typescript
// src/lib/subscriptions/feature-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { requireFeature } from './features';

export function withFeature(feature: keyof PlanFeatures) {
  return async (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest) => {
      const tenant = await requireTenant();
      await requireFeature(tenant, feature);
      return handler(req);
    };
  };
}

// Usage
export const POST = withFeature('gift_cards')(async (req: NextRequest) => {
  // Gift card logic here
});
```

### 3. Update Plan Features in Database

```sql
-- Update Basic Plan
UPDATE price_plans
SET features = jsonb_set(
  features,
  '{features}',
  '{"email_support": true}'::jsonb
)
WHERE name = 'Basic Plan';

-- Update Standard Plan
UPDATE price_plans
SET features = jsonb_set(
  features,
  '{features}',
  '{
    "abandoned_cart_recovery": true,
    "gift_cards": true,
    "priority_support": true,
    "email_support": true
  }'::jsonb
)
WHERE name = 'Standard Plan';

-- Update Premium Plan
UPDATE price_plans
SET features = jsonb_set(
  features,
  '{features}',
  '{
    "abandoned_cart_recovery": true,
    "gift_cards": true,
    "advanced_analytics": true,
    "api_access": true,
    "priority_support": true,
    "email_support": true
  }'::jsonb
)
WHERE name = 'Premium Plan';
```

---

## 📊 Summary

### Unimplemented Features

| Feature | Plans | Priority | Estimated Time |
|---------|-------|----------|----------------|
| Abandoned Cart Recovery | Standard, Premium | High | 16-20h |
| Gift Cards | Standard, Premium | High | 20-24h |
| Advanced Analytics | Premium | Medium | 32-40h |
| API Access | Premium | Medium | 24-32h |
| Auto Payment Verification | Standard, Premium | Medium | 16-20h |
| Custom Domain Purchase | Standard, Premium | Low | 24-32h |

**Total Estimated Time:** 132-168 hours (~3-4 weeks)

### Database Recommendations

✅ **Recommended:** Store features in JSONB within `price_plans.features`  
✅ **Structure:** Separate `limits` (numeric) and `features` (boolean)  
✅ **Future:** Consider separate `plan_features` table if complexity grows

---

**Last Updated:** 2024  
**Next Steps:** Add these features to the roadmap and prioritize implementation
