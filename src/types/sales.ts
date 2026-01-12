/**
 * Sales Types
 * 
 * Type definitions for sales/campaigns feature
 * 
 * Phase 1: Database & Core - Sales Implementation
 */

export type SaleStatus = 'draft' | 'active' | 'scheduled' | 'ended';

export interface Sale {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string | null;
  banner_image?: string | null;
  badge_text?: string | null;
  badge_color?: string | null;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  status: SaleStatus;
  is_featured: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ProductSale {
  id: string;
  tenant_id: string;
  product_id: string;
  sale_id: string;
  sale_price?: number | null;
  discount_percent?: number | null;
  order_index?: number | null;
  created_at?: Date | string;
}

export interface SaleWithProducts extends Sale {
  products?: Array<{
    product: {
      id: string;
      name: string;
      slug: string | null;
      price: number;
      sale_price?: number | null;
      image: string | null;
      stock_quantity: number | null;
    };
    sale_price?: number | null;
    discount_percent?: number | null;
    order_index?: number | null;
  }>;
  product_count?: number;
}

export interface CreateSaleInput {
  name: string;
  slug?: string;
  description?: string;
  banner_image?: string;
  badge_text?: string;
  badge_color?: string;
  start_date?: Date | string;
  end_date?: Date | string;
  status?: SaleStatus;
  is_featured?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateSaleInput extends Partial<CreateSaleInput> {
  id: string;
}

export interface AddProductToSaleInput {
  product_id: string;
  sale_price?: number;
  order_index?: number;
}

export interface UpdateProductSaleInput {
  sale_price?: number;
  order_index?: number;
}
