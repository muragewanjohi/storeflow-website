/**
 * Shape of the POS bootstrap payload. Types only — safe to import from client
 * components (unlike load-bootstrap.ts, which pulls in Prisma).
 */

export interface PosBootstrapVariant {
  id: string;
  product_id: string;
  sku: string | null;
  barcode: string | null;
  image: string | null;
  price: number;
  cost_price: number | null;
  stock_quantity: number | null;
  attributes: { name: string; value: string }[];
}

export interface PosBootstrapProduct {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  image: string | null;
  price: number;
  sale_price: number | null;
  cost_price: number | null;
  stock_quantity: number | null;
  has_variants: boolean;
  updated_at: Date | string | null;
  variants: PosBootstrapVariant[];
}

export interface PosBootstrapSettings {
  store: {
    name?: string | null;
    description?: string | null;
    logo?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };
  currency: {
    code: string;
    symbol: string;
    symbol_position: string;
    decimal_places: number;
  };
  tax: { enabled: boolean; rate: number | null; pricing_type: string };
  payments: {
    cash_enabled: boolean;
    mpesa_enabled: boolean;
    mpesa_stk_enabled: boolean;
  };
}

export interface PosBootstrapPayload {
  captured_at: string;
  delta: boolean;
  product_count: number;
  products: PosBootstrapProduct[];
  settings: PosBootstrapSettings;
}
