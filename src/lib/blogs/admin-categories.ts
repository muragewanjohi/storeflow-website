import { prisma } from '@/lib/prisma/client';
import {
  createBlogCategorySchema,
  generateSlug,
  updateBlogCategorySchema,
} from '@/lib/content/validation';
import type { z } from 'zod';

export class BlogCategoryAdminError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'BlogCategoryAdminError';
  }
}

export async function listBlogCategoriesForTenant(tenantId: string) {
  const categories = await prisma.blog_categories.findMany({
    where: { tenant_id: tenantId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      created_at: true,
      updated_at: true,
      _count: { select: { blogs: true } },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    blogCount: category._count.blogs,
    createdAt: category.created_at?.toISOString() ?? null,
    updatedAt: category.updated_at?.toISOString() ?? null,
  }));
}

type CreateBlogCategoryInput = z.infer<typeof createBlogCategorySchema>;

export async function createBlogCategoryForTenant(
  tenantId: string,
  input: CreateBlogCategoryInput,
) {
  const validatedData = createBlogCategorySchema.parse(input);
  const slug = validatedData.slug || generateSlug(validatedData.name);

  const existingCategory = await prisma.blog_categories.findFirst({
    where: { tenant_id: tenantId, slug },
  });

  if (existingCategory) {
    throw new BlogCategoryAdminError('A category with this slug already exists');
  }

  const category = await prisma.blog_categories.create({
    data: {
      tenant_id: tenantId,
      name: validatedData.name,
      slug,
    },
  });

  return category;
}

export async function getBlogCategoryForTenant(tenantId: string, categoryId: string) {
  const category = await prisma.blog_categories.findFirst({
    where: { id: categoryId, tenant_id: tenantId },
    include: {
      _count: { select: { blogs: true } },
    },
  });

  if (!category) {
    throw new BlogCategoryAdminError('Category not found', 404);
  }

  return {
    ...category,
    blogCount: category._count.blogs,
  };
}

type UpdateBlogCategoryInput = z.infer<typeof updateBlogCategorySchema>;

export async function updateBlogCategoryForTenant(
  tenantId: string,
  categoryId: string,
  input: UpdateBlogCategoryInput,
) {
  const validatedData = updateBlogCategorySchema.parse(input);

  const existingCategory = await prisma.blog_categories.findFirst({
    where: { id: categoryId, tenant_id: tenantId },
  });

  if (!existingCategory) {
    throw new BlogCategoryAdminError('Category not found', 404);
  }

  let slug = validatedData.slug;
  if (validatedData.name && !slug) {
    slug = generateSlug(validatedData.name);
  } else if (!slug) {
    slug = existingCategory.slug ?? undefined;
  }

  if (slug && slug !== existingCategory.slug) {
    const slugExists = await prisma.blog_categories.findFirst({
      where: { tenant_id: tenantId, slug, id: { not: categoryId } },
    });
    if (slugExists) {
      throw new BlogCategoryAdminError('A category with this slug already exists');
    }
  }

  return prisma.blog_categories.update({
    where: { id: categoryId },
    data: {
      name: validatedData.name,
      slug: slug || undefined,
      updated_at: new Date(),
    },
  });
}

export async function deleteBlogCategoryForTenant(tenantId: string, categoryId: string) {
  const category = await prisma.blog_categories.findFirst({
    where: { id: categoryId, tenant_id: tenantId },
    include: { _count: { select: { blogs: true } } },
  });

  if (!category) {
    throw new BlogCategoryAdminError('Category not found', 404);
  }

  if (category._count.blogs > 0) {
    throw new BlogCategoryAdminError(
      'Cannot delete category with existing blog posts. Please reassign or delete the blog posts first.',
    );
  }

  await prisma.blog_categories.delete({ where: { id: categoryId } });
}
