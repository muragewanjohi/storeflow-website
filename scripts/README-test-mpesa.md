# M-Pesa STK Push Test Script

This script tests M-Pesa STK Push functionality independently to help troubleshoot issues.

## Prerequisites

- Node.js 18+ (for native `fetch` support)
- Valid M-Pesa production credentials in `.env.local`
- `.env.local` file with required variables

## Required Environment Variables

Make sure these are set in your `.env.local` file:

```env
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_till_number
MPESA_PASSKEY=your_passkey
MPESA_ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Usage

### Run the test script:

```bash
npm run test:mpesa
```

Or directly:

```bash
node scripts/test-mpesa-stk-push.js
```

## What the Script Does

1. **Validates Configuration** - Checks all required environment variables
2. **Gets OAuth Token** - Authenticates with M-Pesa API
3. **Initiates STK Push** - Sends payment request to phone number `254724511201` for `Ksh 1`
4. **Displays Detailed Logs** - Shows all request/response details for troubleshooting

## Test Parameters

The script is configured with:
- **Phone Number**: `254724511201`
- **Amount**: `1 KES`
- **Account Reference**: `TEST-{timestamp}`

To change these, edit the `testParams` object in `scripts/test-mpesa-stk-push.js`.

## Expected Output

If successful, you should see:

```
✅ Access token obtained successfully
✅ STK Push initiated successfully!
⚠️  Check your phone (254724511201) for the STK Push prompt!
```

## Troubleshooting

### "Missing environment variables"
- Check your `.env.local` file exists
- Verify all MPESA_* variables are set
- Ensure `.env.local` is in the project root

### "Failed to get access token"
- Verify your Consumer Key and Consumer Secret are correct
- Check if you're using production credentials with production environment
- Ensure your credentials are active in Safaricom Developer Portal

### "STK Push failed"
- Check the error code and description in the output
- Verify phone number format (must be 254XXXXXXXXX)
- Ensure phone number is registered with M-Pesa
- Check if Till Number is active

### "No STK Push received on phone"
- Verify phone number is correct: `254724511201`
- Check phone has M-Pesa registered
- Ensure phone has network connectivity
- Check if phone number matches the one registered with M-Pesa
- Verify you're using production credentials (sandbox won't work with real numbers)

### "Invalid phone number format"
- Phone number must be exactly 12 digits starting with 254
- Format: `254XXXXXXXXX` (no spaces, dashes, or special characters)

## Understanding the Logs

The script provides detailed logging:

- **Configuration**: Shows which environment and URLs are being used
- **Request Details**: Shows exact payload being sent to M-Pesa
- **Response Details**: Shows M-Pesa's response
- **Error Messages**: Detailed error information if something fails

## Next Steps After Successful Test

1. Check your phone for the STK Push prompt
2. Enter your M-Pesa PIN to complete payment
3. Check your callback URL logs for payment confirmation
4. Use the Checkout Request ID to query status if needed

## Common Issues

### Issue: "ResponseCode: 400.001.03"
**Solution**: Invalid phone number format or phone not registered with M-Pesa

### Issue: "ResponseCode: 400.002.01"
**Solution**: Invalid Business Short Code or Till Number

### Issue: "ResponseCode: 401.002.01"
**Solution**: Invalid or expired access token (run script again to get new token)

### Issue: STK Push received but payment fails
**Solution**: Check callback URL is publicly accessible and returns HTTP 200

## Notes

- The script uses **production** URLs when `MPESA_ENVIRONMENT=production`
- Real money will be charged in production mode
- Test with small amounts (1 KES) first
- Access tokens expire after 1 hour
