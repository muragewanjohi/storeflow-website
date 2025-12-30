# Subscription Expiry Best Practices

**Last Updated:** 2024

---

## Overview

This document outlines best practices for handling tenant subscription expiry, including grace periods, access restrictions, data preservation, and restoration processes.

---

## Current Implementation

### Expiry Workflow

The system follows a **grace period** approach:

1. **Active Status** → Tenant has full access
2. **Expired Status** (0-2 days) → Grace period, access maintained
3. **Suspended Status** (>2 days) → Access blocked, must renew

### Timeline

```
┌─────────┐      ┌──────────┐      ┌───────────┐
│ Active  │ ───> │ Expired  │ ───> │ Suspended │
│         │      │ (0-2 days)│      │ (>2 days) │
│ Full    │      │ Grace    │      │ No Access │
│ Access  │      │ Period   │      │           │
└─────────┘      └──────────┘      └───────────┘
```

**Grace Period:** 2 days (configurable via `SUBSCRIPTION_GRACE_PERIOD_DAYS`)

---

## Best Practices for Expired Subscriptions

### 1. Grace Period Management

#### ✅ Recommended: 2-7 Days Grace Period

**Rationale:**
- **2 days:** Minimum for payment processing delays
- **7 days:** Maximum for customer retention without abuse
- **Industry Standard:** Most SaaS platforms use 3-7 days

**Benefits:**
- Allows time for payment processing
- Reduces accidental service interruption
- Improves customer retention
- Provides buffer for payment method updates

**Configuration:**
```env
SUBSCRIPTION_GRACE_PERIOD_DAYS=2  # Default: 2 days
```

### 2. Access Restrictions

#### During Grace Period (Expired Status)

**✅ Should Allow:**
- ✅ **Read-only access** to dashboard (view data, reports)
- ✅ **View-only access** to storefront (customers can browse)
- ✅ **Payment/renewal functionality** (ability to renew subscription)
- ✅ **Account settings** (update payment method, contact info)
- ✅ **Support access** (contact support, view tickets)

**❌ Should Restrict:**
- ❌ **Write operations** (create/edit products, orders, content)
- ❌ **New orders** (prevent new customer purchases)
- ❌ **Data exports** (prevent bulk data downloads)
- ❌ **API access** (if applicable)

#### After Grace Period (Suspended Status)

**✅ Should Allow:**
- ✅ **Login access** (to view account status)
- ✅ **Payment/renewal** (ability to renew and restore access)
- ✅ **Account settings** (update payment method)
- ✅ **Support access** (contact support)

**❌ Should Restrict:**
- ❌ **All dashboard access** (except payment/renewal)
- ❌ **Storefront access** (show "Store Temporarily Unavailable")
- ❌ **API access** (all API endpoints)
- ❌ **Data access** (read-only access to data)

### 3. Data Preservation

#### ✅ Critical: Preserve All Data

**What to Preserve:**
- ✅ **All tenant data** (products, orders, customers, content)
- ✅ **User accounts** (all tenant users remain)
- ✅ **Settings & configuration** (theme, customizations)
- ✅ **Analytics & reports** (historical data)
- ✅ **Media files** (product images, uploads)

**Why:**
- Legal compliance (data retention requirements)
- Customer trust (data is safe)
- Easy restoration (no data loss on renewal)
- Business continuity

**Implementation:**
- Data remains in database (no deletion)
- Status change only (soft restriction)
- Access control via middleware/guards

### 4. Communication Strategy

#### Email Notifications

**Before Expiry (7 days):**
- ✅ Renewal reminder emails (daily)
- ✅ Payment method reminder
- ✅ Benefits of renewal

**On Expiry (Day 0):**
- ✅ Subscription expired notification
- ✅ Grace period explanation
- ✅ Renewal instructions
- ✅ Payment link

**During Grace Period (Days 1-2):**
- ✅ Daily payment reminders
- ✅ Urgency messaging
- ✅ Support contact information

**After Suspension (Day 3+):**
- ✅ Suspension notification
- ✅ Restoration instructions
- ✅ Data preservation assurance
- ✅ Support contact

#### In-App Notifications

**Dashboard Banners:**
- ⚠️ Warning banner 7 days before expiry
- 🔴 Critical banner on expiry day
- 🚫 Suspension notice after grace period

**Storefront Messages:**
- "Store Temporarily Unavailable" page
- Renewal call-to-action
- Support contact information

### 5. Payment & Renewal

#### Payment Options

**✅ Should Provide:**
- ✅ **One-click renewal** (same plan, extend expiry)
- ✅ **Plan upgrade/downgrade** (change plan during renewal)
- ✅ **Payment method update** (update credit card)
- ✅ **Multiple payment methods** (credit card, bank transfer, etc.)

**Payment Processing:**
- ✅ Immediate access restoration on successful payment
- ✅ Automatic expiry date extension
- ✅ Status change: `suspended` → `active`
- ✅ Confirmation email

#### Renewal Flow

```
1. Tenant clicks "Renew Subscription"
2. Select plan (same or different)
3. Update payment method (if needed)
4. Process payment
5. Update expire_date in database
6. Change status: suspended → active
7. Restore full access immediately
8. Send confirmation email
```

### 6. UI/UX Considerations

#### Dashboard Experience

**Expired Status (Grace Period):**
- ⚠️ Yellow warning banner at top
- 🔒 Disabled buttons for write operations
- 💳 Prominent "Renew Now" button
- 📊 Read-only access to data
- ⏰ Countdown timer showing days remaining

**Suspended Status:**
- 🚫 Red suspension banner
- 🔐 Login redirects to renewal page
- 💳 "Restore Access" button
- 📧 Support contact information
- 📋 Account status summary

#### Storefront Experience

**Expired Status:**
- ⚠️ Banner: "Store maintenance - Please check back soon"
- ✅ Customers can browse (read-only)
- ❌ Checkout disabled
- 📧 Contact information displayed

**Suspended Status:**
- 🚫 "Store Temporarily Unavailable" page
- 💳 "Renew Subscription" call-to-action
- 📧 Support contact
- 🔄 "We'll be back soon" messaging

### 7. Restoration Process

#### Automatic Restoration

**On Successful Payment:**
1. ✅ Update `expire_date` (extend by plan duration)
2. ✅ Change `status`: `suspended` → `active`
3. ✅ Restore all access immediately
4. ✅ Send confirmation email
5. ✅ Log restoration event

**Manual Restoration (Admin):**
- Admin can manually extend expiry date
- Admin can change status to `active`
- Admin can add grace period days
- Useful for special cases or disputes

### 8. Monitoring & Alerts

#### Metrics to Track

1. **Expiry Rate:** Number of tenants expiring per day
2. **Renewal Rate:** Percentage of expired tenants that renew
3. **Grace Period Usage:** Average days in grace period before renewal
4. **Suspension Rate:** Number of tenants suspended
5. **Restoration Time:** Time from suspension to restoration

#### Alerts

- **High Expiry Rate:** Alert if many tenants expiring
- **Low Renewal Rate:** Alert if renewal rate drops
- **Payment Failures:** Alert on payment processing errors
- **Suspension Spike:** Alert if many tenants suspended

---

## Recommended Implementation Checklist

### Phase 1: Basic Expiry Handling ✅ (Completed)

- [x] Grace period implementation (2 days)
- [x] Status changes (active → expired → suspended)
- [x] Email notifications
- [x] Expiry checker cron job
- [x] Payment reminders

### Phase 2: Access Restrictions ✅ (Completed)

- [x] Read-only access during grace period ✅
- [x] Complete access block after suspension ✅
- [x] Middleware/guards for access control ✅
- [x] Storefront suspension page ✅
- [x] Dashboard restriction UI ✅
- [x] Access restriction banner component ✅
- [x] API route access checks ✅
- [x] Access control utility functions ✅
- [x] Enhanced expired/suspended pages ✅

### Phase 3: Enhanced UX (Future)

- [ ] In-app expiry warnings
- [ ] Countdown timers
- [ ] One-click renewal
- [ ] Payment method update flow
- [ ] Restoration confirmation

### Phase 4: Analytics & Monitoring (Future)

- [ ] Expiry rate dashboard
- [ ] Renewal rate tracking
- [ ] Grace period analytics
- [ ] Automated alerts
- [ ] Retention reports

---

## Industry Standards

### Grace Period Duration

| Platform | Grace Period | Notes |
|----------|--------------|-------|
| **Stripe** | 3-7 days | Configurable per subscription |
| **Shopify** | 14 days | Extended for high-value customers |
| **SaaS Platforms** | 3-7 days | Industry average |
| **E-commerce** | 2-5 days | Balance between retention and abuse |
| **StoreFlow** | 2 days | Configurable, can be increased |

### Access Restrictions

**Common Approach:**
- **Grace Period:** Read-only + payment access
- **Suspension:** Login + payment only
- **Data:** Always preserved

### Communication Frequency

**Best Practice:**
- **7 days before:** Initial reminder
- **3 days before:** Urgent reminder
- **On expiry:** Expiry notification
- **Daily during grace:** Payment reminders
- **After suspension:** Restoration instructions

---

## Configuration Options

### Environment Variables

```env
# Grace Period (days)
SUBSCRIPTION_GRACE_PERIOD_DAYS=2

# Email Settings
ENABLE_EXPIRY_EMAILS=true
ENABLE_PAYMENT_REMINDERS=true

# Access Restrictions
ENABLE_READ_ONLY_GRACE_PERIOD=true
ENABLE_COMPLETE_SUSPENSION=true
```

### Database Fields

```sql
-- Tenant status tracking
status VARCHAR(50) -- 'active', 'expired', 'suspended', 'deleted'
expire_date TIMESTAMP -- Subscription expiry date
grace_period_end TIMESTAMP -- When grace period ends (calculated)
```

---

## Summary

| Aspect | Recommendation |
|--------|----------------|
| **Grace Period** | 2-7 days (current: 2 days) |
| **Access During Grace** | Read-only + payment access |
| **Access After Suspension** | Login + payment only |
| **Data Preservation** | ✅ Always preserve all data |
| **Communication** | Daily reminders during grace period |
| **Restoration** | Immediate on successful payment |
| **UI/UX** | Clear warnings, easy renewal flow |

---

## Related Documentation

- [Subscription Management](./SUBSCRIPTION_MANAGEMENT.md)
- [Cron Jobs Monitoring](./CRON_JOBS_MONITORING.md)
- [Tenant Deletion Best Practices](./TENANT_DELETION_BEST_PRACTICES.md)
- [Payment Reminders](./SUBSCRIPTION_EMAIL_FAQ.md)

---

**Last Updated:** 2024

