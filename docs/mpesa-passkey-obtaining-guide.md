# How to Get Your M-Pesa Passkey (Step-by-Step)

## Important: The Daraja AI Assistant is Incorrect

**The Daraja AI assistant saying "You don't need an M-PESA passkey" is WRONG for STK Push.**

For **STK Push (Lipa na M-Pesa Online)** with Buy Goods, you **DO need a passkey**. The AI assistant may be referring to other API operations, but for subscription payments using STK Push, the passkey is essential.

## Your Current Setup

Based on your Daraja portal:
- **Production App:** "Prod-DUKANEST MICROSYSTEMS"
- **Short Code:** `9584650`
- **Products:** TransactionStatus, B2B, **Lipa na Mpesa Production** ✅
- **Consumer Key:** `ollHDX5Vh4eahlguoNu4p2p28x4qp0wgjHIUShvlyuvXOGkm`
- **Consumer Secret:** `MeSTuN8Ox9H7cjjHK9R1PvriOiRqMSfUxvBER637LFsXtAXYct5HCRBx60BNSCvr`

**Note:** The passkey is **NOT displayed** in the Daraja portal interface. You need to get it through other means.

## Where to Get Your Passkey

### Method 1: Check Your Email (Most Common)

When you registered your Till Number (`9584650`) or completed the "Go Live" process, Safaricom typically sends the passkey via email.

**Check for emails from:**
- `apisupport@safaricom.co.ke`
- `noreply@safaricom.co.ke`
- `daraja@safaricom.co.ke`

**Subject lines to look for:**
- "M-Pesa API Passkey"
- "Daraja API Credentials"
- "Your Till Number Passkey"
- "Go Live Approval"

**Search your inbox for:**
- Your Till Number: `9584650`
- "passkey"
- "Daraja"
- "API credentials"

### Method 2: Safaricom Developer Portal - App Settings

1. **Log in** to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. **Go to your Production App:** "Prod-DUKANEST MICROSYSTEMS"
3. **Look for these sections:**
   - "App Credentials" or "API Credentials"
   - "Security" or "Authentication"
   - "Passkey" or "Online Passkey"
   - "STK Push Settings"
   - "Lipa na Mpesa Settings"

4. **Check tabs/sections:**
   - Some portals have a "Credentials" tab separate from the main view
   - Look for a "Show Passkey" or "Reveal Passkey" button
   - Check "Advanced Settings" or "Additional Settings"

### Method 3: M-Pesa Business Portal (Different Portal)

The passkey might be in the **M-Pesa Business Portal** (different from Daraja Developer Portal):

1. **Go to:** https://m-pesaforbusiness.co.ke/
2. **Log in** with your business credentials
3. **Navigate to:**
   - "API Settings"
   - "Online Payments"
   - "STK Push Settings"
   - "Till Number Settings" → Your Till `9584650`

### Method 4: Contact Safaricom Support (Recommended)

Since the passkey isn't visible in your portal, **contact Safaricom directly**:

**Email:** apisupport@safaricom.co.ke

**Subject:** "Request for M-Pesa API Passkey - Till Number 9584650"

**Email Template:**
```
Subject: Request for M-Pesa API Passkey - Till Number 9584650

Dear Safaricom API Support,

I am requesting the passkey for my M-Pesa API integration.

Details:
- Business Name: DUKANEST MICROSYSTEMS LIMITED
- Till Number/Short Code: 9584650
- Daraja App Name: Prod-DUKANEST MICROSYSTEMS
- Consumer Key: ollHDX5Vh4eahlguoNu4p2p28x4qp0wgjHIUShvlyuvXOGkm
- Use Case: STK Push (Lipa na Mpesa Online) for subscription payments

I need the passkey to complete my STK Push integration. The passkey is not visible in my Daraja Developer Portal.

Please provide the passkey or guide me on where to find it.

Thank you,
[Your Name]
[Your Contact Information]
```

### Method 5: Check Your Till Registration Documents

If you applied for the Till Number through:
- **Online application:** Check confirmation emails
- **Physical application:** Check documents you received
- **SMS notifications:** Check messages from Safaricom

The passkey might have been included in:
- Till activation SMS
- Welcome email
- Business registration confirmation

## Understanding the Passkey

### What It Looks Like

The passkey is typically a **long alphanumeric string**, for example:
```
bfb279f9aa5bdbcf158e97dd761a467a2e6c893e05ac5768faab4834a68208ac
```

**Characteristics:**
- Usually 64+ characters
- Hexadecimal format (0-9, a-f)
- No spaces or special characters
- Case-sensitive

### How It's Used

The passkey is used to generate the STK Push password:

```typescript
// Password = Base64(SHORTCODE + PASSKEY + TIMESTAMP)
Password = Base64("9584650" + "your_passkey_here" + "20250925124519")
```

## Verification Steps

Once you have the passkey:

1. **Add to `.env.local`:**
   ```env
   MPESA_SHORTCODE=9584650
   MPESA_PASSKEY=your_actual_passkey_here
   MPESA_CONSUMER_KEY=ollHDX5Vh4eahlguoNu4p2p28x4qp0wgjHIUShvlyuvXOGkm
   MPESA_CONSUMER_SECRET=MeSTuN8Ox9H7cjjHK9R1PvriOiRqMSfUxvBER637LFsXtAXYct5HCRBx60BNSCvr
   MPESA_ENVIRONMENT=production
   ```

2. **Test STK Push:**
   - Try initiating a payment
   - If password generation works, the passkey is correct
   - If you get "Invalid password" error, the passkey might be wrong

## Why It's Not Visible

The passkey is often **not displayed** in the Daraja portal for security reasons:
- It's a sensitive credential
- It's tied to your Till Number, not just the API app
- It may be managed separately from API credentials

## Alternative: Request New Passkey

If you can't find the original passkey:

1. **Contact Safaricom** to regenerate/reset the passkey
2. **They may require:**
   - Business verification
   - Till Number confirmation
   - Identity verification

## Quick Action Items

1. ✅ **Check your email** (search for "passkey", "9584650", "Daraja")
2. ✅ **Check M-Pesa Business Portal** (different from Daraja)
3. ✅ **Email apisupport@safaricom.co.ke** (most reliable method)
4. ✅ **Check Till registration documents/SMS**

## Important Notes

- **Sandbox vs Production:** You may have different passkeys for sandbox and production
- **Till Number Specific:** The passkey is tied to your Till Number (`9584650`), not just the app
- **Security:** Never share your passkey publicly or commit it to version control
- **One Passkey Per Till:** Each Till Number has its own unique passkey

## Support Contacts

- **API Support Email:** apisupport@safaricom.co.ke
- **M-Pesa Business Support:** 234 (from Safaricom line)
- **Developer Portal:** https://developer.safaricom.co.ke/

---

**Most Likely Solution:** Check your email first, then contact apisupport@safaricom.co.ke with your Till Number (`9584650`) and request the passkey.
