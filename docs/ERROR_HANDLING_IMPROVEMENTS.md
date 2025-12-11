# Error Handling Improvements

**Date:** 2025-01-12  
**Status:** Implemented

---

## ✅ Improvements Made

### 1. Standardized Error Response Format

Created `src/lib/errors/api-error-handler.ts` with:
- Consistent error response structure: `{ error, message, details?, code? }`
- Standardized HTTP status codes
- Error codes enum for better error categorization
- Development vs production error detail handling

### 2. Error Handling Utility Functions

**Available Functions:**
- `handleApiError(error)` - Main error handler (handles all error types)
- `handleValidationError(zodError)` - Zod validation errors
- `handleAuthError(message?)` - Authentication errors (401)
- `handleAuthorizationError(message?)` - Authorization errors (403)
- `handleNotFoundError(resource?)` - Not found errors (404)
- `handleConflictError(message)` - Conflict errors (409)
- `handleInternalError(error, userMessage?)` - Internal errors (500)

### 3. Updated API Routes

**Before:**
```typescript
catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: 'Validation error' }, { status: 400 });
  }
  if (error.message === 'Authentication required') {
    return NextResponse.json({ message: 'Auth required' }, { status: 401 });
  }
  // ... more if statements
  return NextResponse.json({ message: 'Error' }, { status: 500 });
}
```

**After:**
```typescript
catch (error) {
  return handleApiError(error);
}
```

### 4. Improved E2E Test Error Handling

- Better wait conditions for form loading
- Multiple selector fallbacks
- Debug screenshots on failure
- Detailed error messages with page context
- Handles async form loading (price plans fetch)

---

## 📋 Error Response Format

### Standard Format
```json
{
  "error": "Error type",
  "message": "User-friendly message",
  "details": { /* Optional - only in development */ },
  "code": "ERROR_CODE"
}
```

### Examples

**Validation Error (400):**
```json
{
  "error": "Validation failed",
  "message": "Please check your input and try again",
  "details": {
    "issues": [
      { "field": "subdomain", "message": "Subdomain must be at least 3 characters" }
    ]
  },
  "code": "VALIDATION_ERROR"
}
```

**Authentication Error (401):**
```json
{
  "error": "Authentication required",
  "message": "Please log in to access this resource",
  "code": "AUTHENTICATION_REQUIRED"
}
```

**Conflict Error (409):**
```json
{
  "error": "Conflict",
  "message": "Subdomain already exists",
  "code": "CONFLICT"
}
```

---

## 🎯 Best Practices

### ✅ DO

1. **Use `handleApiError()` in catch blocks**
   ```typescript
   try {
     // API logic
   } catch (error) {
     return handleApiError(error);
   }
   ```

2. **Use specific handlers for known errors**
   ```typescript
   if (existingTenant) {
     return handleConflictError('Subdomain already exists');
   }
   ```

3. **Return user-friendly messages**
   ```typescript
   return handleInternalError(error, 'Failed to create tenant');
   ```

4. **Log errors for debugging**
   - Errors are automatically logged in `handleInternalError()`
   - Use `console.error()` for additional context

### ❌ DON'T

1. **Don't expose internal error details in production**
   - Use `handleInternalError()` which handles this automatically

2. **Don't use inconsistent error formats**
   - Always use `handleApiError()` or specific handlers

3. **Don't throw errors in API routes**
   - Return error responses instead

4. **Don't use generic error messages**
   - Provide specific, actionable messages

---

## 🔄 Migration Guide

### Step 1: Import Error Handler
```typescript
import { handleApiError } from '@/lib/errors/api-error-handler';
```

### Step 2: Replace Catch Blocks
```typescript
// Before
catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ message: 'Validation error' }, { status: 400 });
  }
  // ... more conditions
}

// After
catch (error) {
  return handleApiError(error);
}
```

### Step 3: Use Specific Handlers for Known Cases
```typescript
// Before
if (existingTenant) {
  return NextResponse.json({ message: 'Subdomain exists' }, { status: 409 });
}

// After
if (existingTenant) {
  return handleConflictError('Subdomain already exists');
}
```

---

## 📊 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `AUTHENTICATION_REQUIRED` | 401 | User not authenticated |
| `AUTHORIZATION_DENIED` | 403 | User lacks required permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## 🧪 Testing

Error handling is tested in:
- `tests/integration/api/products.test.ts` - API error responses
- `tests/security/security-audit.test.ts` - Error handling security

---

## 📝 Next Steps

1. **Migrate remaining API routes** to use `handleApiError()`
2. **Add error tracking** (e.g., Sentry) for production
3. **Create error boundary components** for client-side errors
4. **Add error recovery strategies** for retryable errors

---

**See Also:**
- [`ERROR_HANDLING_BEST_PRACTICES.md`](./ERROR_HANDLING_BEST_PRACTICES.md) - Original best practices guide
- [`src/lib/errors/api-error-handler.ts`](../src/lib/errors/api-error-handler.ts) - Error handler implementation

