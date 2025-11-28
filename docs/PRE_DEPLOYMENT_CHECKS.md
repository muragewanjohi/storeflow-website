# Pre-Deployment Checks

This document explains how to catch build errors locally before deploying to Vercel.

## The Problem

TypeScript errors that pass locally might fail on Vercel due to:
- Different TypeScript strictness settings
- Different build environment
- Cached types that aren't updated

## Solutions

### 1. Run Type Checking Before Committing

Always run type checking before pushing:

```bash
npm run type-check
```

This will catch TypeScript errors without building the entire project.

### 2. Run Full Build Before Pushing

The most reliable way to catch errors is to run the same build command that Vercel uses:

```bash
npm run build
```

This will:
- Type check all files
- Lint all files
- Build the Next.js application
- Catch any errors that would fail on Vercel

### 3. Use the Verify Script

We've added a `verify` script that runs all checks:

```bash
npm run verify
```

This runs:
1. Type checking (`npm run type-check`)
2. Linting (`npm run lint`)
3. Full build (`npm run build`)

### 4. Automatic Pre-Build Type Checking

We've configured `prebuild` to automatically run type checking before every build:

```json
"prebuild": "npm run type-check"
```

This means `npm run build` will automatically type-check first and fail if there are errors.

### 5. Git Pre-Push Hook (Recommended)

To automatically check before pushing, install the git hook:

**On Windows (PowerShell):**
```powershell
.\scripts\setup-git-hooks.ps1
```

**On Linux/Mac:**
```bash
chmod +x scripts/setup-git-hooks.sh
./scripts/setup-git-hooks.sh
```

This will install a pre-push hook that runs type checking before you push. If type checking fails, the push will be blocked.

To skip the hook (not recommended):
```bash
git push --no-verify
```

## Common TypeScript Errors to Watch For

### 1. Implicit 'any' Types

**Error:**
```
Parameter 'x' implicitly has an 'any' type.
```

**Fix:**
Add explicit type annotations:
```typescript
// Before
items.map((item) => ({ ... }))

// After
items.map((item: typeof items[0]) => ({ ... }))
```

### 2. Missing Type Imports

**Error:**
```
Cannot find name 'TypeName'.
```

**Fix:**
Import the type:
```typescript
import type { TypeName } from '@/path/to/types';
```

### 3. Prisma Type Issues

**Error:**
```
Type 'JsonValue' is not assignable to type 'Record<string, unknown>'.
```

**Fix:**
Use type assertions:
```typescript
const data = jsonField as Record<string, unknown>;
```

## Best Practices

1. **Always run `npm run build` before pushing** - This is the most reliable check
2. **Install the git hook** - It will catch errors automatically
3. **Fix type errors immediately** - Don't use `// @ts-ignore` unless absolutely necessary
4. **Keep TypeScript strict mode enabled** - It catches more errors
5. **Run `npm run verify` before major commits** - It's a comprehensive check

## CI/CD Integration

For even better protection, consider adding a GitHub Actions workflow that runs these checks on every pull request. This ensures errors are caught even if someone forgets to run checks locally.

## Troubleshooting

### Build passes locally but fails on Vercel

1. Clear your local cache:
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   npm run build
   ```

2. Check TypeScript version matches:
   ```bash
   npm list typescript
   ```

3. Ensure all dependencies are installed:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Git hook not working

1. Make sure the hook is executable:
   ```bash
   chmod +x .git/hooks/pre-push
   ```

2. Re-run the setup script:
   ```bash
   ./scripts/setup-git-hooks.sh
   ```

3. Check if the hook file exists:
   ```bash
   ls -la .git/hooks/pre-push
   ```

