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
import { z } from 'zod';

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
      console.log('[Product Create] Raw request body:', JSON.stringify(body, null, 2));
      console.log('[Product Create] Request body keys:', Object.keys(body));
      
      // Check for 'new' field immediately
      if ('new' in body) {
        console.error('[Product Create] CRITICAL: Found "new" field in raw request body!', body.new);
        delete body.new;
        console.log('[Product Create] Removed "new" field from body');
      }
    } catch (parseError: any) {
      console.error('[Product Create] JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request body and strip unknown fields
    let validatedData: z.infer<typeof createProductSchema>;
    try {
      // Use safeParse to handle validation errors gracefully
      const validationResult = createProductSchema.safeParse(body);
      
      if (!validationResult.success) {
        console.error('[Product Create] Validation error:', validationResult.error.issues);
        return NextResponse.json(
          { error: 'Validation error', issues: validationResult.error.issues },
          { status: 400 }
        );
      }
      
      validatedData = validationResult.data;
      console.log('[Product Create] Validated data:', JSON.stringify(validatedData, null, 2));
      console.log('[Product Create] Original body keys:', Object.keys(body));
      console.log('[Product Create] Validated keys:', Object.keys(validatedData));
      
      // Explicitly check for any unexpected fields that might have slipped through
      const allowedFields = [
        'name', 'slug', 'description', 'short_description', 'price', 'sale_price',
        'sku', 'stock_quantity', 'status', 'image', 'gallery', 'category_id',
        'brand_id', 'metadata'
      ];
      const unexpectedFields = Object.keys(validatedData).filter(key => !allowedFields.includes(key));
      if (unexpectedFields.length > 0) {
        console.warn('[Product Create] Unexpected fields in validated data (will be ignored):', unexpectedFields);
        // Remove unexpected fields explicitly - create a new clean object
        const cleanedData: Partial<z.infer<typeof createProductSchema>> = {};
        allowedFields.forEach(field => {
          if (field in validatedData) {
            (cleanedData as any)[field] = (validatedData as any)[field];
          }
        });
        validatedData = cleanedData as z.infer<typeof createProductSchema>;
        console.log('[Product Create] Cleaned validated data:', JSON.stringify(validatedData, null, 2));
      }
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
    
    // Prepare product data - explicitly define only allowed fields
    // Note: Prisma Decimal fields accept numbers, strings, or Prisma.Decimal
    // We'll pass numbers directly as Prisma handles the conversion
    // IMPORTANT: Only include fields that exist in the Prisma schema to avoid "column does not exist" errors
    // Explicitly construct the object to ensure no unexpected fields are included
    const productData = {
      tenant_id: tenant.id,
      name: String(validatedData.name),
      slug: String(slug),
      description: validatedData.description ? String(validatedData.description) : null,
      short_description: validatedData.short_description ? String(validatedData.short_description) : null,
      price: Number(validatedData.price), // Prisma will convert number to Decimal
      sale_price: validatedData.sale_price ? Number(validatedData.sale_price) : null,
      sku: String(finalSKU), // Always use generated SKU
      stock_quantity: Number(validatedData.stock_quantity || 0),
      status: String(validatedData.status || 'active'),
      image: imageUrl ? String(imageUrl) : null,
      gallery: Array.isArray(validatedData.gallery) ? validatedData.gallery : [],
      category_id: validatedData.category_id ? String(validatedData.category_id) : null,
      brand_id: validatedData.brand_id ? String(validatedData.brand_id) : null,
      created_by: String(user.id),
      metadata: validatedData.metadata && typeof validatedData.metadata === 'object' ? validatedData.metadata : {},
    };
    
    // Final safety check: ensure no unexpected keys exist
    const allowedProductFields = [
      'tenant_id', 'name', 'slug', 'description', 'short_description', 'price', 'sale_price',
      'sku', 'stock_quantity', 'status', 'image', 'gallery', 'category_id', 'brand_id',
      'created_by', 'metadata'
    ];
    const productDataKeys = Object.keys(productData);
    const unexpectedProductFields = productDataKeys.filter(key => !allowedProductFields.includes(key));
    if (unexpectedProductFields.length > 0) {
      console.error('[Product Create] CRITICAL: Unexpected fields in productData:', unexpectedProductFields);
      // Remove unexpected fields
      const cleanedProductData: any = {};
      allowedProductFields.forEach(field => {
        if (field in productData) {
          cleanedProductData[field] = (productData as any)[field];
        }
      });
      Object.assign(productData, cleanedProductData);
      // Delete unexpected fields
      unexpectedProductFields.forEach(field => {
        delete (productData as any)[field];
      });
    }
    
    console.log('[Product Create] Product data to insert:', JSON.stringify(productData, null, 2));
    console.log('[Product Create] Price type:', typeof productData.price, 'Value:', productData.price);
    console.log('[Product Create] Sale price type:', typeof productData.sale_price, 'Value:', productData.sale_price);
    
    // Create product
    // Note: If description is null/empty, we'll include a warning in the response
    let product;
    try {
      // Final safety check: create a completely clean object with only allowed fields
      const finalProductData: {
        tenant_id: string;
        name: string;
        slug: string;
        description: string | null;
        short_description: string | null;
        price: number;
        sale_price: number | null;
        sku: string;
        stock_quantity: number;
        status: string;
        image: string | null;
        gallery: string[];
        category_id: string | null;
        brand_id: string | null;
        created_by: string;
        metadata: any;
      } = {
        tenant_id: productData.tenant_id,
        name: productData.name,
        slug: productData.slug,
        description: productData.description,
        short_description: productData.short_description,
        price: productData.price,
        sale_price: productData.sale_price,
        sku: productData.sku,
        stock_quantity: productData.stock_quantity,
        status: productData.status,
        image: productData.image,
        gallery: productData.gallery,
        category_id: productData.category_id,
        brand_id: productData.brand_id,
        created_by: productData.created_by,
        metadata: productData.metadata,
      };
      
      // Verify finalProductData has no unexpected fields
      const finalKeys = Object.keys(finalProductData);
      const allowedFinalFields = [
        'tenant_id', 'name', 'slug', 'description', 'short_description', 'price', 'sale_price',
        'sku', 'stock_quantity', 'status', 'image', 'gallery', 'category_id', 'brand_id',
        'created_by', 'metadata'
      ];
      const unexpectedFinalFields = finalKeys.filter(key => !allowedFinalFields.includes(key));
      if (unexpectedFinalFields.length > 0) {
        console.error('[Product Create] CRITICAL ERROR: Unexpected fields in finalProductData:', unexpectedFinalFields);
        throw new Error(`Unexpected fields detected: ${unexpectedFinalFields.join(', ')}. This should never happen.`);
      }
      
      console.log('[Product Create] Attempting Prisma create with final data...');
      console.log('[Product Create] Final data keys:', Object.keys(finalProductData));
      console.log('[Product Create] Final data:', JSON.stringify(finalProductData, null, 2));
      
      // CRITICAL: Use Object.fromEntries to create a completely clean object with ONLY allowed fields
      // This is the most aggressive way to ensure no unexpected fields exist
      const allowedFieldsMap = new Map<string, any>();
      allowedFinalFields.forEach(field => {
        if (field in finalProductData) {
          allowedFieldsMap.set(field, (finalProductData as any)[field]);
        }
      });
      
      const ultraCleanData = Object.fromEntries(allowedFieldsMap);
      
      // Final verification
      const ultraCleanKeys = Object.keys(ultraCleanData);
      if (ultraCleanKeys.length !== allowedFinalFields.length) {
        console.warn('[Product Create] Field count mismatch:', {
          expected: allowedFinalFields.length,
          actual: ultraCleanKeys.length,
          keys: ultraCleanKeys,
        });
      }
      
      const unexpectedUltraCleanFields = ultraCleanKeys.filter(key => !allowedFinalFields.includes(key));
      if (unexpectedUltraCleanFields.length > 0) {
        console.error('[Product Create] CRITICAL: Unexpected fields in ultraCleanData:', unexpectedUltraCleanFields);
        throw new Error(`Unexpected fields in ultraCleanData: ${unexpectedUltraCleanFields.join(', ')}`);
      }
      
      console.log('[Product Create] Using ultra-clean data (Object.fromEntries):', JSON.stringify(ultraCleanData, null, 2));
      console.log('[Product Create] Ultra-clean data keys:', Object.keys(ultraCleanData));
      console.log('[Product Create] Ultra-clean data type:', typeof ultraCleanData);
      console.log('[Product Create] Ultra-clean data constructor:', ultraCleanData.constructor.name);
      
      // CRITICAL: Use Prisma's create with explicit field selection
      // This ensures Prisma only uses the exact fields we specify
      // We explicitly list each field to prevent any unexpected fields from being passed
      // This is the most defensive approach to prevent the 'new' column error
      const prismaCreateData = {
        tenant_id: String(ultraCleanData.tenant_id),
        name: String(ultraCleanData.name),
        slug: String(ultraCleanData.slug),
        description: ultraCleanData.description ? String(ultraCleanData.description) : null,
        short_description: ultraCleanData.short_description ? String(ultraCleanData.short_description) : null,
        price: Number(ultraCleanData.price),
        sale_price: ultraCleanData.sale_price ? Number(ultraCleanData.sale_price) : null,
        sku: String(ultraCleanData.sku),
        stock_quantity: Number(ultraCleanData.stock_quantity),
        status: String(ultraCleanData.status),
        image: ultraCleanData.image ? String(ultraCleanData.image) : null,
        gallery: Array.isArray(ultraCleanData.gallery) ? ultraCleanData.gallery : [],
        category_id: ultraCleanData.category_id ? String(ultraCleanData.category_id) : null,
        brand_id: ultraCleanData.brand_id ? String(ultraCleanData.brand_id) : null,
        created_by: String(ultraCleanData.created_by),
        metadata: ultraCleanData.metadata && typeof ultraCleanData.metadata === 'object' ? ultraCleanData.metadata : {},
      };
      
      // Final verification - ensure no 'new' field exists
      if ('new' in prismaCreateData) {
        console.error('[Product Create] CRITICAL: "new" field found in prismaCreateData!');
        delete (prismaCreateData as any).new;
      }
      
      console.log('[Product Create] Prisma create data keys (final):', Object.keys(prismaCreateData));
      
      product = await prisma.products.create({
        data: prismaCreateData,
      });
      console.log('[Product Create] Product created successfully:', product.id);
      
      // Manually update search_vector since trigger is disabled
      // This ensures full-text search still works
      try {
        await prisma.$executeRaw`
          UPDATE products
          SET search_vector = 
            setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(sku, '')), 'A')
          WHERE id = ${product.id}::uuid
        `;
        console.log('[Product Create] Search vector updated successfully');
      } catch (searchVectorError) {
        // Non-critical: log but don't fail the request
        console.warn('[Product Create] Failed to update search_vector (non-critical):', searchVectorError);
      }
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
