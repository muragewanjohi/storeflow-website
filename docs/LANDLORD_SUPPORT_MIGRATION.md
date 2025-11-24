# Landlord Support Tickets - Database Migration

This document describes the database tables needed for the landlord-level support ticket system.

## Tables Required

### 1. `landlord_support_tickets`

Tickets created by tenants to contact the landlord/platform admin.

```sql
CREATE TABLE landlord_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Tenant admin user who created the ticket
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  category VARCHAR(50), -- billing, technical, feature_request, bug_report, account, other
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_landlord_tickets_status ON landlord_support_tickets(status);
CREATE INDEX idx_landlord_tickets_tenant_id ON landlord_support_tickets(tenant_id);
CREATE INDEX idx_landlord_tickets_user_id ON landlord_support_tickets(user_id);
CREATE INDEX idx_landlord_tickets_category ON landlord_support_tickets(category);
```

### 2. `landlord_support_ticket_messages`

Messages/replies in landlord support tickets.

```sql
CREATE TABLE landlord_support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES landlord_support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- Can be tenant admin or landlord admin
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_landlord_messages_ticket_id ON landlord_support_ticket_messages(ticket_id);
CREATE INDEX idx_landlord_messages_user_id ON landlord_support_ticket_messages(user_id);
```

## Prisma Schema Addition

Add to `prisma/schema.prisma`:

```prisma
model landlord_support_tickets {
  id                      String                            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenant_id               String                            @db.Uuid
  user_id                 String?                           @db.Uuid
  subject                 String                            @db.VarChar(255)
  description             String                            @db.Text
  status                  String?                           @default("open") @db.VarChar(50)
  priority                String?                           @default("medium") @db.VarChar(50)
  category                String?                           @db.VarChar(50)
  created_at              DateTime?                          @default(now()) @db.Timestamp(6)
  updated_at              DateTime?                          @default(now()) @db.Timestamp(6)
  landlord_support_ticket_messages landlord_support_ticket_messages[]
  tenants                 tenants                            @relation(fields: [tenant_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  users                   users?                             @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([status], map: "idx_landlord_tickets_status")
  @@index([tenant_id], map: "idx_landlord_tickets_tenant_id")
  @@index([user_id], map: "idx_landlord_tickets_user_id")
  @@index([category], map: "idx_landlord_tickets_category")
}

model landlord_support_ticket_messages {
  id              String                    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ticket_id       String                    @db.Uuid
  user_id         String?                   @db.Uuid
  message         String                    @db.Text
  attachments     Json?                     @default("[]")
  created_at      DateTime?                 @default(now()) @db.Timestamp(6)
  landlord_support_tickets landlord_support_tickets @relation(fields: [ticket_id], references: [id], onDelete: Cascade, onUpdate: NoAction)
  users           users?                    @relation(fields: [user_id], references: [id], onDelete: NoAction, onUpdate: NoAction)

  @@index([ticket_id], map: "idx_landlord_messages_ticket_id")
  @@index([user_id], map: "idx_landlord_messages_user_id")
}
```

Also add the relations to existing models:

```prisma
// In tenants model:
landlord_support_tickets landlord_support_tickets[]

// In users model:
landlord_support_tickets landlord_support_tickets[]
landlord_support_ticket_messages landlord_support_ticket_messages[]
```

## Migration Steps

1. Add the Prisma schema models as shown above
2. Run `npx prisma migrate dev --name add_landlord_support_tickets`
3. Run `npx prisma generate` to update Prisma Client
4. Update the API routes to use the actual Prisma models (remove placeholder code)

## Differences from Tenant Support Tickets

- **Scope**: Landlord tickets are platform-level (tenants → landlord), not tenant-scoped
- **Tenant ID**: In landlord tickets, `tenant_id` represents the tenant asking for help, not data isolation
- **Access**: Only landlord/admin users can view all landlord tickets
- **Categories**: Landlord tickets have categories (billing, technical, feature_request, etc.)

