import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  dryRun: z.boolean().default(false),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const { id: tenantId } = await params;
    const body = await request.json().catch(() => ({}));
    const input = requestSchema.parse(body);

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        data: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    const tenantData = isRecord(tenant.data) ? tenant.data : {};
    const existingStarterPack = isRecord(tenantData.onboarding_starter_pack)
      ? tenantData.onboarding_starter_pack
      : {};

    const products = await prisma.products.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        image: true,
        metadata: true,
        category_id: true,
      },
      orderBy: { created_at: 'desc' },
      take: 40,
    });

    const sales = await prisma.sales.findMany({
      where: {
        tenant_id: tenantId,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        banner_image: true,
        metadata: true,
      },
      orderBy: { created_at: 'desc' },
      take: 4,
    });

    const productsNeedingImages = products.filter((product) => {
      const hasImage = Boolean(product.image && product.image.trim().length > 0);
      const metadata = isRecord(product.metadata) ? product.metadata : {};
      const prompt = toStringValue(metadata.generated_image_prompt);
      return !hasImage && prompt.length > 0;
    });

    const salesNeedingImages = sales.filter((sale) => {
      const hasImage = Boolean(sale.banner_image && sale.banner_image.trim().length > 0);
      const metadata = isRecord(sale.metadata) ? sale.metadata : {};
      const prompt = toStringValue(metadata.image_prompt);
      return !hasImage && prompt.length > 0;
    });

    if (productsNeedingImages.length === 0 && salesNeedingImages.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          tenantId,
          dryRun: input.dryRun,
          repaired: false,
          reason: 'No missing product/sale images with prompts',
          productsMissingWithPrompt: 0,
          salesMissingWithPrompt: 0,
        },
      });
    }

    const categoriesRaw = Array.isArray(existingStarterPack.categories)
      ? existingStarterPack.categories.filter((item): item is string => typeof item === 'string')
      : [];

    const salesPromotionsFromTenant: unknown[] = Array.isArray(existingStarterPack.salesPromotions)
      ? existingStarterPack.salesPromotions
      : [];
    const salesPromotionByName = new Map<string, Record<string, unknown>>();
    for (const item of salesPromotionsFromTenant) {
      if (!isRecord(item)) continue;
      const titleKey = toStringValue(item.title).toLowerCase();
      if (!titleKey) continue;
      salesPromotionByName.set(titleKey, item);
    }

    const geminiResult = {
      copy: isRecord(existingStarterPack.copy) ? existingStarterPack.copy : undefined,
      themeConfig: isRecord(existingStarterPack.themeConfig) ? existingStarterPack.themeConfig : undefined,
      categories: categoriesRaw,
      demoProducts: products.map((product) => {
        const metadata = isRecord(product.metadata) ? product.metadata : {};
        const prompt = toStringValue(metadata.generated_image_prompt);
        return {
          name: product.name,
          priceKES: 1000,
          description: `${product.name} starter-pack product`,
          imagePrompt: prompt || undefined,
          nanoBananaPrompt: prompt || undefined,
          imageUrl: product.image || undefined,
        };
      }),
      salesPromotions: sales.map((sale) => {
        const metadata = isRecord(sale.metadata) ? sale.metadata : {};
        const prompt = toStringValue(metadata.image_prompt);
        const existingPromotion = salesPromotionByName.get(sale.name.toLowerCase());
        const subtitle = existingPromotion ? toStringValue(existingPromotion.subtitle) : '';
        const ctaText = existingPromotion ? toStringValue(existingPromotion.ctaText) : '';
        return {
          title: sale.name,
          subtitle: subtitle || `${sale.name} promotion`,
          ctaText: ctaText || 'Shop Now',
          imagePrompt: prompt || undefined,
          nanoBananaPrompt: prompt || undefined,
          imageUrl: sale.banner_image || undefined,
        };
      }),
      blogPosts: [],
    };

    if (input.dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          tenantId,
          dryRun: true,
          repaired: false,
          productsMissingWithPrompt: productsNeedingImages.length,
          salesMissingWithPrompt: salesNeedingImages.length,
          generationCandidates: {
            products: productsNeedingImages.map((item) => item.name),
            sales: salesNeedingImages.map((item) => item.name),
          },
        },
      });
    }

    const generationResponse = await fetch(`${request.nextUrl.origin}/api/onboarding/starter-pack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        businessType: toStringValue(tenantData.business_type) || 'General',
        selling: toStringValue(tenantData.selling) || 'General',
        locale: 'en-KE',
        currency: 'KES',
        productsCount: Math.max(products.length, 1),
        categoriesCount: Math.max(categoriesRaw.length, 1),
        blogPostsCount: 1,
        includeGeminiCall: false,
        includeNanoBananaCall: true,
        checkSellingExists: false,
        forceExternalGeneration: false,
        geminiResult,
      }),
    });

    const generationPayload = await generationResponse.json();
    if (!generationResponse.ok || !generationPayload?.success) {
      throw new Error(generationPayload?.error?.message || 'Failed to generate missing starter-pack images');
    }

    const generatedPack = generationPayload?.data?.gemini?.generatedStarterPack;
    if (!isRecord(generatedPack)) {
      throw new Error('Image generation returned invalid starter pack payload');
    }

    const generatedProducts: unknown[] = Array.isArray(generatedPack.demoProducts)
      ? generatedPack.demoProducts
      : [];
    const generatedPromotions: unknown[] = Array.isArray(generatedPack.salesPromotions)
      ? generatedPack.salesPromotions
      : [];

    const productImageByName = new Map<string, string>();
    for (const item of generatedProducts) {
      if (!isRecord(item)) continue;
      const key = toStringValue(item.name).toLowerCase();
      const imageUrl = toStringValue(item.imageUrl);
      if (!key || !imageUrl) continue;
      productImageByName.set(key, imageUrl);
    }

    const saleImageByName = new Map<string, string>();
    for (const item of generatedPromotions) {
      if (!isRecord(item)) continue;
      const key = toStringValue(item.title).toLowerCase();
      const imageUrl = toStringValue(item.imageUrl);
      if (!key || !imageUrl) continue;
      saleImageByName.set(key, imageUrl);
    }

    let productsUpdated = 0;
    let salesUpdated = 0;
    let categoriesUpdated = 0;
    let blogsUpdated = 0;
    const categoryImageCandidates = new Map<string, string>();
    const blogImagePool: string[] = [];

    for (const product of productsNeedingImages) {
      const generatedImage = productImageByName.get(product.name.toLowerCase());
      if (!generatedImage) continue;
      await prisma.products.update({
        where: { id: product.id },
        data: { image: generatedImage },
      });
      productsUpdated += 1;
      blogImagePool.push(generatedImage);
      if (product.category_id && !categoryImageCandidates.has(product.category_id)) {
        categoryImageCandidates.set(product.category_id, generatedImage);
      }
    }

    for (const [categoryId, imageUrl] of categoryImageCandidates.entries()) {
      await prisma.categories.update({
        where: { id: categoryId },
        data: { image: imageUrl },
      });
      categoriesUpdated += 1;
    }

    for (const sale of salesNeedingImages) {
      const generatedImage = saleImageByName.get(sale.name.toLowerCase());
      if (!generatedImage) continue;
      await prisma.sales.update({
        where: { id: sale.id },
        data: { banner_image: generatedImage },
      });
      salesUpdated += 1;
      blogImagePool.push(generatedImage);
    }

    if (blogImagePool.length > 0) {
      const blogsMissingImages = await prisma.blogs.findMany({
        where: {
          tenant_id: tenantId,
          OR: [{ image: null }, { image: '' }],
        },
        select: { id: true },
        take: 6,
        orderBy: { created_at: 'desc' },
      });

      for (let index = 0; index < blogsMissingImages.length; index += 1) {
        const blog = blogsMissingImages[index];
        const imageUrl = blogImagePool[index % blogImagePool.length];
        await prisma.blogs.update({
          where: { id: blog.id },
          data: { image: imageUrl },
        });
        blogsUpdated += 1;
      }
    }

    const updatedTenantData = {
      ...tenantData,
      onboarding_starter_pack: {
        ...(isRecord(existingStarterPack) ? existingStarterPack : {}),
        salesPromotions: generatedPromotions as Prisma.JsonValue,
        productImages: generatedProducts
          .map((item) =>
            isRecord(item)
              ? {
                  name: toStringValue(item.name),
                  imageUrl: toStringValue(item.imageUrl),
                }
              : null
          )
          .filter((item) => Boolean(item)),
        images_repaired_at: new Date().toISOString(),
      },
    };

    await prisma.tenants.update({
      where: { id: tenantId },
      data: {
        data: updatedTenantData as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        repaired: true,
        productsMissingWithPrompt: productsNeedingImages.length,
        salesMissingWithPrompt: salesNeedingImages.length,
        productsUpdated,
        salesUpdated,
        categoriesUpdated,
        blogsUpdated,
        starterPackSource: generationPayload?.data?.starterPackSource ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid repair request payload',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to repair starter-pack images',
        },
      },
      { status: 500 }
    );
  }
}

