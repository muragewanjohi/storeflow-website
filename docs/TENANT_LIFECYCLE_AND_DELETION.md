# Tenant Lifecycle and Deletion Policy

## Overview

This document explains the complete lifecycle of a tenant from active subscription through expiration, suspension, and eventual deletion, including industry best practices.

## Tenant Lifecycle Stages

### 1. Active (Full Access)
- **Status**: `active`
- **Access**: Full access to dashboard and storefront
- **Storefront**: Fully operational
- **Checkout**: Enabled
- **Notifications**: None (all good)

### 2. Expired (Grace Period - Days 0-2)
- **Status**: `expired`
- **Access**: Read-only dashboard, browse-only storefront
- **Storefront**: Accessible with expiration banner, checkout disabled
- **Checkout**: Blocked (API returns 403)
- **Notifications**: 
  - ✅ Email sent on expiration day
  - ✅ Daily payment reminders during grace period
  - ✅ Dashboard banner shows expiration notice
- **Data**: Fully preserved

### 3. Suspended (After Grace Period - Day 3+)
- **Status**: `suspended`
- **Access**: Restricted (renewal page only)
- **Storefront**: Redirects to suspension page
- **Checkout**: Blocked
- **Notifications**: 
  - ✅ Suspension email sent
  - ✅ Dashboard shows suspension banner
- **Data**: Fully preserved

### 4. Soft-Deleted (Manual Deletion)
- **Status**: `deleted`
- **Access**: Completely blocked
- **Storefront**: Blocked
- **Checkout**: Blocked
- **Notifications**: 
  - ✅ **30-day warning**: Email sent 30 days before hard deletion
  - ✅ **7-day warning**: Email sent 7 days before hard deletion
  - ✅ **1-day warning**: Email sent 1 day before hard deletion
- **Data**: Preserved for retention period
- **Retention**: 90 days (configurable via `TENANT_RETENTION_DAYS`)

### 5. Hard-Deleted (After Retention Period)
- **Status**: Permanently removed from database
- **Access**: N/A (tenant no longer exists)
- **Storefront**: N/A
- **Data**: Permanently deleted
- **When**: 90 days after soft-deletion

## Hard Deletion Process

### Retention Period

**Default: 90 days** (configurable via `TENANT_RETENTION_DAYS` environment variable)

### What Gets Hard-Deleted

After 90 days in `deleted` status:

1. **Tenant Record**: Permanently removed from database
2. **All Related Data**: 
   - Products
   - Orders
   - Customers
   - Categories
   - Pages
   - Settings
   - All tenant-scoped data
3. **Vercel Domains**: 
   - Subdomain removed (e.g., `tenant.dukanest.com`)
   - Custom domain removed (if configured)
4. **Storage Files**: 
   - Product images
   - Media files
   - All tenant-specific storage

### Hard Deletion Cron Job

- **Schedule**: Weekly (Sunday at 3 AM UTC)
- **Endpoint**: `/api/admin/cleanup/hard-delete-tenants`
- **Logic**: 
  - Finds tenants with `status = 'deleted'`
  - Checks `deleted_at < (NOW() - 90 days)`
  - Hard deletes tenant and all related data
  - Removes domains from Vercel
  - Logs all operations

### Configuration

```env
# Retention period in days (default: 90)
TENANT_RETENTION_DAYS=90
```

## Industry Best Practices Comparison

### Shopify

**Inactive Store Policy:**
- ✅ **Store Deactivation**: Merchants can deactivate at end of billing cycle
- ✅ **Data Retention**: 2 years after store becomes inactive
- ✅ **Data Export**: Merchants can export data via CSV before deactivation
- ✅ **Domain Reuse**: `myshopify.com` domains cannot be reused
- ✅ **Legal Compliance**: May retain data longer for legal requirements

**Recent Legal Development (2024):**
- Federal court ordered Shopify to retain inactive account data for CRA investigation
- Shows importance of data retention for compliance

### Amazon Seller Central

**Inactive Account Policy:**
- ✅ **Account Suspension**: After extended inactivity or policy violations
- ✅ **Data Retention**: Typically 90 days to 1 year
- ✅ **Reactivation**: Possible within retention period
- ✅ **Permanent Deletion**: After retention period expires

### WooCommerce / WordPress

**Inactive Site Policy:**
- ✅ **Site Suspension**: Hosting providers suspend after non-payment
- ✅ **Data Retention**: Varies by host (typically 30-90 days)
- ✅ **Backup Access**: Users can download backups before deletion
- ✅ **Permanent Deletion**: After retention period

### Stripe (Payment Platform)

**Inactive Account Policy:**
- ✅ **Account Closure**: Merchants can close accounts
- ✅ **Data Retention**: 7 years for financial records (legal requirement)
- ✅ **Transaction History**: Preserved for compliance
- ✅ **Personal Data**: Deleted after retention period

## StoreFlow Implementation

### Comparison with Industry Standards

| Feature | StoreFlow | Shopify | Amazon | WooCommerce |
|---------|-----------|---------|--------|-------------|
| **Grace Period** | ✅ 2 days | ✅ Varies | ✅ Varies | ✅ Varies |
| **Suspension Period** | ✅ Indefinite | ✅ Indefinite | ✅ 90 days | ✅ 30-90 days |
| **Soft Deletion** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Hard Deletion** | ✅ 90 days | ✅ 2 years | ✅ 90 days | ✅ 30-90 days |
| **Data Export** | ⚠️ Manual | ✅ CSV Export | ✅ Reports | ✅ Backup |
| **Domain Cleanup** | ✅ Automatic | ✅ Manual | ✅ Automatic | ✅ Manual |
| **Email Notifications** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Varies |

### Recommendations

1. **Add Data Export Feature**
   - Allow tenants to export data before deletion
   - CSV exports for products, orders, customers
   - JSON backup option

2. **Extend Retention for Compliance**
   - Consider 1-2 years for financial records
   - Separate retention for orders vs. products
   - Legal compliance requirements

3. **Pre-Deletion Warnings**
   - Email 30 days before hard deletion
   - Email 7 days before hard deletion
   - Final email 1 day before deletion

## Tenant Admin Notifications

### Current Implementation

Tenant admins are informed through multiple channels:

1. **Dashboard Banner** (`AccessRestrictionBanner`)
   - ✅ Shows on all dashboard pages
   - ✅ Yellow banner for expired (grace period)
   - ✅ Red banner for suspended
   - ✅ Clear renewal CTA button
   - ✅ Shows days remaining in grace period

2. **Email Notifications**
   - ✅ **Expiration Email**: Sent when status changes to `expired`
   - ✅ **Payment Reminders**: Daily during grace period
   - ✅ **Suspension Email**: Sent when status changes to `suspended`
   - ✅ **Pre-Deletion Warnings**: Sent 30, 7, and 1 day before hard deletion

3. **Visual Indicators**
   - ✅ Status badges in tenant list
   - ✅ Expiration dates visible
   - ✅ Grace period countdown

### Implemented Features

1. ✅ **Suspension Email**
   - Sent when tenant is suspended (after grace period)
   - Includes final renewal instructions
   - Data preservation assurance

2. ✅ **Pre-Hard-Delete Warnings**
   - Email 30 days before hard deletion (if soft-deleted)
   - Email 7 days before hard deletion
   - Final warning 1 day before
   - Cron job runs daily at 10 AM UTC

3. **Dashboard Notifications** (Future Enhancement)
   - Show countdown to suspension
   - Show countdown to hard deletion (if soft-deleted)
   - Clear action items

## Timeline Example

### Scenario: Tenant Expires on January 22, 2026

**Day 0 (Jan 22) - Expiration**
- Status: `active` → `expired`
- Email: Expiration notification sent
- Dashboard: Yellow banner appears
- Storefront: Expiration banner, checkout disabled
- Access: Read-only

**Days 1-2 (Jan 23-24) - Grace Period**
- Status: `expired`
- Email: Daily payment reminders
- Dashboard: Yellow banner with countdown
- Storefront: Still accessible, checkout blocked
- Access: Read-only

**Day 3 (Jan 25) - Suspension**
- Status: `expired` → `suspended`
- Email: Suspension notification (should be added)
- Dashboard: Red banner, redirects to renewal page
- Storefront: Redirects to suspension page
- Access: Restricted (renewal only)

**Day 30+ (Feb 25+) - If Not Renewed**
- Status: `suspended`
- Email: Periodic renewal reminders
- Data: Still preserved
- Access: Still restricted

**If Manually Deleted (Day X)**
- Status: `suspended` → `deleted`
- `deleted_at` timestamp set
- Access: Completely blocked
- Data: Preserved for 90 days
- Email: None (account already deleted)

**Day X + 60 (30 days before deletion)**
- Email: 30-day warning sent
- Message: Account will be deleted in 30 days
- Action: Contact support to recover

**Day X + 83 (7 days before deletion)**
- Email: 7-day warning sent
- Message: Account will be deleted in 7 days
- Action: Contact support immediately

**Day X + 89 (1 day before deletion)**
- Email: Final 1-day warning sent
- Message: Account will be deleted tomorrow
- Action: Last chance to contact support

**Day X + 90 - Hard Deletion**
- Status: Permanently deleted
- All data removed from database
- Domains removed from Vercel
- Storage files deleted
- **Cannot be recovered**

## Configuration Summary

```env
# Grace period (days before suspension)
SUBSCRIPTION_GRACE_PERIOD_DAYS=2

# Retention period (days before hard deletion)
TENANT_RETENTION_DAYS=90
```

## Best Practices Summary

1. ✅ **Grace Period**: 2 days (industry standard: 1-7 days)
2. ✅ **Soft Suspension**: Data preserved indefinitely until manual deletion
3. ✅ **Hard Deletion**: 90 days after soft-deletion (industry standard: 30-90 days)
4. ✅ **Notifications**: Multiple channels (email, dashboard, storefront)
5. ✅ **Pre-Deletion Warnings**: Emails sent 30, 7, and 1 day before hard deletion
6. ⚠️ **Data Export**: Should be added for compliance

## Compliance Considerations

- **Financial Records**: May need longer retention (1-7 years)
- **Personal Data**: GDPR/CCPA compliance requirements
- **Legal Holds**: Ability to pause deletion for legal cases
- **Audit Trails**: Log all deletion activities
