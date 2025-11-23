/**
 * Products API Route
 * 
 * Handles GET (list products) and POST (create product) requests
 * Full CRUD with validation, search, filtering, and pagination
 * 
 * Day 15: Product Model & API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { createProductSchema, productQuerySchema, generateSlug, generateSKU } from '@/lib/products/validation';
import { requireAuth } from '@/lib/auth/server';
import { Prisma } from '@prisma/client';

/**
 * GET /api/products
 * 
 * List products with search, filtering, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const queryParams: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      // Convert numeric strings to numbers for page and limit
      if (key === 'page' || key === 'limit') {
        queryParams[key] = parseInt(value, 10) || (key === 'page' ? 1 : 20);
      } else if (key === 'min_price' || key === 'max_price') {
        queryParams[key] = parseFloat(value);
      } else if (key === 'in_stock') {
        queryParams[key] = value === 'true';
      } else {
        queryParams[key] = value;
      }
    }

    const validatedQuery = productQuerySchema.parse(queryParams);

    const {
      page = 1,
      limit = 20,
      search,
      status,
      category_id,
      brand_id,
      min_price,
      max_price,
      in_stock,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = validatedQuery;

    // Build where clause
    const where: any = {
      tenant_id: tenant.id,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Category filter
    if (category_id) {
      where.category_id = category_id;
    }

    // Brand filter
    if (brand_id) {
      where.brand_id = brand_id;
    }

    // Price range filter
    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) {
        where.price.gte = min_price;
      }
      if (max_price !== undefined) {
        where.price.lte = max_price;
      }
    }

    // Stock filter
    if (in_stock !== undefined) {
      if (in_stock) {
        where.stock_quantity = { gt: 0 };
      } else {
        where.stock_quantity = { lte: 0 };
      }
    }

    // Calculate pagination (ensure numbers)
    const pageNum = typeof page === 'number' ? page : parseInt(String(page), 10);
    const limitNum = typeof limit === 'number' ? limit : parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    // Build orderBy
    const orderBy: any = {};
    orderBy[sort_by] = sort_order;

    // Fetch products with pagination
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          // Note: Direct category relation via category_id
          // For many-to-many, we'd need to join through product_categories
        },
      }),
      prisma.products.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return NextResponse.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to fetch products'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * 
 * Create a new product
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication for creating products
    const user = await requireAuth();
    const tenant = await requireTenant();

    const body = await request.json();

    // Validate request body
    const validatedData = createProductSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug already exists for this tenant
    const existingProduct = await prisma.products.findFirst({
      where: {
        tenant_id: tenant.id,
        slug,
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: 'A product with this slug already exists' },
        { status: 400 }
      );
    }

    // Generate SKU if not provided
    const sku = validatedData.sku || generateSKU(validatedData.name, tenant.id);

    // Check if SKU already exists for this tenant
    const existingSKU = await prisma.products.findFirst({
      where: {
        tenant_id: tenant.id,
        sku,
      },
    });

    if (existingSKU) {
      // Regenerate SKU if collision
      const newSKU = generateSKU(validatedData.name, tenant.id);
      validatedData.sku = newSKU;
    } else {
      validatedData.sku = sku;
    }

    // Create product
    const product = await prisma.products.create({
      data: {
        tenant_id: tenant.id,
        name: validatedData.name,
        slug,
        description: validatedData.description || null,
        short_description: validatedData.short_description || null,
        price: validatedData.price,
        sale_price: validatedData.sale_price || null,
        sku: validatedData.sku || null,
        stock_quantity: validatedData.stock_quantity || 0,
        status: validatedData.status || 'active',
        image: validatedData.image || null,
        gallery: validatedData.gallery || [],
        category_id: validatedData.category_id || null,
        brand_id: validatedData.brand_id || null,
        created_by: user.id,
        metadata: (validatedData.metadata || {}) as Prisma.InputJsonObject,
      },
      // Note: Direct category relation via category_id
      // For many-to-many, we'd need to join through product_categories
    });

    return NextResponse.json(
      { product },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof Error) {
      if (error.message === 'Tenant not found') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation error', issues: (error as any).issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'development'
          ? (error instanceof Error ? error.message : 'Internal server error')
          : 'Failed to create product'
      },
      { status: 500 }
    );
  }
}
