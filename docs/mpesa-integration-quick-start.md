# M-Pesa Subscription Payment - Quick Start Guide

## Overview

This guide provides a quick reference for setting up M-Pesa Buy Goods (Till Number) payments for subscriptions in DukaNest.

## Prerequisites Checklist

- [ ] Safaricom Developer Account created
- [ ] App created in Developer Portal
- [ ] Consumer Key and Consumer Secret obtained
- [ ] Buy Goods Till Number requested and received from Safaricom
- [ ] **Passkey obtained** (see [Certificates and Passkey Guide](./mpesa-certificates-and-passkey-guide.md))
  - Get from Developer Portal → Your App → Complete "Go Live" process
  - OR contact apisupport@safaricom.co.ke
- [ ] Callback URL configured (see [Callback URL Setup Guide](./mpesa-callback-url-setup.md))
  - Usually works automatically - just set `NEXT_PUBLIC_APP_URL`
  - For local testing, use ngrok or similar

**Note:** Certificates are NOT needed for STK Push Buy Goods. They're only for B2C/other operations.

## Environment Variables Setup

Add these to your `.env.local`:

```env
# M-Pesa Configuration
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_SHORTCODE=300584  # Your Till Number
MPESA_PASSKEY=your_passkey_here
MPESA_ENVIRONMENT=sandbox  # Use 'production' for live
```

## API Endpoints Created

1. **POST `/api/mpesa/subscription/initiate`**
   - Initiates STK Push payment
   - Requires: `plan_id`, `phone_number`
   - Returns: `checkout_request_id` for status polling

2. **POST `/api/mpesa/subscription/callback`**
   - Receives payment confirmations from M-Pesa
   - Automatically activates subscription on success
   - **Must be publicly accessible**

3. **GET `/api/mpesa/subscription/status?checkout_request_id=xxx`**
   - Queries payment status
   - Used for frontend polling

## Testing in Sandbox

1. **Use Test Credentials:**
   - Consumer Key/Secret from Developer Portal
   - Test Till Number: `300584` (or your assigned number)
   - Test Phone: `254708374149` (or numbers provided by Safaricom)

2. **Test Flow:**
   - Go to Dashboard → Subscription
   - Select a plan
   - Enter test phone number
   - Click "Pay with M-Pesa"
   - Check test phone for STK Push
   - Enter PIN: `174379` (sandbox test PIN)
   - Verify subscription activates

## Production Deployment

1. **Update Environment Variables:**
   ```env
   MPESA_ENVIRONMENT=production
   MPESA_SHORTCODE=your_live_till_number
   MPESA_CONSUMER_KEY=your_live_consumer_key
   MPESA_CONSUMER_SECRET=your_live_consumer_secret
   MPESA_PASSKEY=your_live_passkey
   ```

2. **Configure Callback URL:**
   - Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com` in environment
   - Callback URL is automatically generated: `https://yourdomain.com/api/mpesa/subscription/callback`
   - Usually works automatically - no registration needed
   - See [Callback URL Setup Guide](./mpesa-callback-url-setup.md) for details

3. **IP Whitelisting (Optional but Recommended):**
   - Whitelist Safaricom IPs for callbacks
   - Contact Safaricom support for IP ranges

## Common Issues & Solutions

### Issue: "M-Pesa configuration is missing"
**Solution:** Check all environment variables are set correctly

### Issue: "Invalid phone number format"
**Solution:** Use format `254XXXXXXXXX` or `0XXXXXXXXX`

### Issue: Callback not received
**Solution:** 
- Verify callback URL is publicly accessible
- Check server logs for errors
- Use status query endpoint to check payment status
- Verify IP whitelisting (if configured)

### Issue: Payment succeeds but subscription not activated
**Solution:**
- Check callback endpoint logs
- Verify payment log status in database
- Check for errors in subscription activation logic

## Support Resources

- [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
- [M-Pesa API Documentation](https://developer.safaricom.co.ke/apis)
- [Postman Collection](./postman/Safaricom%20APIs.postman_collection.json)

## Next Steps

1. Test thoroughly in sandbox
2. Request production credentials from Safaricom
3. Deploy to production
4. Monitor first few transactions
5. Set up alerts for payment failures
