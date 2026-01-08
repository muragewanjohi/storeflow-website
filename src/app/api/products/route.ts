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
import { canCreateProduct } from '@/lib/subscriptions/limits';

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

    // Search filter - Use full-text search for better performance and ranking
    let useFullTextSearch = false;
    let searchProductIds: string[] = [];
    
    if (search) {
      try {
        // Use PostgreSQL full-text search with ranking
        // Cast tenant.id to UUID explicitly to avoid type mismatch
        const searchResults = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id
          FROM products
          WHERE 
            tenant_id = ${tenant.id}::uuid
            AND status = 'active'
            AND search_vector @@ plainto_tsquery('english', ${search})
          ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${search})) DESC
          LIMIT 1000
        `;

        if (searchResults && searchResults.length > 0) {
          searchProductIds = searchResults.map((r: any) => r.id);
          useFullTextSearch = true;
          where.id = { in: searchProductIds };
        } else {
          // Fallback to ILIKE if full-text search returns no results
          // Use OR to search across name, description, and SKU
          where.OR = [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { description: { contains: search.trim(), mode: 'insensitive' } },
            { sku: { contains: search.trim(), mode: 'insensitive' } },
          ];
        }
      } catch (error) {
        // If full-text search fails (e.g., search_vector column doesn't exist), fallback to ILIKE
        console.warn('Full-text search not available, using ILIKE:', error);
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
          { sku: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }
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
    let products = await prisma.products.findMany({
      where,
      skip: useFullTextSearch ? 0 : skip, // Fetch all for full-text search, then paginate
      take: useFullTextSearch ? 1000 : limitNum, // Get more results to sort by relevance
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        image: true,
        stock_quantity: true, // Already synced with variant totals
        category_id: true,
      },
    });

    // If using full-text search, sort by relevance (order in searchProductIds)
    if (useFullTextSearch && searchProductIds.length > 0) {
      const productMap = new Map(products.map((p: any) => [p.id, p]));
      products = searchProductIds
        .map(id => productMap.get(id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
        .slice(skip, skip + limitNum);
    }

    const total = await prisma.products.count({ where });

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
    console.log('[Product Create] Starting product creation...');
    
    // Require authentication for creating products
    let user;
    try {
      user = await requireAuth();
      console.log('[Product Create] User authenticated:', user.id);
    } catch (authError: any) {
      console.error('[Product Create] Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Require tenant
    let tenant;
    try {
      tenant = await requireTenant();
      console.log('[Product Create] Tenant resolved:', tenant.id, tenant.name);
    } catch (tenantError: any) {
      console.error('[Product Create] Tenant error:', tenantError);
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // Check if tenant has edit access (not in read-only mode)
    try {
      const { requireEditAccess } = await import('@/lib/tenant-context/access-control-server');
      await requireEditAccess();
      console.log('[Product Create] Edit access verified');
    } catch (editAccessError: any) {
      console.error('[Product Create] Edit access error:', editAccessError);
      return NextResponse.json(
        { error: editAccessError.message || 'Write operations are disabled' },
        { status: 403 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('[Product Create] Request body:', JSON.stringify(body, null, 2));
    } catch (parseError: any) {
      console.error('[Product Create] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body
    let validatedData;
    try {
      validatedData = createProductSchema.parse(body);
      console.log('[Product Create] Validated data:', JSON.stringify(validatedData, null, 2));
    } catch (validationError: any) {
      console.error('[Product Create] Validation error:', validationError);
      if (validationError && typeof validationError === 'object' && 'issues' in validationError) {
        return NextResponse.json(
          { error: 'Validation error', issues: validationError.issues },
          { status: 400 }
        );
      }
      throw validationError;
    }

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

    // Check plan limits before creating product
    let limitCheck;
    try {
      limitCheck = await canCreateProduct(tenant);
      console.log('[Product Create] Limit check:', limitCheck);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: limitCheck.reason || 'Product limit reached' },
          { status: 403 }
        );
      }
    } catch (limitError: any) {
      console.error('[Product Create] Limit check error:', limitError);
      // Don't block product creation if limit check fails - log and continue
      // This allows products to be created even if there's an issue with plan lookup
      console.warn('[Product Create] Continuing despite limit check error');
    }

    // Generate SKU if not provided or is null/empty
    // Always ensure SKU is generated - it's required for inventory management
    let finalSKU: string;
    if (validatedData.sku && validatedData.sku.trim() !== '') {
      finalSKU = validatedData.sku.trim();
    } else {
      finalSKU = generateSKU(validatedData.name, tenant.id);
    }

    // Check if SKU already exists for this tenant
    const existingSKU = await prisma.products.findFirst({
      where: {
        tenant_id: tenant.id,
        sku: finalSKU,
      },
    });

    // If SKU collision, regenerate until we find a unique one
    if (existingSKU) {
      let attempts = 0;
      const maxAttempts = 10;
      while (attempts < maxAttempts) {
        finalSKU = generateSKU(validatedData.name, tenant.id);
        const collision = await prisma.products.findFirst({
          where: {
            tenant_id: tenant.id,
            sku: finalSKU,
          },
        });
        if (!collision) {
          break; // Found unique SKU
        }
        attempts++;
      }
      if (attempts >= maxAttempts) {
        // Fallback: use timestamp-based SKU
        finalSKU = `${tenant.id.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      }
    }

    // Include warning if description is missing (for SEO and user experience)
    const warnings: string[] = [];
    if (!validatedData.description || validatedData.description.trim() === '') {
      warnings.push('Product description is missing. Adding a detailed description will improve SEO and help customers understand your product better.');
    }

    // Validate category_id if provided (must be valid UUID or null)
    if (validatedData.category_id) {
      // Check if category exists and belongs to tenant
      const category = await prisma.categories.findFirst({
        where: {
          id: validatedData.category_id,
          tenant_id: tenant.id,
        },
      });
      
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found or does not belong to this tenant' },
          { status: 400 }
        );
      }
    }
    
    // Validate brand_id if provided (must be valid UUID or null)
    if (validatedData.brand_id) {
      // Check if brand exists and belongs to tenant (if brands table exists)
      // For now, we'll just validate it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(validatedData.brand_id)) {
        return NextResponse.json(
          { error: 'Invalid brand ID format' },
          { status: 400 }
        );
      }
    }
    
    // Ensure price is a valid number
    if (isNaN(validatedData.price) || validatedData.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a positive number' },
        { status: 400 }
      );
    }
    
    console.log('[Product Create] Creating product with data:', {
      tenant_id: tenant.id,
      name: validatedData.name,
      slug,
      price: validatedData.price,
      category_id: validatedData.category_id || null,
      created_by: user.id,
    });

    // Ensure image URL doesn't exceed VARCHAR(255) limit
    let imageUrl = validatedData.image || null;
    if (imageUrl && imageUrl.length > 255) {
      console.warn('[Product Create] Image URL exceeds 255 characters, truncating');
      imageUrl = imageUrl.substring(0, 255);
    }
    
    // Prepare product data
    // Note: Prisma Decimal fields accept numbers, strings, or Prisma.Decimal
    // We'll pass numbers directly as Prisma handles the conversion
    const productData = {
      tenant_id: tenant.id,
      name: validatedData.name,
      slug,
      description: validatedData.description || null,
      short_description: validatedData.short_description || null,
      price: validatedData.price, // Prisma will convert number to Decimal
      sale_price: validatedData.sale_price || null,
      sku: finalSKU, // Always use generated SKU
      stock_quantity: validatedData.stock_quantity || 0,
      status: validatedData.status || 'active',
      image: imageUrl,
      gallery: Array.isArray(validatedData.gallery) ? validatedData.gallery : [],
      category_id: validatedData.category_id || null,
      brand_id: validatedData.brand_id || null,
      created_by: user.id,
      metadata: (validatedData.metadata || {}) as any,
    };
    
    console.log('[Product Create] Product data to insert:', JSON.stringify(productData, null, 2));
    console.log('[Product Create] Price type:', typeof productData.price, 'Value:', productData.price);
    console.log('[Product Create] Sale price type:', typeof productData.sale_price, 'Value:', productData.sale_price);
    
    // Create product
    // Note: If description is null/empty, we'll include a warning in the response
    let product;
    try {
      console.log('[Product Create] Attempting Prisma create...');
      product = await prisma.products.create({
        data: productData,
      });
      console.log('[Product Create] Product created successfully:', product.id);
    } catch (createError: any) {
      console.error('[Product Create] Prisma create error:', createError);
      console.error('[Product Create] Error code:', createError?.code);
      console.error('[Product Create] Error meta:', JSON.stringify(createError?.meta, null, 2));
      console.error('[Product Create] Error message:', createError?.message);
      console.error('[Product Create] Error stack:', createError?.stack);
      
      // Log the exact data that failed
      console.error('[Product Create] Failed data:', {
        tenant_id: productData.tenant_id,
        name: productData.name,
        slug: productData.slug,
        price: productData.price,
        priceType: typeof productData.price,
        sale_price: productData.sale_price,
        salePriceType: typeof productData.sale_price,
        sku: productData.sku,
        image: productData.image,
        imageLength: productData.image?.length,
        gallery: productData.gallery,
        category_id: productData.category_id,
        brand_id: productData.brand_id,
      });
      
      throw createError; // Re-throw to be caught by outer catch
    }

    return NextResponse.json(
      { 
        product,
        ...(warnings.length > 0 && { warnings }) // Include warnings if any
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // Check for Prisma errors
      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as any;
        console.error('Prisma error details:', {
          code: prismaError.code,
          meta: prismaError.meta,
          clientVersion: prismaError.clientVersion,
        });
        
        // Handle specific Prisma errors
        if (prismaError.code === 'P2002') {
          // Unique constraint violation
          return NextResponse.json(
            { 
              error: 'A product with this slug or SKU already exists',
              details: prismaError.meta?.target 
            },
            { status: 400 }
          );
        }
        
        if (prismaError.code === 'P2003') {
          // Foreign key constraint violation
          return NextResponse.json(
            { 
              error: 'Invalid category or brand reference',
              details: prismaError.meta 
            },
            { status: 400 }
          );
        }
      }
      
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

    // Return detailed error - always include details for debugging
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal server error';
    
    // Always return detailed error information to help with debugging
    const errorResponse: any = {
      error: errorMessage,
    };
    
    // Include Prisma error details if available
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      errorResponse.prismaError = {
        code: prismaError.code,
        meta: prismaError.meta,
      };
    }
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && error instanceof Error) {
      errorResponse.stack = error.stack;
    }
    
    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}
