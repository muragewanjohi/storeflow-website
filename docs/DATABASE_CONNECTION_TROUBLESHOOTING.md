# Database Connection Troubleshooting

## Error: "Can't reach database server"

If you're getting this error, it means Prisma cannot connect to your Supabase database.

## Quick Checks

### 1. Verify DATABASE_URL is Set

Check your `.env.local` file has the correct `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Important:** Replace:
- `[project-ref]` with your Supabase project reference
- `[password]` with your actual database password

### 2. Get Correct Connection String from Supabase

1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select **Connection pooling** tab
4. Copy the **URI** connection string
5. It should look like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 3. Verify Password is Correct

- Make sure the password in your connection string matches your database password
- If you forgot your password, you can reset it in Supabase Dashboard → Settings → Database → Database password

### 4. Check Database is Running

- Go to Supabase Dashboard
- Check if your project is active (not paused)
- Free tier projects pause after inactivity

### 5. Test Connection

You can test the connection using:

```bash
# Using psql (if installed)
psql "postgresql://postgres.xxxxx:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Or test with Prisma
cd storeflow
npx prisma db pull
```

## Common Issues

### Issue 1: Wrong Port
- **Pooled connection:** Port `6543` (for queries)
- **Direct connection:** Port `5432` (for migrations)
- Make sure you're using port `6543` for `DATABASE_URL`

### Issue 2: Missing Password
- The connection string must include the password
- Format: `postgresql://postgres.xxxxx:PASSWORD@...`

### Issue 3: Project Paused
- Free tier Supabase projects pause after inactivity
- Go to Supabase Dashboard and resume the project

### Issue 4: Network/Firewall
- Check if your network allows connections to Supabase
- Try from a different network to rule out firewall issues

## Solution Steps

1. **Get fresh connection string from Supabase Dashboard**
2. **Update `.env.local` with correct DATABASE_URL**
3. **Restart your Next.js dev server**
4. **Test the connection**

## Still Having Issues?

If the problem persists:
1. Check Supabase Dashboard for any service alerts
2. Verify your Supabase project is active
3. Try using the direct connection (port 5432) temporarily to test
4. Check Next.js server logs for more detailed error messages

