# Error Handling Best Practices

**Date:** 2024  
**Status:** Active Guidelines

---

## 📋 Overview

This document outlines error handling best practices for the StoreFlow platform, covering both Server Components and API Routes.

---

## 🎯 Core Principles

### 1. **Server Components: Redirect, Don't Throw**
- Use `redirect()` from Next.js instead of throwing errors
- Provide user-friendly redirects to appropriate login pages
- Never expose internal error details to users

### 2. **API Routes: Return Proper HTTP Responses**
- Use appropriate HTTP status codes
- Return structured error responses with `error` and `message` fields
- Only expose error details in development mode

### 3. **Security First**
- Don't reveal whether email exists or password is wrong
- Don't expose internal error details in production
- Use generic error messages for authentication failures

---

## 🔐 Authentication Error Handling

### Server Components

**❌ Bad:**
```typescript
// Throws error - shows error page to user
const user = await requireAuth();
```

**✅ Good:**
```typescript
// Redirects to login - better UX
const user = await requireAuthOrRedirect('/admin/login');
await requireRoleOrRedirect(user, 'landlord', '/admin/login');
```

### API Routes

**❌ Bad:**
```typescript
if (!user) {
  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
```

**✅ Good:**
```typescript
if (!user) {
  return NextResponse.json(
    { 
      error: 'Not authenticated',
      message: 'Please log in to access this resource'
    },
    { status: 401 }
  );
}
```

---

## 📊 HTTP Status Codes

### Standard Status Codes Used

- **200 OK** - Successful request
- **201 Created** - Resource created successfully
- **400 Bad Request** - Invalid input/validation error
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Access denied (authenticated but not authorized)
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate resource (e.g., email already exists)
- **500 Internal Server Error** - Unexpected server error

---

## 🔒 Security Best Practices

### 1. **Don't Reveal User Existence**

**❌ Bad:**
```typescript
if (authError.message.includes('User not found')) {
  return NextResponse.json({ error: 'User not found' }, { status: 404 });
}
if (authError.message.includes('Invalid password')) {
  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
```

**✅ Good:**
```typescript
// Generic message for both cases
if (authError) {
  return NextResponse.json(
    { 
      error: 'Invalid credentials',
      message: 'The email or password you entered is incorrect'
    },
    { status: 401 }
  );
}
```

### 2. **Hide Internal Errors in Production**

**❌ Bad:**
```typescript
catch (error: any) {
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}
```

**✅ Good:**
```typescript
catch (error: any) {
  console.error('Error:', error); // Log for debugging
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  return NextResponse.json(
    { 
      error: 'Operation failed',
      message: 'An unexpected error occurred. Please try again.',
      ...(isDevelopment && { details: error.message })
    },
    { status: 500 }
  );
}
```

---

## 📝 Error Response Format

### Standard Error Response Structure

```typescript
{
  error: string;        // Error type/code (e.g., "Validation failed", "Access denied")
  message: string;     // User-friendly message
  details?: any;        // Additional details (only in development)
}
```

### Examples

**Validation Error:**
```json
{
  "error": "Validation failed",
  "message": "Please check your input and try again",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

**Authentication Error:**
```json
{
  "error": "Authentication required",
  "message": "Please log in to access this resource"
}
```

**Authorization Error:**
```json
{
  "error": "Access denied",
  "message": "You do not have permission to access this resource"
}
```

**Conflict Error (Duplicate):**
```json
{
  "error": "Email already registered",
  "message": "A user with this email address already exists"
}
```

---

## 🛠️ Implementation Patterns

### Pattern 1: Server Component Protection

```typescript
// src/app/admin/dashboard/page.tsx
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';

export default async function AdminDashboardPage() {
  // Redirects if not authenticated
  const user = await requireAuthOrRedirect('/admin/login');
  
  // Redirects if wrong role
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');
  
  // User is authenticated and has correct role
  return <div>Dashboard content</div>;
}
```

### Pattern 2: API Route Error Handling

```typescript
// src/app/api/admin/users/route.ts
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await requireAuth();
    requireAnyRole(user, ['tenant_admin', 'landlord']);
    
    // Business logic
    const users = await getUsers();
    
    return NextResponse.json({ users });
  } catch (error: any) {
    // Handle specific error types
    if (error.message?.includes('Authentication required')) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('Access denied')) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: error.message
        },
        { status: 403 }
      );
    }
    
    // Generic error handling
    console.error('Error:', error);
    const isDevelopment = process.env.NODE_ENV === 'development';
    return NextResponse.json(
      { 
        error: 'Failed to retrieve users',
        message: 'An unexpected error occurred',
        ...(isDevelopment && { details: error.message })
      },
      { status: 500 }
    );
  }
}
```

### Pattern 3: Validation Error Handling

```typescript
try {
  const validatedData = schema.parse(body);
  // Process validated data
} catch (error: any) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    );
  }
  throw error; // Re-throw if not validation error
}
```

---

## 🔄 Error Handling Functions

### Available Functions

#### Server Components
- `requireAuthOrRedirect(redirectTo?)` - Redirects if not authenticated
- `requireRoleOrRedirect(user, role, redirectTo?)` - Redirects if wrong role
- `requireAnyRoleOrRedirect(user, roles, redirectTo?)` - Redirects if no matching role

#### API Routes
- `requireAuth()` - Throws error if not authenticated (catch and return 401)
- `requireRole(user, role)` - Throws error if wrong role (catch and return 403)
- `requireAnyRole(user, roles)` - Throws error if no matching role (catch and return 403)

---

## ✅ Checklist

When implementing error handling, ensure:

- [ ] Server Components use redirect functions, not throw errors
- [ ] API Routes return proper HTTP status codes
- [ ] Error messages are user-friendly
- [ ] Internal error details are hidden in production
- [ ] Authentication errors don't reveal user existence
- [ ] Validation errors include field-level details
- [ ] All errors are logged for debugging
- [ ] Error responses follow standard format

---

## 📚 Related Documentation

- [`SECURITY.md`](./SECURITY.md) - Security guidelines

---

**Last Updated:** 2024

