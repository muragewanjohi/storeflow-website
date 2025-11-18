# CRON_SECRET_TOKEN Setup Guide

**Last Updated:** 2024

---

## What is CRON_SECRET_TOKEN?

`CRON_SECRET_TOKEN` is a **secret token you generate yourself** to protect your cron job endpoint from unauthorized access. It's not provided by any service - you create it.

---

## Why Do You Need It?

The subscription expiry checker endpoint (`/api/admin/subscriptions/expiry-checker`) is a public API route that needs to be accessible by cron jobs. Without protection, anyone could call it and trigger subscription checks.

The token acts as a simple authentication mechanism to ensure only authorized cron jobs can trigger the endpoint.

---

## How to Generate a Secure Token

### Option 1: Using Node.js (Recommended)

```bash
# In your terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This generates a 64-character hexadecimal string like:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Option 2: Using OpenSSL

```bash
# In your terminal (Windows PowerShell)
openssl rand -hex 32

# Or in Git Bash / Linux / Mac
openssl rand -hex 32
```

### Option 3: Using Online Generator

Visit: https://www.random.org/strings/
- Length: 64
- Characters: Hexadecimal (0-9, a-f)
- Generate and copy

### Option 4: Using PowerShell (Windows)

```powershell
# In PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

---

## Where to Add the Token

### 1. Local Development (.env.local)

Add to `storeflow/.env.local`:

```env
# Cron Job Security
CRON_SECRET_TOKEN=your-generated-token-here
```

**Example:**
```env
CRON_SECRET_TOKEN=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### 2. Vercel Environment Variables

1. Go to: https://vercel.com/dashboard
2. Select your **StoreFlow** project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name:** `CRON_SECRET_TOKEN`
   - **Value:** Your generated token
   - **Environment:** Production, Preview, Development (select all)
5. Click **Save**

### 3. GitHub Actions (If Using External Cron)

If you're using GitHub Actions for cron jobs, add it as a secret:

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name:** `CRON_SECRET_TOKEN`
5. **Value:** Your generated token
6. Click **Add secret**

---

## How It Works

### In the API Endpoint

The expiry checker endpoint checks for the token:

```typescript
const authHeader = request.headers.get('authorization');
const expectedToken = process.env.CRON_SECRET_TOKEN;

if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}
```

### Vercel Cron (Automatic)

When using Vercel Cron (configured in `vercel.json`), Vercel automatically adds the token to requests if you set it in environment variables.

**Vercel automatically sends:**
```
Authorization: Bearer ${CRON_SECRET_TOKEN}
```

### Manual Testing

When testing manually, include the token:

```bash
curl -X GET \
  -H "Authorization: Bearer your-cron-secret-token" \
  https://your-app.vercel.app/api/admin/subscriptions/expiry-checker
```

### GitHub Actions Example

```yaml
- name: Call Expiry Checker
  run: |
    curl -X GET \
      -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
      https://your-app.vercel.app/api/admin/subscriptions/expiry-checker
```

---

## Security Best Practices

1. **Use a Long, Random Token**
   - At least 32 characters (64 hex characters = 32 bytes)
   - Use cryptographically secure random generation

2. **Never Commit to Git**
   - Always use environment variables
   - Add `.env.local` to `.gitignore`

3. **Rotate Periodically**
   - Change the token every 6-12 months
   - Update in all environments when rotating

4. **Use Different Tokens**
   - Different tokens for development, staging, production
   - Never reuse tokens across environments

5. **Keep It Secret**
   - Don't share in chat, emails, or documentation
   - Only store in secure environment variable systems

---

## Quick Setup Checklist

- [ ] Generate a secure token (64 hex characters)
- [ ] Add to `.env.local` for local development
- [ ] Add to Vercel environment variables (all environments)
- [ ] Test the endpoint manually with the token
- [ ] Verify Vercel cron job works (check logs after first run)
- [ ] Document the token location (for team members)

---

## Troubleshooting

### Error: "Unauthorized"

**Cause:** Token mismatch or missing token

**Solutions:**
1. Check `CRON_SECRET_TOKEN` is set in environment variables
2. Verify token matches in all places (local, Vercel, etc.)
3. Check Authorization header format: `Bearer <token>`
4. Ensure no extra spaces or newlines in token

### Vercel Cron Not Working

**Solutions:**
1. Verify `vercel.json` is in project root
2. Check environment variable is set in Vercel dashboard
3. Verify cron schedule is correct (`0 0 * * *` = daily at midnight UTC)
4. Check Vercel deployment logs for errors

### Testing Locally

**Option 1: Disable Token Check (Development Only)**

Temporarily comment out the token check in the API route for local testing:

```typescript
// Temporarily disable for local testing
// if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
//   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
// }
```

**Option 2: Use Token in Request**

```bash
curl -X GET \
  -H "Authorization: Bearer your-token-from-env-local" \
  http://localhost:3000/api/admin/subscriptions/expiry-checker
```

---

## Example Token Generation

Here's a complete example:

```bash
# Generate token
$ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Add to .env.local
CRON_SECRET_TOKEN=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Test it
$ curl -X GET \
    -H "Authorization: Bearer a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" \
    http://localhost:3000/api/admin/subscriptions/expiry-checker
```

---

**Last Updated:** 2024

