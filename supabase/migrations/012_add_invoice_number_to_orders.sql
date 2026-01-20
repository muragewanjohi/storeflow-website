-- Add invoice_number column to orders table
-- Invoice numbers will be generated sequentially per tenant (e.g., INV-2024-001)

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_invoice_number ON orders(invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_invoice ON orders(tenant_id, invoice_number);

-- Add comment
COMMENT ON COLUMN orders.invoice_number IS 'Sequential invoice number per tenant (e.g., INV-2024-001)';
