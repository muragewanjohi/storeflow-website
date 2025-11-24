-- Migration: Add Landlord Support Tickets
-- Description: Creates tables for landlord-level support tickets (tenants → landlord)
-- Date: 2024
-- Day: 21.5-22

-- Create landlord_support_tickets table
-- Note: user_id can reference Supabase auth.users (for tenant admins) or landlord_users (for landlord admins)
-- No foreign key constraint to allow flexibility
CREATE TABLE IF NOT EXISTS landlord_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID, -- Can be from Supabase auth.users or landlord_users
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'medium',
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for landlord_support_tickets
CREATE INDEX IF NOT EXISTS idx_landlord_tickets_status ON landlord_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_landlord_tickets_tenant_id ON landlord_support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_landlord_tickets_user_id ON landlord_support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_landlord_tickets_category ON landlord_support_tickets(category);

-- Create landlord_support_ticket_messages table
-- Note: user_id can reference Supabase auth.users (for tenant admins) or landlord_users (for landlord admins)
-- No foreign key constraint to allow flexibility
CREATE TABLE IF NOT EXISTS landlord_support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES landlord_support_tickets(id) ON DELETE CASCADE,
  user_id UUID, -- Can be from Supabase auth.users or landlord_users
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for landlord_support_ticket_messages
CREATE INDEX IF NOT EXISTS idx_landlord_messages_ticket_id ON landlord_support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_landlord_messages_user_id ON landlord_support_ticket_messages(user_id);

-- Add comment
COMMENT ON TABLE landlord_support_tickets IS 'Support tickets created by tenants to contact the landlord/platform admin';
COMMENT ON TABLE landlord_support_ticket_messages IS 'Messages/replies in landlord support tickets';

