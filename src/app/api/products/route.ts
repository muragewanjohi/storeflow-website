/**
 * API Route: Products
 * 
 * Example API route that uses tenant context
 * All queries automatically filtered by tenant_id via RLS
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenant, requireTenant } from '@/lib/tenant-context/server';
import { createClient } from '@supabase/supabase-js';
import { setTenantContext } from '@/lib/tenant-context';

// Create Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/products
 * 
 * Get all products for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant from middleware headers
    const tenant = await requireTenant();

    // Set tenant context for RLS
    await setTenantContext(tenant.id);

    // Query products (RLS automatically filters by tenant_id)
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * 
 * Create a new product for the current tenant
 */
export async function POST(request: NextRequest) {
  try {
    // Get tenant from middleware headers
    const tenant = await requireTenant();

    // Set tenant context for RLS
    await setTenantContext(tenant.id);

    // Parse request body
    const body = await request.json();
    const { name, description, price, sku, stock_quantity, status } = body;

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    // Insert product (tenant_id will be set automatically by RLS or explicitly)
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        tenant_id: tenant.id, // Explicitly set tenant_id
        name,
        description,
        price,
        sku,
        stock_quantity: stock_quantity || 0,
        status: status || 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

