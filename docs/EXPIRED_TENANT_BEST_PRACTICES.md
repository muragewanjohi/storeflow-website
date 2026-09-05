# Expired Tenant Handling - Best Practices

## Overview

This document explains how expired tenants are handled in DukaNest and aligns with industry best practices.

## Current Implementation

### Grace Period System

DukaNest implements a **2-day grace period** (configurable via `SUBSCRIPTION_GRACE_PERIOD_DAYS`) for expired tenants:

1. **Expiration Day (Day 0)**
   - Tenant status changes from `active` to `expired`
   - Tenant can still access dashboard in **read-only mode**
   - Payment reminders are sent daily
   - Storefront remains accessible (read-only)

2. **Grace Period (Days 1-2)**
   - Tenant continues to have read-only access
   - Can view data but cannot edit or process orders
   - Payment reminders continue
   - Storefront shows expiration notice

3. **After Grace Period (Day 3+)**
   - Tenant status changes to `suspended`
   - Access is restricted (can only login to renew)
   - Storefront shows suspension page
   - Data is preserved but not accessible

### What Gets "Deleted" or Restricted?

**Nothing is deleted.** The system follows a soft-suspension model:

- ✅ **Data is preserved** - All products, orders, customers remain in database
- ✅ **Storefront is restricted** - Shows suspension page instead of store
- ✅ **Dashboard is restricted** - Can only access renewal/payment pages
- ✅ **API access is blocked** - Cannot access tenant-specific APIs

### Status Flow

```
active → expired (grace period) → suspended → [renewal] → active
```

## Best Practices Comparison

### Industry Standards

**SaaS Platforms (Stripe, Shopify, etc.):**
- ✅ Grace period before suspension (typically 1-7 days)
- ✅ Read-only access during grace period
- ✅ Data preservation (soft suspension)
- ✅ Clear communication to users
- ✅ Easy renewal process

**E-commerce Platforms:**
- ✅ Storefront shows maintenance/suspension page
- ✅ Admin access restricted but renewal available
- ✅ Order processing disabled
- ✅ Data retention for compliance

### DukaNest Implementation

Our implementation aligns with best practices:

| Feature | DukaNest | Industry Standard |
|---------|-----------|------------------|
| Grace Period | ✅ 2 days | ✅ 1-7 days |
| Read-Only Access | ✅ Yes | ✅ Yes |
| Data Preservation | ✅ Yes | ✅ Yes |
| Payment Reminders | ✅ Daily during grace | ✅ Yes |
| Renewal Access | ✅ Yes | ✅ Yes |
| Storefront Restriction | ✅ Suspension page | ✅ Yes |

## What Happens When Tenant Expires

### Day 0 (Expiration Day)

1. **Status Change**: `active` → `expired`
2. **Access Level**: Full → Read-only
3. **Notifications**: 
   - Email sent to tenant admin
   - Payment reminder scheduled
4. **Storefront**: 
   - Still accessible (products visible)
   - Shows expiration banner at top
   - Checkout is disabled
   - Customers can browse but cannot place orders

### Days 1-2 (Grace Period)

1. **Status**: Remains `expired`
2. **Access Level**: Read-only
3. **Notifications**: 
   - Daily payment reminders
   - Grace period countdown
4. **Storefront**: 
   - Products and pages remain visible
   - Shows expiration notice banner
   - Checkout is blocked (API returns 403)
   - Customers can browse but cannot complete purchases

### Day 3+ (After Grace Period)

1. **Status Change**: `expired` → `suspended`
2. **Access Level**: Restricted (renewal only)
3. **Notifications**: 
   - Final suspension notice
   - Renewal instructions
4. **Storefront**: 
   - Redirects to `/tenant-suspended` page
   - No access to store content
   - Shows suspension message with renewal CTA
   - All storefront routes blocked

## Why "Tenant Not Found" Errors Occur

### Root Cause

The tenant resolution was only querying for `status = 'active'`, which excluded expired tenants even during grace period.

### Fix Applied

Updated tenant resolution to include both `'active'` and `'expired'` status:
- Expired tenants are now accessible during grace period
- Access control logic enforces read-only restrictions
- Suspended/deleted tenants remain blocked

### Current Behavior

- ✅ Expired tenants (grace period) → Accessible (read-only)
- ✅ Active tenants → Accessible (full access)
- ❌ Suspended tenants → Blocked (renewal only)
- ❌ Deleted tenants → Blocked (no access)

## Recommendations

### For Landlords

1. **Monitor Expired Tenants**
   - Check `/admin/tenants` regularly
   - Filter by "Expired" status
   - Review grace period status

2. **Communication**
   - Ensure payment reminders are sent
   - Provide clear renewal instructions
   - Offer support during grace period

3. **Renewal Process**
   - Make renewal easy and accessible
   - Provide payment options
   - Send confirmation emails

### For System Administrators

1. **Cron Jobs**
   - Ensure `expiry-checker` runs daily
   - Verify `payment-reminders` sends emails
   - Monitor cron job success rates

2. **Database**
   - Never hard-delete expired tenants
   - Preserve data for compliance
   - Archive after extended period (90+ days)

3. **Monitoring**
   - Track expiration rates
   - Monitor renewal conversions
   - Alert on system issues

## Configuration

### Environment Variables

```env
# Grace period in days (default: 2)
SUBSCRIPTION_GRACE_PERIOD_DAYS=2
```

### Database Status Values

- `active` - Full access, subscription valid
- `expired` - Read-only access, in grace period
- `suspended` - Restricted access, past grace period
- `deleted` - No access, soft-deleted

## Troubleshooting

### Tenant Not Found After Expiration

**Symptom**: "Tenant not found" errors for expired tenants

**Cause**: Tenant resolution excluding expired status

**Solution**: ✅ Fixed - Now includes expired tenants during grace period

### Tenant Still Accessible After Grace Period

**Symptom**: Expired tenant still accessible after 2+ days

**Cause**: Cron job not running or not updating status

**Solution**: 
1. Check cron job logs
2. Manually trigger expiry-checker
3. Verify tenant status in database

### Payment Reminders Not Sending

**Symptom**: No payment reminders during grace period

**Cause**: Email service issue or cron job failure

**Solution**:
1. Check SendGrid configuration
2. Verify cron job execution
3. Test email sending manually

## Storefront Behavior

### Expired Tenants (Grace Period)

- ✅ **Storefront Accessible**: Products and pages remain visible
- ✅ **Expiration Banner**: Yellow notice at top of all pages
- ❌ **Checkout Blocked**: Cannot place orders (API returns 403)
- ✅ **Browse Only**: Customers can view products but cannot purchase

### Suspended Tenants (Past Grace Period)

- ❌ **Storefront Blocked**: Redirects to suspension page
- ❌ **No Store Access**: All storefront routes redirect
- ✅ **Suspension Page**: Shows renewal instructions
- ✅ **Data Preserved**: All content remains in database

## Summary

- ✅ **Nothing is deleted** - Data is preserved
- ✅ **Grace period** - 2 days read-only access (dashboard) / browse-only (storefront)
- ✅ **Soft suspension** - Status changes, data remains
- ✅ **Best practices** - Aligns with industry standards
- ✅ **Fixed** - Expired tenants now accessible during grace period
- ✅ **Storefront Protection** - Checkout blocked for expired, storefront blocked for suspended
