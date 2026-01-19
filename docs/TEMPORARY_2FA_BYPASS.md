# Temporary 2FA Bypass Guide

**⚠️ IMPORTANT: This is a temporary workaround for development/testing only**

---

## When to Use This

Use this bypass **only** when:
- ✅ Waiting for SendGrid account approval (up to 72 hours)
- ✅ Email service is temporarily unavailable
- ✅ Testing in development environment
- ✅ Email service configuration is in progress

**⚠️ NEVER use this in production!**

---

## How to Enable 2FA Bypass

### Step 1: Open Your Environment File

Open your `.env.local` file (or create it from `env.template`):

```bash
# Windows PowerShell
notepad .env.local

# Or use your preferred editor
code .env.local
```

### Step 2: Add the Bypass Flag

Add this line to your `.env.local` file:

```env
DISABLE_MFA_TEMPORARILY=true
```

**Important:** Make sure `NODE_ENV=development` is also set (it should be by default).

### Step 3: Restart Your Development Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test Login

1. Go to your admin login page: `http://localhost:3000/dashboard/login`
2. Enter your email and password
3. You should now be logged in **without** needing the 2FA code
4. You'll see a warning message indicating 2FA is bypassed

---

## How It Works

The bypass:
- ✅ Only works when `NODE_ENV=development` or `NODE_ENV=test`
- ✅ Completely skips the OTP email sending step
- ✅ Logs warnings to console for visibility
- ✅ Returns a warning message in the response
- ❌ **Will NOT work in production** (automatically disabled)

---

## Security Notes

### What This Bypass Does:
- Allows login without 2FA verification
- Skips email OTP generation and sending
- Completes authentication immediately after password verification

### Security Implications:
- ⚠️ **Reduces security** - No second factor authentication
- ⚠️ **Development only** - Automatically disabled in production
- ⚠️ **Temporary** - Should be removed once email service is ready

### Best Practices:
1. **Use only when necessary** - Don't leave this enabled longer than needed
2. **Remove immediately** - Once SendGrid is approved, disable this flag
3. **Monitor logs** - Check console for bypass warnings
4. **Test properly** - Once email service works, test 2FA flow

---

## How to Disable the Bypass

### Step 1: Update Environment File

Open `.env.local` and either:
- Remove the line: `DISABLE_MFA_TEMPORARILY=true`
- Or set it to: `DISABLE_MFA_TEMPORARILY=false`

### Step 2: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 3: Test 2FA Flow

1. Try logging in
2. You should now be prompted for 2FA code
3. Check your email for the 6-digit code
4. Enter code to complete login

---

## Troubleshooting

### Bypass Not Working?

1. **Check environment variable:**
   ```bash
   # Verify it's set correctly
   echo $DISABLE_MFA_TEMPORARILY  # Linux/Mac
   $env:DISABLE_MFA_TEMPORARILY   # Windows PowerShell
   ```

2. **Check NODE_ENV:**
   ```bash
   # Must be 'development' or 'test'
   echo $NODE_ENV
   ```

3. **Check server logs:**
   - Look for: `[Login API] ⚠️ 2FA BYPASS ENABLED`
   - If you don't see this, the bypass isn't active

4. **Restart server:**
   - Environment variables are loaded at startup
   - Changes require server restart

### Still Seeing 2FA Prompt?

- Verify `.env.local` file is in the project root
- Check for typos: `DISABLE_MFA_TEMPORARILY` (not `DISABLE_MFA`)
- Ensure `NODE_ENV=development` is set
- Restart your development server

---

## After SendGrid Approval

Once SendGrid approves your account (within 72 hours):

1. **Disable the bypass:**
   ```env
   DISABLE_MFA_TEMPORARILY=false
   ```

2. **Restart server:**
   ```bash
   npm run dev
   ```

3. **Test 2FA:**
   - Login should now require 2FA code
   - Check email for OTP code
   - Verify login completes successfully

4. **Remove the flag:**
   - Optionally remove `DISABLE_MFA_TEMPORARILY` from `.env.local`
   - The system will default to requiring 2FA

---

## Code Location

The bypass logic is implemented in:
- **File:** `src/app/api/auth/tenant/login/route.ts`
- **Line:** ~232-250 (check for `bypassMFA` variable)

To review or modify the bypass logic, check this file.

---

## Summary

**Quick Enable:**
```env
DISABLE_MFA_TEMPORARILY=true
```

**Quick Disable:**
```env
DISABLE_MFA_TEMPORARILY=false
```

**Remember:**
- ✅ Development/test only
- ✅ Temporary solution
- ✅ Remove once email service is ready
- ❌ Never use in production

---

**Questions?** Check the [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md) or review the login route code.
