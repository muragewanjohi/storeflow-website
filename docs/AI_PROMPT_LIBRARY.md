# AI Prompt Library for StoreFlow Development

**Context and prompts for AI assistants (Claude, ChatGPT, etc.)**

This document provides context and prompt templates to help AI assistants understand the StoreFlow architecture and generate accurate code.

---

## 🎯 Quick Context Summary

Copy this section when starting a new conversation with an AI assistant:

```
You are helping me develop StoreFlow, a multi-tenant ecommerce platform.

**Architecture:**
- Next.js 15 with App Router (TypeScript)
- Supabase (PostgreSQL + Auth + Storage)
- Vercel Multi-Tenant Platform
- Prisma ORM
- Row-Level Security (RLS) for tenant isolation

**Key Patterns:**
- Single shared database with tenant_id column in tenant-scoped tables
- Tenant resolution via middleware (subdomain or custom domain)
- RLS policies automatically filter by tenant_id
- API routes use getTenantFromRequest() to resolve tenant
- Components are tenant-agnostic (tenant context handled by parent)

**Project Structure:**
- src/app/api/ - API routes
- src/components/ui/ - Base UI components
- src/components/shared/ - Shared business components
- src/lib/ - Utilities (supabase, prisma, tenant-context)
- prisma/schema.prisma - Database schema
- supabase/migrations/ - Database migrations

**Important:**
- Always include tenant_id in tenant-scoped queries
- Use RLS policies for automatic tenant isolation
- Follow TypeScript best practices
- Use Zod for validation
- Use React Hook Form for forms
- Use TanStack Query for data fetching
```

---

## 📝 Prompt Templates

### Creating API Routes

```
Create a new API route for [RESOURCE] following StoreFlow patterns:

Requirements:
- Use the template from src/app/api/_template/route.ts
- Implement GET (list), POST (create), PUT (update), DELETE handlers
- Use getTenantFromRequest() to resolve tenant
- Use Prisma client with tenant_id filtering
- Add Zod validation schemas
- Handle errors properly
- Return appropriate HTTP status codes

Resource: [RESOURCE_NAME]
Model: [PRISMA_MODEL_NAME]
Fields: [LIST_OF_FIELDS]
```

### Creating Components

```
Create a [COMPONENT_TYPE] component for StoreFlow:

Requirements:
- Use TypeScript with proper typing
- Make component tenant-agnostic (tenant context handled by parent)
- Use Tailwind CSS for styling
- Follow accessibility best practices
- Use the template from src/components/[ui|shared]/_template.tsx

Component: [COMPONENT_NAME]
Type: [ui|shared]
Props: [LIST_OF_PROPS]
Functionality: [DESCRIPTION]
```

### Database Migrations

```
Create a Prisma migration for [FEATURE]:

Requirements:
- Add tenant_id column if creating tenant-scoped table
- Add proper indexes (especially on tenant_id)
- Enable RLS if tenant-scoped
- Create RLS policy for tenant isolation
- Use PostgreSQL syntax

Feature: [FEATURE_NAME]
Tables: [LIST_OF_TABLES]
Changes: [DESCRIPTION_OF_CHANGES]
```

### Debugging Tenant Issues

```
Help me debug a tenant isolation issue:

Problem: [DESCRIPTION]
Error: [ERROR_MESSAGE]
Code: [RELEVANT_CODE_SNIPPET]

Check:
- Is tenant_id being set correctly?
- Are RLS policies enabled?
- Is tenant context being resolved from hostname?
- Are queries filtering by tenant_id?
```

### Adding New Features

```
Add [FEATURE_NAME] feature to StoreFlow:

Feature Description: [DESCRIPTION]
Requirements:
- [ ] API routes (GET, POST, PUT, DELETE)
- [ ] Database schema changes
- [ ] RLS policies (if tenant-scoped)
- [ ] UI components
- [ ] Validation schemas
- [ ] Error handling

Follow StoreFlow patterns:
- Tenant isolation via RLS
- Type-safe with TypeScript
- Validated with Zod
- Documented with JSDoc
```

---

## 🔧 Common Code Patterns

### API Route Pattern

```typescript
// Standard API route pattern
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromRequest } from '@/lib/tenant-context';
import { prisma } from '@/lib/prisma/client';
import { z } from 'zod';

const schema = z.object({
  // Define schema
});

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const tenant = await getTenantFromRequest(hostname);
  
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }
  
  const data = await prisma.model.findMany({
    where: { tenant_id: tenant.id },
  });
  
  return NextResponse.json({ data });
}
```

### Component Pattern

```typescript
// Standard component pattern
import { cn } from '@/lib/utils/cn';

interface ComponentProps {
  // Define props
}

export function Component({ ...props }: Readonly<ComponentProps>) {
  return (
    <div className={cn('base-classes', props.className)}>
      {/* Component content */}
    </div>
  );
}
```

### Database Query Pattern

```typescript
// Always include tenant_id in tenant-scoped queries
const data = await prisma.model.findMany({
  where: {
    tenant_id: tenant.id, // Required for tenant isolation
    // Other filters
  },
});
```

---

## 🐛 Common Issues & Solutions

### Issue: Tenant Not Found

**Prompt:**
```
I'm getting "Tenant not found" error. Help me debug:

- Hostname: [HOSTNAME]
- Subdomain: [SUBDOMAIN]
- Tenant exists in DB: [YES/NO]
- Middleware code: [CODE_SNIPPET]

Check:
1. Is middleware extracting subdomain correctly?
2. Is tenant query correct?
3. Is tenant status 'active'?
```

### Issue: RLS Policy Not Working

**Prompt:**
```
RLS policy is not filtering data correctly:

- Table: [TABLE_NAME]
- Policy: [POLICY_NAME]
- Query: [QUERY]
- Expected: [EXPECTED_BEHAVIOR]
- Actual: [ACTUAL_BEHAVIOR]

Check:
1. Is RLS enabled on table?
2. Is policy USING clause correct?
3. Is tenant context being set?
```

### Issue: Type Errors

**Prompt:**
```
I'm getting TypeScript errors:

- Error: [ERROR_MESSAGE]
- File: [FILE_PATH]
- Code: [CODE_SNIPPET]

Help me fix:
1. Type definitions
2. Import statements
3. Prisma client types
```

---

## 📚 Architecture-Specific Prompts

### Multi-Tenancy

```
Explain how multi-tenancy works in StoreFlow:

- How is tenant resolved?
- How does RLS work?
- How is tenant_id used?
- What's the difference between central and tenant-scoped tables?
```

### Database Schema

```
Help me design a database schema for [FEATURE]:

- Is it tenant-scoped or central?
- What fields are needed?
- What indexes should I add?
- What RLS policies are needed?
```

### API Design

```
Design API routes for [FEATURE]:

- What endpoints are needed?
- What HTTP methods?
- What request/response formats?
- How to handle tenant context?
- What validation is needed?
```

---

## 🎨 UI/UX Prompts

### Component Design

```
Design a [COMPONENT] component:

- Purpose: [PURPOSE]
- Props: [PROPS]
- Styling: [STYLING_REQUIREMENTS]
- Accessibility: [A11Y_REQUIREMENTS]
- Responsive: [RESPONSIVE_REQUIREMENTS]

Use:
- Tailwind CSS
- shadcn/ui patterns
- TypeScript
- React best practices
```

### Form Design

```
Create a form for [PURPOSE]:

- Fields: [LIST_OF_FIELDS]
- Validation: [VALIDATION_RULES]
- Submission: [SUBMISSION_HANDLER]
- Error handling: [ERROR_HANDLING]

Use:
- React Hook Form
- Zod validation
- TypeScript
- Tailwind CSS
```

---

## 🔒 Security Prompts

### RLS Policy Creation

```
Create RLS policy for [TABLE]:

- Table: [TABLE_NAME]
- Tenant column: [TENANT_COLUMN_NAME]
- Operations: [SELECT, INSERT, UPDATE, DELETE]
- Additional filters: [ANY_ADDITIONAL_FILTERS]

Ensure:
- Tenant isolation
- Proper USING clause
- Performance (indexes)
```

### Input Validation

```
Create Zod schema for [RESOURCE]:

- Fields: [LIST_OF_FIELDS]
- Types: [FIELD_TYPES]
- Required fields: [REQUIRED_FIELDS]
- Validation rules: [VALIDATION_RULES]

Ensure:
- Type safety
- Proper validation
- Clear error messages
```

---

## 📖 Documentation Prompts

### Code Documentation

```
Document this code:

[CODE_SNIPPET]

Include:
- Purpose
- Parameters
- Return value
- Usage examples
- Edge cases
```

### API Documentation

```
Document this API endpoint:

- Route: [ROUTE]
- Method: [METHOD]
- Request: [REQUEST_FORMAT]
- Response: [RESPONSE_FORMAT]
- Errors: [ERROR_CODES]

Include:
- Description
- Parameters
- Example requests/responses
- Error handling
```

---

## 🚀 Best Practices

When working with AI assistants:

1. **Always provide context** - Copy the quick context summary
2. **Be specific** - Include exact requirements and constraints
3. **Show examples** - Reference existing code patterns
4. **Ask for explanations** - Understand why, not just what
5. **Review generated code** - Always review and test AI-generated code
6. **Iterate** - Refine prompts based on results

---

## 📝 Example Full Prompt

```
You are helping me develop StoreFlow, a multi-tenant ecommerce platform.

**Architecture:**
- Next.js 15 with App Router (TypeScript)
- Supabase (PostgreSQL + Auth + Storage)
- Vercel Multi-Tenant Platform
- Prisma ORM
- Row-Level Security (RLS) for tenant isolation

**Task:** Create a products API route

**Requirements:**
1. GET /api/products - List products (paginated)
2. POST /api/products - Create product
3. PUT /api/products/[id] - Update product
4. DELETE /api/products/[id] - Delete product

**Patterns to follow:**
- Use getTenantFromRequest() to resolve tenant
- Use Prisma with tenant_id filtering
- Add Zod validation for POST/PUT
- Handle errors properly
- Use template from src/app/api/_template/route.ts

**Product Model:**
- id (UUID)
- tenant_id (UUID) - Required
- name (string)
- description (text)
- price (decimal)
- sku (string)
- stock_quantity (integer)
- status (string)

Generate the complete API route file.
```

---

**Last Updated:** 2024  
**Version:** 1.0

