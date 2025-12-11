# Troubleshooting Guide

**Common issues and solutions for Dukanest platform**

---

## Table of Contents

1. [Authentication Issues](#authentication-issues)
2. [Database Issues](#database-issues)
3. [Deployment Issues](#deployment-issues)
4. [Performance Issues](#performance-issues)
5. [Email Issues](#email-issues)
6. [Domain & DNS Issues](#domain--dns-issues)
7. [Payment Issues](#payment-issues)
8. [General Issues](#general-issues)

---

## Authentication Issues

### "Access denied" (403) on Login

**Symptoms:**
- Login returns 403 error
- "Access denied" message
- User exists but can't log in

**Causes:**
1. User doesn't have correct role in metadata
2. User belongs to different tenant
3. Account is suspended

**Solutions:**

1. **Check user role:**
   ```bash
   npx tsx scripts/find-landlord-account.ts
   # Or check in Supabase Dashboard → Authentication → Users
   ```

2. **Fix landlord role:**
   ```bash
   npx tsx scripts/fix-landlord-role.ts <email>
   ```

3. **Check tenant association:**
   - Verify user's `tenant_id` matches current tenant
   - Check user metadata in Supabase

4. **Verify account status:**
   - Check if account is suspended
   - Verify email is confirmed

### "Invalid credentials" (401) on Login

**Symptoms:**
- Login returns 401 error
- "Invalid credentials" message

**Causes:**
1. Wrong password
2. Email not confirmed
3. Account doesn't exist

**Solutions:**

1. **Reset password:**
   ```bash
   # For landlord
   npx tsx scripts/reset-landlord-password.ts <email> <new-password>
   
   # For tenant admin (use Supabase Dashboard)
   ```

2. **Check email confirmation:**
   - Go to Supabase Dashboard → Authentication → Users
   - Verify `email_confirmed_at` is set
   - Resend confirmation email if needed

3. **Verify account exists:**
   ```bash
   npx tsx scripts/find-landlord-account.ts
   ```

### Password Reset Not Working

**Symptoms:**
- Reset email not received
- Reset link doesn't work
- "Token expired" error

**Solutions:**

1. **Check email configuration:**
   - Verify SendGrid API key
   - Check SendGrid account status
   - Review email logs in SendGrid dashboard

2. **Verify redirect URL:**
   - Check Supabase redirect URLs configuration
   - Ensure reset URL is in allowed list
   - Format: `https://yoursubdomain.dukanest.com/reset-password`

3. **Check token expiration:**
   - Reset links expire after 1 hour
   - Request new reset link if expired

4. **Verify Supabase configuration:**
   - Check email templates in Supabase
   - Verify SMTP settings (if using custom SMTP)

---

## Database Issues

### Connection Errors

**Symptoms:**
- "Database connection failed"
- "Cannot connect to database"
- Timeout errors

**Solutions:**

1. **Verify DATABASE_URL:**
   ```bash
   # Check environment variable
   echo $DATABASE_URL
   
   # Format should be:
   # postgresql://user:password@host:port/database
   ```

2. **Test connection:**
   ```bash
   npx prisma db pull
   # If this works, connection is good
   ```

3. **Check Supabase status:**
   - Go to Supabase Dashboard
   - Check project status
   - Verify database is running

4. **Check IP allowlist:**
   - If using IP restrictions, add your IP
   - Or disable IP restrictions for development

5. **Verify connection pool:**
   - Check connection pool limits
   - Reduce concurrent connections if needed

### Migration Errors

**Symptoms:**
- Migration fails
- "Migration already applied" error
- Schema out of sync

**Solutions:**

1. **Check migration status:**
   ```bash
   npx prisma migrate status
   ```

2. **Reset database (development only):**
   ```bash
   npx prisma migrate reset
   # ⚠️ WARNING: This deletes all data!
   ```

3. **Apply pending migrations:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Resolve migration conflicts:**
   ```bash
   npx prisma migrate resolve --applied <migration-name>
   # Or
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

### RLS Policy Errors

**Symptoms:**
- "Permission denied" errors
- Users can't access their data
- Cross-tenant data access

**Solutions:**

1. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'products';
   ```

3. **Test tenant context:**
   - Verify tenant ID is set correctly
   - Check middleware tenant resolution
   - Test with different tenants

4. **Reapply RLS migration:**
   ```bash
   # Run RLS migration again
   npx supabase db push
   ```

---

## Deployment Issues

### Build Failures on Vercel

**Symptoms:**
- Build fails on Vercel
- TypeScript errors
- Missing dependencies

**Solutions:**

1. **Run build locally first:**
   ```bash
   npm run build
   # Fix any errors before pushing
   ```

2. **Check environment variables:**
   - Verify all required env vars are set in Vercel
   - Check variable names match exactly
   - Ensure no typos

3. **Verify Node.js version:**
   - Check `package.json` for engine requirements
   - Set Node.js version in Vercel settings

4. **Clear cache:**
   ```bash
   # In Vercel dashboard
   # Settings → General → Clear Build Cache
   ```

5. **Check build logs:**
   - Review full build logs in Vercel
   - Look for specific error messages
   - Check for missing files

### Deployment Succeeds but App Doesn't Work

**Symptoms:**
- Build succeeds
- App loads but features don't work
- API errors

**Solutions:**

1. **Check environment variables:**
   - Verify production env vars are set
   - Check for missing API keys
   - Verify database URLs

2. **Check function logs:**
   - Go to Vercel → Functions → Logs
   - Look for runtime errors
   - Check API route errors

3. **Verify database connection:**
   - Test database connection from production
   - Check IP allowlist if enabled
   - Verify connection string format

4. **Check CORS settings:**
   - Verify CORS is configured correctly
   - Check allowed origins
   - Test API calls from browser

---

## Performance Issues

### Slow Page Loads

**Symptoms:**
- Pages take > 3 seconds to load
- Slow API responses
- High database query times

**Solutions:**

1. **Check database queries:**
   ```bash
   # Enable query logging in Prisma
   # Check for N+1 queries
   # Add missing indexes
   ```

2. **Optimize images:**
   - Use Next.js Image component
   - Compress images before upload
   - Use appropriate image sizes

3. **Enable caching:**
   - Check Redis cache is working
   - Verify cache TTL settings
   - Clear cache if needed

4. **Check CDN:**
   - Verify Vercel CDN is enabled
   - Check cache headers
   - Review CDN cache hit rates

### High Database Usage

**Symptoms:**
- Database CPU high
- Slow queries
- Connection pool exhausted

**Solutions:**

1. **Add database indexes:**
   ```sql
   -- Check missing indexes
   SELECT * FROM pg_stat_user_indexes;
   
   -- Add indexes for common queries
   CREATE INDEX idx_products_tenant_status 
   ON products(tenant_id, status);
   ```

2. **Optimize queries:**
   - Use `select` to limit fields
   - Add pagination
   - Use database views for complex queries

3. **Enable connection pooling:**
   - Use Supabase connection pooling
   - Reduce connection timeout
   - Limit concurrent connections

4. **Review query patterns:**
   - Check for N+1 queries
   - Use batch loading
   - Cache frequently accessed data

---

## Email Issues

### Emails Not Sending

**Symptoms:**
- No emails received
- Email sending fails
- "SendGrid error" messages

**Solutions:**

1. **Verify SendGrid API key:**
   ```bash
   # Check environment variable
   echo $SENDGRID_API_KEY
   
   # Test API key
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer $SENDGRID_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@dukanest.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
   ```

2. **Check SendGrid account:**
   - Verify account is active
   - Check sending limits
   - Review account status

3. **Verify sender email:**
   - Check sender email is verified in SendGrid
   - Verify domain authentication
   - Check SPF/DKIM records

4. **Review email logs:**
   - Check SendGrid activity feed
   - Look for bounce/spam reports
   - Review delivery statistics

### Emails Going to Spam

**Symptoms:**
- Emails delivered but in spam folder
- Low deliverability rates

**Solutions:**

1. **Configure SPF record:**
   ```
   Type: TXT
   Host: @
   Value: v=spf1 include:sendgrid.net ~all
   ```

2. **Configure DKIM:**
   - Get DKIM key from SendGrid
   - Add as TXT record in DNS
   - Wait for propagation

3. **Configure DMARC:**
   ```
   Type: TXT
   Host: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@dukanest.com
   ```

4. **Use verified sender:**
   - Verify sender domain in SendGrid
   - Use domain-based sender email
   - Avoid generic email addresses

---

## Domain & DNS Issues

### Subdomain Not Working

**Symptoms:**
- Subdomain doesn't load
- "Site not found" error
- SSL certificate errors

**Solutions:**

1. **Check DNS propagation:**
   ```bash
   # Check DNS records
   dig teststore.dukanest.com
   nslookup teststore.dukanest.com
   ```

2. **Verify wildcard DNS:**
   - Check CNAME record for `*`
   - Should point to `cname.vercel-dns.com`
   - Wait for DNS propagation (up to 48 hours)

3. **Check Vercel domain:**
   - Go to Vercel → Domains
   - Verify subdomain is listed
   - Check SSL certificate status

4. **Verify tenant exists:**
   - Check tenant in database
   - Verify subdomain matches
   - Check tenant status is "active"

### SSL Certificate Issues

**Symptoms:**
- "Not secure" warning
- SSL certificate errors
- Mixed content warnings

**Solutions:**

1. **Wait for certificate:**
   - Vercel auto-provisions SSL
   - Usually takes 1-5 minutes
   - Check certificate status in Vercel

2. **Verify DNS:**
   - Ensure DNS is configured correctly
   - Wait for DNS propagation
   - Check DNS records are correct

3. **Check certificate status:**
   - Go to Vercel → Domains
   - Check SSL certificate status
   - Request new certificate if needed

4. **Fix mixed content:**
   - Use HTTPS for all resources
   - Update image URLs to HTTPS
   - Check API endpoints use HTTPS

---

## Payment Issues

### Payment Gateway Errors

**Symptoms:**
- Payment fails
- "Payment gateway error"
- Transaction not processing

**Solutions:**

1. **Verify API credentials:**
   - Check Pesapal/PayPal credentials
   - Verify environment (sandbox vs production)
   - Test with test credentials

2. **Check webhook configuration:**
   - Verify webhook URL is correct
   - Check webhook is receiving requests
   - Review webhook logs

3. **Verify payment flow:**
   - Test payment with test card
   - Check payment status updates
   - Verify order creation

4. **Review payment logs:**
   - Check payment_logs table
   - Review error messages
   - Check payment gateway logs

---

## General Issues

### "Tenant not found" Error

**Symptoms:**
- Middleware can't resolve tenant
- 404 errors on tenant pages

**Solutions:**

1. **Check subdomain:**
   - Verify subdomain is correct
   - Check for typos
   - Verify tenant exists in database

2. **Check tenant status:**
   - Verify tenant status is "active"
   - Check tenant hasn't expired
   - Verify tenant hasn't been deleted

3. **Check middleware:**
   - Review middleware.ts logic
   - Verify tenant resolution query
   - Check database connection

4. **Verify DNS:**
   - Check subdomain DNS is configured
   - Verify wildcard DNS record
   - Wait for DNS propagation

### Hydration Errors

**Symptoms:**
- "Hydration failed" errors
- Mismatch between server and client
- React warnings

**Solutions:**

1. **Check for client-only code:**
   ```typescript
   // Use useEffect for client-only code
   useEffect(() => {
     // Client-only code here
   }, []);
   ```

2. **Fix date/time issues:**
   ```typescript
   // Use suppressHydrationWarning for dynamic content
   <div suppressHydrationWarning>
     {new Date().toLocaleString()}
   </div>
   ```

3. **Check for browser APIs:**
   - Don't use `window` or `document` in server components
   - Use `useEffect` for browser APIs
   - Check for localStorage/sessionStorage usage

4. **Verify component structure:**
   - Ensure server and client components match
   - Check for conditional rendering issues
   - Review component hierarchy

### TypeScript Errors

**Symptoms:**
- TypeScript compilation errors
- Type mismatches
- Missing type definitions

**Solutions:**

1. **Run type check:**
   ```bash
   npm run type-check
   ```

2. **Fix type errors:**
   - Add explicit types
   - Use type assertions carefully
   - Import missing types

3. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

4. **Update dependencies:**
   ```bash
   npm update
   npm run type-check
   ```

### Environment Variable Issues

**Symptoms:**
- "Environment variable not found"
- Undefined values
- Wrong values

**Solutions:**

1. **Check variable names:**
   - Verify exact spelling
   - Check for typos
   - Ensure case matches

2. **Verify .env files:**
   ```bash
   # Check .env.local exists
   ls -la .env.local
   
   # Check variable is set
   cat .env.local | grep VARIABLE_NAME
   ```

3. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   # Start again
   npm run dev
   ```

4. **Check Vercel settings:**
   - Go to Vercel → Settings → Environment Variables
   - Verify variables are set
   - Check for correct environment (Production/Preview/Development)

---

## Getting Help

### Before Asking for Help

1. **Check documentation:**
   - [API Documentation](./API_DOCUMENTATION.md)
   - [Admin Documentation](./ADMIN_DOCUMENTATION.md)
   - [Deployment Guide](./DEPLOYMENT_GUIDE.md)

2. **Review logs:**
   - Vercel function logs
   - Supabase logs
   - Browser console
   - Server logs

3. **Search existing issues:**
   - GitHub issues
   - Community forums
   - Documentation

### Providing Information

When asking for help, include:

1. **Error messages:**
   - Full error text
   - Stack traces
   - Console logs

2. **Environment:**
   - Node.js version
   - Operating system
   - Browser (if frontend issue)

3. **Steps to reproduce:**
   - What you were doing
   - Expected behavior
   - Actual behavior

4. **What you've tried:**
   - Solutions attempted
   - Documentation reviewed
   - Changes made

---

## Related Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Database Connection Troubleshooting](./DATABASE_CONNECTION_TROUBLESHOOTING.md)
- [SendGrid DNS Troubleshooting](./SENDGRID_DNS_TROUBLESHOOTING.md)

---

**Last Updated:** 2024

