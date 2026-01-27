# M-Pesa Callback URL Setup Guide

## Overview

The callback URL is where M-Pesa sends payment confirmations after a customer completes an STK Push payment. This guide explains what you need to do on your end.

## How It Works

1. **You initiate payment** → STK Push sent to customer
2. **Customer enters PIN** → Payment processed
3. **M-Pesa sends callback** → POST request to your callback URL
4. **Your endpoint processes** → Activates subscription

## Current Implementation

The callback URL is **automatically generated** in the code:

```typescript
// src/app/api/mpesa/subscription/initiate/route.ts
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
               process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
               request.headers.get('origin') || 
               'https://yourdomain.com';
const callbackUrl = `${baseUrl}/api/mpesa/subscription/callback`;
```

**Your callback endpoint:** `POST /api/mpesa/subscription/callback`

## What You Need to Do

### ✅ For Sandbox/Testing (Usually Nothing!)

**Good news:** For sandbox testing, the callback URL usually works automatically. M-Pesa sandbox can reach your endpoint if:

1. **Your server is publicly accessible** (not behind a firewall)
2. **You're using a service like Vercel/Netlify** (automatically public)
3. **You're using ngrok or similar** for local testing

**For local testing:**
```bash
# Option 1: Use ngrok to expose localhost
ngrok http 3000

# Then set in .env.local:
NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
```

### ✅ For Production (May Need Registration)

**For production, you may need to:**

1. **Ensure HTTPS** - Callback URL must be HTTPS (not HTTP)
2. **Publicly accessible** - No firewall blocking Safaricom servers
3. **Register with Safaricom** (if required by your account type)

#### Option A: Automatic (Most Common)

**STK Push callbacks are usually automatic** - you just need to:
- Deploy your app with the callback endpoint
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly
- That's it! M-Pesa will automatically send callbacks to the URL you provide in the STK Push request

#### Option B: Manual Registration (If Required)

Some account types may require manual callback registration:

1. **Contact Safaricom Support:**
   - Email: apisupport@safaricom.co.ke
   - Subject: "Register STK Push Callback URL"
   - Include:
     - Your Till Number
     - Your callback URL: `https://yourdomain.com/api/mpesa/subscription/callback`
     - Your Business Name

2. **Or via Developer Portal:**
   - Log in to Developer Portal
   - Go to your app settings
   - Look for "Callback URLs" or "Webhooks" section
   - Add your callback URL

**Note:** This is usually **NOT required** for STK Push. It's more common for C2B (Customer to Business) registrations.

## Environment Variables

### Required

```env
# Your application URL (used to generate callback URL)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Optional (Auto-detected)

```env
# Vercel automatically sets this
VERCEL_URL=your-app.vercel.app
```

## Callback URL Requirements

### ✅ Must Have:

1. **HTTPS** (in production) - HTTP only works in sandbox
2. **Publicly accessible** - No authentication required
3. **Valid SSL certificate** (for production)
4. **Returns 200 OK** - Always return success to prevent retries

### ✅ Should Handle:

1. **Idempotency** - Handle duplicate callbacks gracefully
2. **Error handling** - Log errors but return 200 OK
3. **Timeout** - Process quickly (M-Pesa expects response within seconds)

## Current Implementation Status

### ✅ Already Implemented:

- ✅ Callback endpoint created: `/api/mpesa/subscription/callback`
- ✅ Automatic callback URL generation
- ✅ Idempotency handling (checks if payment already processed)
- ✅ Always returns 200 OK (even on errors)
- ✅ Comprehensive error logging
- ✅ Payment verification (amount matching)
- ✅ Subscription activation on success

### 🔧 What You Need to Configure:

1. **Set `NEXT_PUBLIC_APP_URL`** in your environment:
   ```env
   # For production
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   
   # For local testing with ngrok
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
   ```

2. **Deploy your application** (if not already deployed)

3. **Test the callback** (see testing section below)

## Testing the Callback

### Test 1: Verify Endpoint Exists

```bash
# Test if endpoint is accessible
curl -X POST https://yourdomain.com/api/mpesa/subscription/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Should return 200 OK (even with invalid data)
```

### Test 2: Full Payment Flow

1. Initiate payment from your app
2. Complete payment on phone
3. Check server logs for callback receipt
4. Verify subscription activated

### Test 3: Check Logs

```bash
# Look for these log messages:
[Mpesa Callback] Received callback: {...}
[Mpesa Callback] Payment successful: {...}
[Mpesa Callback] Subscription activated successfully
```

## Troubleshooting

### Issue: Callback Not Received

**Possible causes:**

1. **URL not publicly accessible**
   - ✅ Solution: Use ngrok for local testing
   - ✅ Solution: Deploy to Vercel/Netlify

2. **Firewall blocking Safaricom IPs**
   - ✅ Solution: Whitelist Safaricom IP ranges (contact support for IPs)

3. **HTTPS not configured (production)**
   - ✅ Solution: Ensure SSL certificate is valid

4. **Wrong URL in STK Push request**
   - ✅ Solution: Check `NEXT_PUBLIC_APP_URL` is set correctly

### Issue: Callback Received But Payment Not Processed

**Check:**

1. **Server logs** - Look for error messages
2. **Payment log status** - Check database for payment status
3. **Amount mismatch** - Verify amount in callback matches expected
4. **Plan not found** - Ensure plan ID exists

### Issue: Duplicate Callbacks

**Already handled:** The implementation checks if payment is already processed before activating subscription again.

## Security Considerations

### ✅ Current Security Features:

1. **Payment verification** - Amount must match
2. **Idempotency** - Prevents duplicate processing
3. **Error logging** - All errors logged for investigation
4. **Always returns 200** - Prevents callback retries

### 🔒 Additional Security (Optional):

1. **IP Whitelisting:**
   ```typescript
   // Add to callback route if needed
   const safaricomIPs = ['xxx.xxx.xxx.xxx']; // Get from Safaricom
   const clientIP = request.headers.get('x-forwarded-for');
   if (!safaricomIPs.includes(clientIP)) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
   }
   ```

2. **Signature Verification** (if Safaricom provides):
   - Some APIs provide signature headers
   - Verify signature before processing

**Note:** For STK Push, IP whitelisting is usually sufficient. Contact Safaricom for their IP ranges.

## Production Checklist

- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Application deployed and accessible
- [ ] HTTPS enabled (SSL certificate valid)
- [ ] Callback endpoint tested
- [ ] Server logs monitored
- [ ] IP whitelisting configured (optional but recommended)
- [ ] Error alerts set up

## Summary

### For Sandbox:
- ✅ **Usually nothing needed** - Works automatically
- ✅ Just ensure your server is publicly accessible
- ✅ Use ngrok for local testing

### For Production:
- ✅ Set `NEXT_PUBLIC_APP_URL` correctly
- ✅ Deploy application
- ✅ Ensure HTTPS is enabled
- ✅ Test callback endpoint
- ✅ Monitor logs
- ⚠️ Contact Safaricom if callbacks not received (rare)

## Support

- **Safaricom API Support:** apisupport@safaricom.co.ke
- **Developer Portal:** https://developer.safaricom.co.ke/
- **Check your callback endpoint:** `https://yourdomain.com/api/mpesa/subscription/callback`

---

**Bottom Line:** For most cases, you don't need to do anything special. Just:
1. Set `NEXT_PUBLIC_APP_URL` correctly
2. Deploy your app
3. The callback will work automatically!
