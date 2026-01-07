# Two-Factor Authentication (2FA) Guide

**Last Updated:** 2024

---

## Overview

Two-factor authentication (2FA) adds an extra layer of security to tenant admin accounts by requiring a time-based one-time password (TOTP) from an authenticator app in addition to the password.

**Technology:** Supabase MFA (TOTP)  
**Supported Apps:** Google Authenticator, Authy, Microsoft Authenticator, 1Password, and other TOTP-compatible apps

---

## Prerequisites

### 1. Enable MFA in Supabase Dashboard

**Important:** MFA must be enabled in your Supabase project settings before it can be used.

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **Policies** (or **Settings** → **Auth**)
4. Enable **Multi-Factor Authentication (MFA)**
5. Enable **TOTP** (Time-based One-Time Password)
6. Save changes

**Note:** MFA is available on Supabase Pro plan and above. Free tier may have limitations.

### 2. Local Development (Optional)

If using local Supabase, update `supabase/config.toml`:

```toml
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

---

## How It Works

### Enrollment Flow (First Time Setup)

1. **User goes to Settings** → **General** tab
2. **Clicks "Enable Two-Factor Authentication"**
3. **QR Code is displayed** - User scans with authenticator app
4. **User enters 6-digit code** from app to verify
5. **2FA is enabled** - User must enter code on every login

### Login Flow (With 2FA Enabled)

1. **User enters email and password**
2. **System checks if 2FA is enabled**
3. **If enabled:**
   - User is prompted for 6-digit code
   - User enters code from authenticator app
   - System verifies code and completes login
4. **If not enabled:**
   - Login completes normally

---

## User Guide

### Enabling 2FA

1. Log in to your tenant admin dashboard
2. Go to **Settings** → **General** tab
3. Scroll to **Two-Factor Authentication** section
4. Click **"Enable Two-Factor Authentication"**
5. **Scan the QR code** with your authenticator app:
   - **Google Authenticator** (iOS/Android)
   - **Authy** (iOS/Android/Desktop)
   - **Microsoft Authenticator** (iOS/Android)
   - **1Password** (iOS/Android/Desktop)
   - Any TOTP-compatible app
6. **Enter the 6-digit code** from your app
7. Click **"Verify & Enable"**

### Logging In With 2FA

1. Enter your **email** and **password**
2. Click **"Sign in to Dashboard"**
3. You'll see a prompt: **"Two-Factor Authentication Required"**
4. **Open your authenticator app**
5. **Enter the 6-digit code** shown in your app
6. Click **"Sign in"** (or press Enter)

### Disabling 2FA

1. Go to **Settings** → **General** tab
2. Scroll to **Two-Factor Authentication** section
3. Click **"Disable Two-Factor Authentication"**
4. **Enter your password** to confirm
5. Click **"Disable 2FA"**

---

## API Endpoints

### 1. Start 2FA Enrollment

**POST** `/api/auth/tenant/mfa/enroll`

**Authentication:** Required (tenant_admin or tenant_staff)

**Response:**
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP",
  "uri": "otpauth://totp/...",
  "factorId": "uuid"
}
```

### 2. Verify Enrollment

**POST** `/api/auth/tenant/mfa/verify-enroll`

**Body:**
```json
{
  "factorId": "uuid",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA has been successfully enabled for your account"
}
```

### 3. Verify 2FA Code (During Login)

**POST** `/api/auth/tenant/mfa/verify`

**Body:**
```json
{
  "challengeId": "uuid",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... },
  "session": { ... }
}
```

### 4. Get 2FA Status

**GET** `/api/auth/tenant/mfa/status`

**Response:**
```json
{
  "enabled": true,
  "factorId": "uuid",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 5. Disable 2FA

**POST** `/api/auth/tenant/mfa/disable`

**Body:**
```json
{
  "password": "user-password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA has been successfully disabled for your account"
}
```

---

## Security Best Practices

### ✅ Recommended

1. **Enable 2FA for all admin accounts** - Especially for production
2. **Use a reputable authenticator app** - Google Authenticator, Authy, or 1Password
3. **Keep backup codes safe** - Store them securely (future feature)
4. **Don't share your authenticator app** - Keep it private
5. **Use strong passwords** - Even with 2FA, strong passwords are important

### ❌ Avoid

1. **Don't disable 2FA** unless necessary
2. **Don't share QR codes** - They're unique to your account
3. **Don't use SMS for 2FA** - TOTP (authenticator apps) is more secure
4. **Don't store codes in plain text** - Use a password manager

---

## Troubleshooting

### "2FA not available" Error

**Problem:** MFA is not enabled in Supabase

**Solution:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Enable Multi-Factor Authentication
3. Enable TOTP
4. Save changes
5. Try again

### "Invalid code" Error

**Possible Causes:**
- Code expired (codes refresh every 30 seconds)
- Clock sync issue on your device
- Wrong code entered

**Solutions:**
- Wait for a new code (30 seconds)
- Check your device's time/date settings
- Double-check the code you're entering
- Make sure you're using the correct account in your authenticator app

### Lost Access to Authenticator App

**If you lose access:**
1. Contact support to disable 2FA
2. Re-enable 2FA with a new device
3. (Future: Use backup codes if implemented)

### Can't Scan QR Code

**Alternative:**
1. Click "Can't scan?" or look for manual entry option
2. Copy the **secret key** shown
3. Manually add it to your authenticator app:
   - Open your authenticator app
   - Choose "Enter a setup key" or "Manual entry"
   - Enter the secret key
   - Set account name (e.g., "My Store Admin")
   - Save

---

## Technical Details

### How TOTP Works

1. **Secret Key:** Generated when you enroll (stored securely in Supabase)
2. **Time-based:** Codes change every 30 seconds
3. **Algorithm:** HMAC-SHA1 (industry standard)
4. **Code Length:** 6 digits

### Security Features

- ✅ **No SMS dependency** - Works offline
- ✅ **Time-based codes** - Expire after 30 seconds
- ✅ **Unique per account** - Each user has their own secret
- ✅ **Encrypted storage** - Secrets stored securely in Supabase
- ✅ **Password required** - Must know password + have device

---

## Implementation Details

### Files Created

1. **API Routes:**
   - `/api/auth/tenant/mfa/enroll` - Start enrollment
   - `/api/auth/tenant/mfa/verify-enroll` - Verify enrollment
   - `/api/auth/tenant/mfa/verify` - Verify during login
   - `/api/auth/tenant/mfa/disable` - Disable 2FA
   - `/api/auth/tenant/mfa/status` - Get 2FA status

2. **Components:**
   - `/dashboard/settings/mfa-settings.tsx` - 2FA settings UI

3. **Updated Files:**
   - `/api/auth/tenant/login` - Checks for 2FA and creates challenge
   - `/dashboard/login/page.tsx` - Handles 2FA code input
   - `/dashboard/settings/tenant-settings-client.tsx` - Added MFA settings

---

## Future Enhancements

- [ ] Backup codes for account recovery
- [ ] SMS-based 2FA option
- [ ] WebAuthn (hardware keys) support
- [ ] 2FA recovery flow
- [ ] Trusted devices (remember for 30 days)
- [ ] 2FA activity log

---

## Resources

- [Supabase MFA Documentation](https://supabase.com/docs/guides/auth/auth-mfa)
- [Supabase MFA API Reference](https://supabase.com/docs/reference/javascript/auth-mfa-api)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator](https://www.google.com/landing/2step/)
- [Authy](https://authy.com/)

---

**Note:** 2FA is optional but highly recommended for all tenant admin accounts, especially in production environments.

