# M-Pesa Production Deployment Checklist

## ✅ Configuration Complete

Based on your `.env.local`, you have:
- ✅ Consumer Key: Set
- ✅ Consumer Secret: Set
- ✅ Short Code (Till Number): `9584650`
- ✅ Passkey: Set
- ✅ Environment: `production`

## Next Steps

### 1. Verify Environment Variables

Ensure all M-Pesa variables are set correctly:

```env
MPESA_CONSUMER_KEY=0IIHDX5Vh4eahIguoNu4p2p28x4qp0wgjHIUShv1yuvX0Gkm
MPESA_CONSUMER_SECRET=MeSTuN80x9H7cjjHK9R1PvriQiRqMSfUxvBER637LFsXtAXYct5HCRBx60BNSCvr
MPESA_SHORTCODE=9584650
MPESA_PASSKEY=91660505da7f7432bf5c98a1acb899e208c1ca26fb9e4f820c80a3ddd477ca69
MPESA_ENVIRONMENT=production
```

**Important:** Make sure `NEXT_PUBLIC_APP_URL` is set to your production domain:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Deploy to Production

If not already deployed:

1. **Push to your repository**
2. **Deploy to Vercel/your hosting platform**
3. **Set environment variables in production:**
   - Go to your hosting platform's environment variables section
   - Add all M-Pesa variables (same as `.env.local`)
   - **DO NOT commit `.env.local` to git** (it's already in `.gitignore`)

### 3. Verify Callback URL

The callback URL will be automatically generated as:
```
https://yourdomain.com/api/mpesa/subscription/callback
```

**Verify it's accessible:**
```bash
curl -X POST https://yourdomain.com/api/mpesa/subscription/callback \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

Should return `200 OK`.

### 4. Test with Small Amount First ⚠️

**IMPORTANT:** Since you're in production, test with a **very small amount** first:

1. **Create a test subscription plan** with minimal price (e.g., KES 1 or KES 10)
2. **Or use your lowest-priced plan** for initial testing
3. **Test the full flow:**
   - Go to Dashboard → Subscription
   - Select a plan
   - Enter your M-Pesa phone number
   - Click "Pay with M-Pesa"
   - Complete payment on your phone
   - Verify subscription activates

### 5. Monitor First Transactions

**Watch for:**
- ✅ STK Push received on phone
- ✅ Payment completes successfully
- ✅ Subscription activates automatically
- ✅ Email confirmation sent
- ✅ Payment log created in database

**Check logs:**
- Server logs for callback receipt
- Database `payment_logs` table
- Subscription activation status

### 6. Verify Integration Points

#### A. Payment Initiation
- Endpoint: `POST /api/mpesa/subscription/initiate`
- Should return `checkout_request_id`
- STK Push should appear on phone

#### B. Payment Callback
- Endpoint: `POST /api/mpesa/subscription/callback`
- Should receive callback from M-Pesa
- Should activate subscription
- Should send confirmation email

#### C. Status Query (if needed)
- Endpoint: `GET /api/mpesa/subscription/status?checkout_request_id=xxx`
- Can be used to poll payment status

### 7. Production Best Practices

#### Security
- ✅ Environment variables set in hosting platform (not in code)
- ✅ HTTPS enabled (required for production)
- ✅ Callback endpoint is publicly accessible
- ✅ Error logging enabled

#### Monitoring
- ✅ Set up error alerts (e.g., Sentry, LogRocket)
- ✅ Monitor payment logs
- ✅ Track failed payments
- ✅ Monitor subscription activations

#### Error Handling
- ✅ Payment failures logged
- ✅ Callback errors logged
- ✅ User-friendly error messages
- ✅ Retry mechanism for transient failures

### 8. Common Production Issues

#### Issue: "Invalid password" error
**Solution:**
- Verify passkey is correct (no extra spaces)
- Check timestamp format
- Verify shortcode matches Till Number

#### Issue: Callback not received
**Solution:**
- Verify callback URL is publicly accessible
- Check HTTPS is enabled
- Verify `NEXT_PUBLIC_APP_URL` is correct
- Check server logs for errors
- Contact Safaricom if persistent

#### Issue: Payment succeeds but subscription not activated
**Solution:**
- Check callback endpoint logs
- Verify payment log status in database
- Check for errors in subscription activation
- Verify plan exists and is active

### 9. Production Checklist

Before going live with real customers:

- [ ] All environment variables set in production
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain
- [ ] Application deployed and accessible
- [ ] HTTPS enabled and working
- [ ] Callback endpoint tested and accessible
- [ ] Test payment completed successfully
- [ ] Subscription activation verified
- [ ] Email notifications working
- [ ] Error logging configured
- [ ] Monitoring/alerts set up
- [ ] Support contact information available

### 10. Support & Troubleshooting

**If issues occur:**

1. **Check server logs** for detailed error messages
2. **Verify payment logs** in database
3. **Test callback endpoint** manually
4. **Contact Safaricom support:**
   - Email: apisupport@safaricom.co.ke
   - Include: Till Number, transaction details, error messages

## Testing Flow

### Step-by-Step Test

1. **Navigate to:** Dashboard → Subscription
2. **Select a plan** (preferably low-cost for testing)
3. **Click "Upgrade" or "Subscribe"**
4. **Enter M-Pesa phone number** (format: 254XXXXXXXXX or 0XXXXXXXXX)
5. **Click "Pay with M-Pesa"**
6. **Check your phone** for STK Push prompt
7. **Enter M-Pesa PIN** to complete payment
8. **Wait for confirmation:**
   - Payment success message on screen
   - Subscription should activate automatically
   - Email confirmation should be sent
9. **Verify in dashboard:**
   - Subscription status updated
   - Plan changed to selected plan
   - Expiration date updated

## Success Indicators

✅ **Integration is working if:**
- STK Push appears on phone immediately
- Payment completes successfully
- Subscription activates within seconds
- Email confirmation received
- Payment log shows "completed" status
- No errors in server logs

## Next Steps After Testing

Once you've verified everything works:

1. **Test with different amounts** (if applicable)
2. **Test upgrade scenarios** (proration)
3. **Test new subscriptions**
4. **Monitor for 24-48 hours**
5. **Go live with real customers**

## Important Reminders

⚠️ **Production Environment:**
- All payments are **REAL** - use real money
- Test with small amounts first
- Monitor closely for first few days
- Have rollback plan ready

⚠️ **Security:**
- Never commit credentials to git
- Use environment variables in hosting platform
- Enable HTTPS (required)
- Monitor for suspicious activity

⚠️ **Support:**
- Keep Safaricom support contact handy
- Document any issues encountered
- Have transaction IDs ready for support requests

---

**You're all set!** Test with a small amount first, then monitor and scale up. Good luck! 🚀
