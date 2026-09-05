# M-Pesa Certificates and Passkey Guide

## Overview

This guide explains:
1. **Certificates** - When and how to use them
2. **Passkey** - Where to get it and how it's used

---

## 1. Certificates (certs folder)

### When Are Certificates Used?

Certificates are **NOT required** for STK Push (Buy Goods) payments. They are used for other M-Pesa operations that require `SecurityCredential`:

- **B2C Payments** (Business to Customer)
- **Account Balance Queries**
- **Transaction Reversals**
- **Transaction Status Queries** (some operations)
- **B2B Payments**

### Certificate Files

If you downloaded certificates, you likely have:
- `production_cert.cer` or `production_cert.crt` - Production certificate
- `sandbox_cert.cer` or `sandbox_cert.crt` - Sandbox certificate
- `initiator_password.txt` - Your initiator password (if provided)

### How Certificates Are Used

Certificates are used to encrypt the `SecurityCredential` field. The process:

1. **Encrypt the Initiator Password** using the certificate
2. **Use the encrypted value** as `SecurityCredential` in API calls

**Example (B2C Payment):**
```typescript
// This is NOT needed for STK Push Buy Goods
// Only needed for B2C, Account Balance, etc.

const securityCredential = encryptInitiatorPassword(
  initiatorPassword,
  certificatePath
);

// Then use in API call:
{
  "InitiatorName": "testapi",
  "SecurityCredential": securityCredential, // Encrypted value
  "CommandID": "BusinessPayment",
  // ...
}
```

### For STK Push (Buy Goods) - Certificates NOT Needed

For subscription payments using **STK Push with Buy Goods**, you **do NOT need certificates**. Instead, you use the **passkey** to generate the password.

**STK Push uses:**
- `Password` = Base64(SHORTCODE + PASSKEY + TIMESTAMP)
- No certificates required

---

## 2. M-Pesa Passkey

### What Is the Passkey?

The **passkey** is a secret string provided by Safaricom when you register for a Till Number. It's used to generate the STK Push password.

### Where to Get the Passkey

#### Option 1: Check Your Email (Most Common)

**The passkey is typically NOT visible in the Daraja Developer Portal interface.** It's usually sent via email when:
- Your Till Number is registered
- You complete the "Go Live" process
- Your API access is approved

**Check for emails from:**
- `apisupport@safaricom.co.ke`
- `noreply@safaricom.co.ke`
- `daraja@safaricom.co.ke`

**Search for:** "passkey", "Daraja", "API credentials", or your Till Number

#### Option 2: Safaricom Developer Portal

1. **Log in** to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. **Go to your app** → Click on your application
3. **Look for:**
   - "App Credentials" or "API Credentials" tab
   - "Security" or "Authentication" section
   - "Passkey" or "Online Passkey" field
   - "STK Push Settings" or "Lipa na Mpesa Settings"
   
   **Note:** The passkey is often NOT displayed in the main app view for security reasons.

4. **If not visible**, complete "Go Live" process (if not done):
   - Enter your Till Number / Store Number
   - Enter Business Manager credentials
   - Submit for approval
   - Passkey will be sent via email after approval

#### Option 3: Contact Safaricom Support (Recommended if Not in Portal)

**The passkey is often NOT visible in the Daraja portal.** Contact support:

- **Email:** apisupport@safaricom.co.ke
- **Subject:** "Request for M-Pesa API Passkey - Till Number [YOUR_TILL]"
- **Include:**
  - Your Till Number (e.g., `9584650`)
  - Your Business Name
  - Your Daraja App Name
  - Your Consumer Key (for verification)
  - Use case: "STK Push (Lipa na Mpesa Online) for subscription payments"

**Note:** The Daraja AI assistant may incorrectly say you don't need a passkey, but for STK Push you DO need it.

#### Option 4: Check M-Pesa Business Portal (Different Portal)

The passkey might be in the **M-Pesa Business Portal** (separate from Daraja):

1. **Go to:** https://m-pesaforbusiness.co.ke/
2. **Log in** with your business credentials
3. **Navigate to:**
   - "API Settings"
   - "Online Payments" or "STK Push Settings"
   - "Till Number Settings" → Your Till Number

#### Option 5: Check Your Till Registration Documents

Sometimes the passkey is included in:
- SMS confirmation when Till was activated
- Email from Safaricom when Till was registered
- Physical documents if you applied in person
- Welcome emails from Safaricom

### How the Passkey Is Used

The passkey is **NOT sent directly** in API calls. Instead, it's used to generate the `Password` field:

```typescript
// Password Generation Formula:
Password = Base64(SHORTCODE + PASSKEY + TIMESTAMP)

// Example:
// SHORTCODE = "300584"
// PASSKEY = "your_passkey_here"
// TIMESTAMP = "20250925124519" (YYYYMMDDHHmmss)

const passwordString = "300584" + "your_passkey_here" + "20250925124519";
const password = Buffer.from(passwordString).toString('base64');
// Result: "MzAwNTg0eW91cl9wYXNza2V5X2hlcmUyMDI1MDkyNTEyNDUxOQ=="
```

### Why You Don't See Passkey in Postman Collection

The Postman collection shows the **final password** (already base64 encoded), not the passkey itself. The passkey is used **server-side** to generate the password before making the API call.

**In Postman:**
```json
{
  "Password": "MTc0Mzc5YmZiMjc5ZjlhYTliZGJjZjE1OGU5N2RkNzFhNDY3Y2QyZTBjODkzMDU5YjEwZjc4ZTZiNzJhZGExZWQyYzkxOTIwMjUwOTI1MTI0NTE5"
}
```

**Behind the scenes:**
```typescript
// This is what generates that password:
const passkey = "bfb279f9aa5bdbcf158e97dd761a467a2e6c893e05ac5768faab4834a68208ac";
const shortcode = "174379";
const timestamp = "20250925124519";
const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
```

---

## 3. Setup Instructions

### For STK Push (Buy Goods) - Current Implementation

**You need:**
- ✅ Consumer Key
- ✅ Consumer Secret
- ✅ Till Number (Shortcode)
- ✅ **Passkey** ← This is what you're missing
- ❌ Certificates (NOT needed)

**Steps:**
1. Get passkey from Developer Portal (see above)
2. Add to `.env.local`:
   ```env
   MPESA_PASSKEY=your_passkey_here
   ```
3. That's it! Certificates can be stored for future use but aren't needed now.

### For Future B2C/Other Operations (If Needed)

If you want to implement B2C payments or other operations later:

1. **Keep certificates** in `certs/` folder
2. **Create a utility** to encrypt SecurityCredential:
   ```typescript
   // src/lib/mpesa/certificate-encrypt.ts
   import * as crypto from 'crypto';
   import * as fs from 'fs';
   
   export function encryptSecurityCredential(
     initiatorPassword: string,
     certificatePath: string
   ): string {
     const cert = fs.readFileSync(certificatePath, 'utf8');
     const encrypted = crypto.publicEncrypt(
       {
         key: cert,
         padding: crypto.constants.RSA_PKCS1_PADDING,
       },
       Buffer.from(initiatorPassword)
     );
     return encrypted.toString('base64');
   }
   ```

---

## 4. Quick Reference

### STK Push (Buy Goods) - What You Need

| Item | Where to Get | Required? |
|------|-------------|-----------|
| Consumer Key | Developer Portal → Your App | ✅ Yes |
| Consumer Secret | Developer Portal → Your App | ✅ Yes |
| Till Number | Safaricom (when registering Till) | ✅ Yes |
| **Passkey** | Developer Portal → Go Live process | ✅ **Yes** |
| Certificates | Developer Portal (download) | ❌ No |

### B2C/Other Operations - What You Need

| Item | Where to Get | Required? |
|------|-------------|-----------|
| Consumer Key | Developer Portal → Your App | ✅ Yes |
| Consumer Secret | Developer Portal → Your App | ✅ Yes |
| Initiator Name | You set this (e.g., "testapi") | ✅ Yes |
| Initiator Password | You set this | ✅ Yes |
| Certificate | Developer Portal (download) | ✅ Yes |

---

## 5. Troubleshooting

### "Passkey not found"

**Solution:**
1. Check Developer Portal → Your App → Look for "Passkey" or "Online Passkey"
2. Complete "Go Live" process if not done
3. Check your email (including spam) for passkey
4. Contact apisupport@safaricom.co.ke

### "Invalid password" error in STK Push

**Solution:**
1. Verify passkey is correct (no extra spaces)
2. Check timestamp format (YYYYMMDDHHmmss, 14 digits)
3. Verify shortcode matches your Till Number
4. Ensure passkey is for the correct environment (sandbox vs production)

### Certificates downloaded but not sure what to do

**Solution:**
- **For STK Push:** You don't need them. Store them for future use.
- **For B2C:** You'll need them to encrypt SecurityCredential (future implementation)

---

## 6. Next Steps

1. **Get your passkey** from Developer Portal
2. **Add to `.env.local`:**
   ```env
   MPESA_PASSKEY=your_actual_passkey_here
   ```
3. **Test STK Push** - The integration should work now
4. **Store certificates** - Keep them for future B2C implementation if needed

---

## Support

- **Safaricom Developer Portal:** https://developer.safaricom.co.ke/
- **API Support Email:** apisupport@safaricom.co.ke
- **Developer Documentation:** https://developer.safaricom.co.ke/apis
