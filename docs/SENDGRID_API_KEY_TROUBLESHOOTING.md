# SendGrid API Key Troubleshooting

## Issue: "Unauthorized" or "Permission denied, wrong credentials"

If you're getting this error when testing emails, it means SendGrid is rejecting your API key.

---

## Quick Fixes

### 1. Verify API Key is Correct

**Check your `.env.local` file:**
```env
SENDGRID_API_KEY=SG.your-actual-api-key-here
```

**Common issues:**
- ❌ Extra spaces or quotes around the key
- ❌ Key is commented out (has `#` in front)
- ❌ Key is incomplete or truncated
- ❌ Wrong key copied (might be from different SendGrid account)

**Correct format:**
```env
SENDGRID_API_KEY=SG.your-actual-api-key-here
```

### 2. Verify API Key in SendGrid Dashboard

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Check if your API key exists and is **Active**
4. If key is missing or inactive:
   - Create a new API key
   - Select **Full Access** or **Restricted Access** with Mail Send permissions
   - Copy the new key (you'll only see it once!)
   - Update `.env.local` with the new key

### 3. Check API Key Permissions

Your API key needs **Mail Send** permissions:

1. Go to SendGrid Dashboard → **Settings** → **API Keys**
2. Click on your API key
3. Verify **Mail Send** permission is enabled
4. If not, either:
   - Enable the permission (if using Restricted Access)
   - Or create a new **Full Access** key

### 4. Verify Sender Email

SendGrid requires the sender email to be verified:

1. Go to SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Check if `noreply@dukanest.com` (or your `SENDGRID_FROM_EMAIL`) is verified
3. If not verified:
   - Click **Verify a Single Sender**
   - Enter your email
   - Complete verification process
   - Or use **Domain Authentication** (recommended for production)

### 5. Test API Key Directly

You can test your API key using curl:

```bash
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "your-email@example.com"}]
    }],
    "from": {"email": "noreply@dukanest.com"},
    "subject": "Test Email",
    "content": [{
      "type": "text/plain",
      "value": "This is a test email"
    }]
  }'
```

**If this works:** Your API key is valid, the issue is in the application code.

**If this fails:** Your API key is invalid or expired.

---

## Common Error Messages

### "Permission denied, wrong credentials"
- **Cause:** Invalid or expired API key
- **Fix:** Generate a new API key in SendGrid Dashboard

### "The from address does not match a verified Sender Identity"
- **Cause:** Sender email not verified
- **Fix:** Verify sender email in SendGrid Dashboard

### "Forbidden"
- **Cause:** API key doesn't have Mail Send permission
- **Fix:** Update API key permissions or create new key with Mail Send enabled

---

## Step-by-Step: Create New API Key

1. **Go to SendGrid Dashboard:**
   - Visit https://app.sendgrid.com/
   - Login to your account

2. **Navigate to API Keys:**
   - Click **Settings** (gear icon)
   - Click **API Keys**

3. **Create New Key:**
   - Click **Create API Key**
   - Name it (e.g., "StoreFlow Production")
   - Select **Full Access** (or **Restricted Access** with Mail Send)
   - Click **Create & View**

4. **Copy the Key:**
   - **IMPORTANT:** Copy the key immediately (you won't see it again!)
   - It starts with `SG.` and is very long

5. **Update `.env.local`:**
   ```env
   SENDGRID_API_KEY=SG.your-new-api-key-here
   ```

6. **Test Again:**
   ```bash
   npm run test:email your-email@example.com
   ```

---

## Verify Environment Variable is Loaded

Check if the script is reading your API key:

```bash
# Windows PowerShell
$env:SENDGRID_API_KEY

# Or check in the script output
# Look for: "✅ SendGrid API key found"
```

If the script says "SendGrid API key found" but still gets "Unauthorized", the key itself is invalid.

---

## Alternative: Use Resend Instead

If SendGrid continues to have issues, you can switch to Resend:

1. **Get Resend API Key:**
   - Sign up at https://resend.com
   - Get your API key from dashboard

2. **Update `.env.local`:**
   ```env
   # Comment out SendGrid
   # SENDGRID_API_KEY=...
   
   # Use Resend instead
   RESEND_API_KEY=re_your-resend-api-key
   ```

3. **Update email service:**
   - The unified email service should automatically use Resend if `RESEND_API_KEY` is set

---

## Still Not Working?

1. **Check SendGrid Account Status:**
   - Make sure your SendGrid account is active
   - Check for any account suspensions or limits

2. **Check API Key Age:**
   - Old API keys might be expired
   - Create a fresh API key

3. **Check Rate Limits:**
   - Free tier has limits (100 emails/day)
   - Check if you've exceeded limits

4. **Contact SendGrid Support:**
   - If nothing works, contact SendGrid support
   - They can check your account status

---

## Quick Test Command

After updating your API key, test immediately:

```bash
npm run test:email your-email@example.com
```

**Expected output:**
```
✅ SendGrid API key found
✅ Database URL found (or using mock data)
1️⃣  Testing Renewal Reminder Email...
   ✅ Sent successfully
```

---

**Last Updated:** 2024
