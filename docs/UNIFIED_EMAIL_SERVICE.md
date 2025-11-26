# Unified Email Service

## Overview

All email sending in the application now uses a **unified email service** located at `@/lib/email/service.ts`. This ensures:

1. **Consistent Configuration**: All emails use the verified sender email (SendGrid requirement)
2. **Automatic Fallback**: Handles sender identity verification errors automatically
3. **Simplified API**: Just pass parameters - no need to worry about `from` addresses
4. **Reply-To Support**: Automatically sets reply-to to tenant contact email when tenant is provided

## Architecture

### Before (Inconsistent)
Each module was calling `sendEmail` directly with different configurations:
- Orders: Used `getVerifiedSenderEmail()` ✅
- Customers: Used `tenantEmail` ❌ (not verified)
- Support: Used `tenantEmail` ❌ (not verified)
- Subscriptions: Used `process.env.SENDGRID_FROM_EMAIL` ✅
- Notifications: Used `process.env.SENDGRID_FROM_EMAIL` ✅

### After (Unified)
All modules use the unified service:
- **Customer emails**: `sendCustomerEmail()` - for customer-facing emails
- **Admin emails**: `sendAdminEmail()` - for tenant admin emails
- **Platform emails**: `sendPlatformEmail()` - for system/platform emails

## Usage

### Customer Emails

For emails sent to customers (order confirmations, password resets, etc.):

```typescript
import { sendCustomerEmail } from '@/lib/email/service';

await sendCustomerEmail({
  to: customer.email,
  subject: 'Order Confirmation',
  html: '<html>...</html>',
  text: 'Plain text version',
  tenant, // Tenant object - automatically sets sender name and reply-to
});
```

### Admin Emails

For emails sent to tenant admins (new order alerts, notifications, etc.):

```typescript
import { sendAdminEmail } from '@/lib/email/service';

await sendAdminEmail({
  to: adminEmail,
  subject: 'New Order Alert',
  html: '<html>...</html>',
  tenant, // Optional - sets sender name if provided
});
```

### Platform Emails

For system-level emails (subscription notifications, platform updates, etc.):

```typescript
import { sendPlatformEmail } from '@/lib/email/service';

await sendPlatformEmail({
  to: tenantEmail,
  subject: 'Subscription Renewal Reminder',
  html: '<html>...</html>',
});
```

## Features

### 1. Verified Sender Email

**Always uses verified sender** (`noreply@dukanest.com` or `SENDGRID_FROM_EMAIL`):
- Prevents "Sender Identity not verified" errors
- Automatically falls back if custom sender fails
- No need to manually specify `from` address

### 2. Automatic Sender Name

**Intelligent sender name formatting**:
- Uses tenant name if provided
- Falls back to formatted subdomain (e.g., "teststore" → "Test Store")
- Defaults to "StoreFlow" or "StoreFlow Platform" for platform emails

### 3. Reply-To Support

**Automatically sets reply-to**:
- Customer emails: Reply-to = tenant contact email
- Admin emails: Reply-to = tenant contact email (if tenant provided)
- Platform emails: No reply-to (uses default)

### 4. Error Handling

**Built-in error handling**:
- Automatically retries with fallback sender if verification fails
- Logs errors for debugging
- Returns success/failure status

## Migration Guide

### Before
```typescript
import { sendEmail } from '@/lib/email/sendgrid';

await sendEmail({
  to: customer.email,
  from: tenantEmail, // ❌ Not verified
  fromName: tenant.name || 'Store',
  subject: 'Welcome!',
  html: '<html>...</html>',
});
```

### After
```typescript
import { sendCustomerEmail } from '@/lib/email/service';

await sendCustomerEmail({
  to: customer.email,
  subject: 'Welcome!',
  html: '<html>...</html>',
  tenant, // ✅ Automatically handles from, fromName, replyTo
});
```

## Updated Modules

All email modules have been updated to use the unified service:

- ✅ `@/lib/orders/emails.ts` - Order-related emails
- ✅ `@/lib/customers/emails.ts` - Customer account emails
- ✅ `@/lib/support/emails.ts` - Support ticket emails
- ✅ `@/lib/subscriptions/emails.ts` - Subscription emails
- ✅ `@/lib/notifications/email.ts` - Notification emails
- ✅ `@/lib/landlord-support/emails.ts` - Landlord support emails

## Benefits

1. **No More Sender Identity Errors**: All emails use verified sender
2. **Consistent Branding**: Sender name automatically formatted from tenant info
3. **Better Email Delivery**: Reply-to addresses improve email deliverability
4. **Simpler Code**: Just pass parameters, no need to manage `from` addresses
5. **Easier Maintenance**: Change email configuration in one place

## Configuration

The unified service uses these environment variables:

- `SENDGRID_API_KEY` - SendGrid API key (required)
- `SENDGRID_FROM_EMAIL` - Verified sender email (default: `noreply@dukanest.com`)
- `SENDGRID_FROM_NAME` - Default sender name (default: `StoreFlow`)

## Example: Order Confirmation Email

```typescript
// Before
await sendEmail({
  to: customerEmail,
  from: getVerifiedSenderEmail(),
  fromName: getSenderName(tenant),
  subject: `Order Confirmation - ${order.order_number}`,
  html,
  text,
});

// After
await sendCustomerEmail({
  to: customerEmail,
  subject: `Order Confirmation - ${order.order_number}`,
  html,
  text,
  tenant,
});
```

Much simpler! 🎉

