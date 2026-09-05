# M-Pesa STK Push Troubleshooting Guide

## Issue: 200 OK Response but No STK Push Received

If you're getting a **200 OK** response with `ResponseCode: "0"` but **not receiving the STK push** on your phone, this guide will help you troubleshoot.

### Understanding the Response

A `200 OK` with `ResponseCode: "0"` means:
- ✅ Your request was **accepted** by M-Pesa API
- ✅ The request format is **correct**
- ✅ Your credentials are **valid**
- ⚠️ But the STK push **may not be sent** due to account/configuration issues

## Common Causes & Solutions

### 1. Phone Number Not Registered with M-Pesa

**Symptoms:**
- No STK push received
- Query status shows `ResultCode: "1031"` (Unable to process)

**Solution:**
- Verify phone number `254724511201` is registered with M-Pesa
- Call `*234#` to check M-Pesa account status
- Ensure the phone number matches exactly what's registered with M-Pesa

### 2. M-Pesa Account Issues

**Symptoms:**
- No STK push received
- Query status shows `ResultCode: "1031"` or other error codes

**Solution:**
- Check if M-Pesa account is active (not suspended)
- Verify account has sufficient balance (even for 1 KES test)
- Ensure account is not restricted
- Try calling `*234#` to check account status

### 3. Till Number Configuration (Error Code 2002)

**Symptoms:**
- Request accepted (200 OK, ResponseCode: "0")
- Query shows `ResultCode: "2002"`
- Error: "Failed. The Agent number and Store number entered do not match"

**This is the MOST COMMON issue!**

**What it means:**
- Your Till Number is not properly configured in Safaricom's system
- There's a mismatch between Agent number and Store number
- Till Number may not be activated for Buy Goods transactions

**Solution:**
1. **Contact Safaricom Support immediately:**
   - Email: developer@safaricom.co.ke
   - Phone: 234 (Safaricom customer care)
   - Provide:
     - Till Number: `9584650`
     - Error Code: `2002`
     - Request: "Verify and fix Agent/Store number configuration"

2. **Check Safaricom Developer Portal:**
   - Log in to https://developer.safaricom.co.ke/
   - Go to your app configuration
   - Verify Till Number status
   - Check if Buy Goods is enabled

3. **Request Till Number Reconfiguration:**
   - Ask Safaricom to verify Agent number matches Store number
   - Ensure Till Number is activated for "Buy Goods" transactions
   - Request activation if not already done

4. **Alternative:**
   - If Till Number cannot be fixed, you may need to:
     - Request a new Till Number
     - Or switch to Paybill number (requires different transaction type)

### 4. Transaction Type Mismatch (Postman Issue)

**⚠️ IMPORTANT:** If testing in Postman, ensure you use the correct transaction type:

**For Till Numbers (Buy Goods):**
```json
{
  "TransactionType": "CustomerBuyGoodsOnline",
  "PartyB": "9584650",  // Must match BusinessShortCode
  "BusinessShortCode": "9584650"
}
```

**❌ WRONG (Paybill):**
```json
{
  "TransactionType": "CustomerPayBillOnline",  // Wrong for Till Number!
  "PartyB": "3080401",  // Wrong - this is a Paybill number
  "BusinessShortCode": "9584650"
}
```

**✅ CORRECT (Till Number):**
```json
{
  "TransactionType": "CustomerBuyGoodsOnline",  // Correct for Till Number
  "PartyB": "9584650",  // Must be same as BusinessShortCode
  "BusinessShortCode": "9584650"
}
```

### 5. Network Connectivity

**Symptoms:**
- No STK push received
- Phone has no network signal

**Solution:**
- Ensure phone is on Safaricom network
- Check network signal strength
- Try from different location
- Restart phone if needed

### 6. Phone Number Format

**Symptoms:**
- Request accepted but no push

**Solution:**
- Phone number must be exactly: `254724511201` (12 digits)
- No spaces, dashes, or special characters
- Must start with `254` (Kenya country code)

## Diagnostic Steps

### Step 1: Query STK Push Status

After initiating STK push, wait 5-10 seconds, then query the status:

```bash
# The test script does this automatically
npm run test:mpesa
```

Or use Postman to query:
- Endpoint: `POST https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query`
- Use the `CheckoutRequestID` from the initiation response

### Step 2: Check Status Codes

**ResultCode Meanings:**
- `0` = Payment successful ✅
- `1` = Payment failed ❌
- `1031` = Unable to process (account/phone issues) ⚠️
- `1032` = User cancelled ❌
- `1037` = Timeout (STK push expired) ⏱️
- `2002` = **Agent number and Store number mismatch** ❌ (Till Number configuration issue)

### Step 3: Verify Configuration

Check your configuration:

```bash
# Run test script - it validates everything
npm run test:mpesa
```

The script will show:
- ✅ Environment (production/sandbox)
- ✅ Base URL being used
- ✅ Short Code
- ✅ Callback URL
- ✅ Request payload details

## Testing Checklist

Before reporting an issue, verify:

- [ ] Phone number is registered with M-Pesa
- [ ] M-Pesa account is active (check with `*234#`)
- [ ] Phone number format is correct: `254724511201`
- [ ] Till Number is active in Safaricom system
- [ ] Using correct transaction type: `CustomerBuyGoodsOnline`
- [ ] `PartyB` matches `BusinessShortCode` (for Till Numbers)
- [ ] Callback URL is publicly accessible HTTPS
- [ ] Phone has network connectivity
- [ ] Waiting 1-2 minutes for delayed pushes

## Postman Configuration

If using Postman, ensure:

1. **Transaction Type:** `CustomerBuyGoodsOnline` (NOT `CustomerPayBillOnline`)
2. **PartyB:** Must be same as `BusinessShortCode` (your Till Number)
3. **BusinessShortCode:** Your Till Number (`9584650`)
4. **Phone Number:** Format `254724511201` (no spaces)

**Example Correct Payload:**
```json
{
  "BusinessShortCode": "9584650",
  "Password": "base64_encoded_password",
  "Timestamp": "20260127105112",
  "TransactionType": "CustomerBuyGoodsOnline",
  "Amount": "1",
  "PartyA": "254724511201",
  "PartyB": "9584650",
  "PhoneNumber": "254724511201",
  "CallBackURL": "https://dukanest.com/api/mpesa/subscription/callback",
  "AccountReference": "TEST-123",
  "TransactionDesc": "Test Payment"
}
```

## Contact Safaricom Support

If all checks pass but still no STK push:

1. **Safaricom Developer Portal:**
   - Go to https://developer.safaricom.co.ke/
   - Check your app configuration
   - Verify Till Number status

2. **Safaricom Support:**
   - Email: developer@safaricom.co.ke
   - Provide:
     - Till Number: `9584650`
     - Phone Number: `254724511201`
     - CheckoutRequestID: `ws_CO_27012026105114043724511201`
     - Error description

3. **M-Pesa Support:**
   - Call: 234 (Safaricom customer care)
   - Verify M-Pesa account status
   - Check if account has any restrictions

## Additional Resources

- [M-Pesa API Documentation](https://developer.safaricom.co.ke/apis)
- [STK Push Query Documentation](https://developer.safaricom.co.ke/APIs/LipaNaMpesaOnlineAPI)
- [Safaricom Developer Portal](https://developer.safaricom.co.ke/)

## Quick Test Command

```bash
# Run the test script with automatic status query
npm run test:mpesa
```

The script will:
1. Validate configuration
2. Get OAuth token
3. Initiate STK push
4. Wait 5 seconds
5. Query status automatically
6. Show detailed diagnostics
