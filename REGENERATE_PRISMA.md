# Regenerate Prisma Client

The Prisma client needs to be regenerated after adding new models.

## Steps:

1. **Stop the Next.js dev server** (Ctrl+C in the terminal where it's running)

2. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Why this is needed:

After adding new models (`form_builders` and `form_submissions`) to the Prisma schema, the Prisma client needs to be regenerated to include TypeScript types and methods for these new models.

The error "Cannot read properties of undefined (reading 'findMany')" occurs because `prisma.form_builders` doesn't exist in the current Prisma client instance until it's regenerated.

